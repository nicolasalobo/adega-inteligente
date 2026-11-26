# PRD — Adega Inteligente (MVP)

**Versão:** 2.0 (recorte do MVP)
**Data:** 26/11/2026
**Status:** Fases 1–3 integradas em `main`; MVP em execução conforme [`docs/MVP.md`](docs/MVP.md). Produção na Vercel desativada; só previews.
**Fonte das decisões:** [entrevista de descoberta](docs/ENTREVISTA_DESCOBERTA.md) de 24/11/2026. Em caso de conflito, [`docs/MVP.md`](docs/MVP.md) prevalece sobre este documento.

> A versão 1.4 deste PRD (financeiro, PTAX, foto com IA, QR Code, convites) continua no histórico do git. O que saiu do escopo está em **Backlog pós-MVP** no [`ROADMAP.md`](ROADMAP.md).

## 1. Problema
Donos de adega doméstica não sabem com precisão **quais vinhos têm** nem **onde cada garrafa está**. Saber quanto a coleção vale é um extra, não a dor principal.

**Cliente-piloto:** a avó do dono do produto. A adega dela não tem controle nenhum hoje e é organizada **por colunas, uma coluna por país**. Ela define os requisitos do MVP.

## 2. Objetivo do MVP
Cadastrar com precisão a adega real da cliente-piloto e permitir encontrar qualquer garrafa, no app e na adega, em menos de 30 segundos.

**Princípio:** consolidar, simplificar e completar o núcleo que já existe. Não adicionar escopo.

## 3. Requisitos do cliente
| # | Requisito | Prioridade |
|---|---|---|
| R1 | Saber **quais vinhos** tenho | P0 |
| R2 | Saber **onde** cada garrafa está (prateleira, linha, coluna) | P0 |
| R3 | **Cadastro fácil e preciso**: precisão tem prioridade sobre rapidez | P0 |
| R4 | **Organizar prateleira por regra** (ex.: cada coluna = um país) | P0 |
| R5 | **Janela de consumo** com lembrete | P1 |

## 4. Premissas
- **Uma adega por conta.** O modelo de dados permite expandir depois, mas não há telas de múltiplas adegas.
- Uma adega tem uma ou mais prateleiras; cada prateleira tem linhas × colunas configuráveis. O tamanho real da adega da cliente-piloto ainda será levantado.
- **Uma garrafa física = uma posição exclusiva.** Retirar uma garrafa libera a posição na hora.
- Cada prateleira é **livre** (aceita qualquer vinho) ou **por regra** (um critério, distribuído por linhas ou colunas, com um valor por linha/coluna).
- **Dado incerto fica desconhecido.** Safra, uva ou país nunca são preenchidos automaticamente sem confirmação da pessoa.
- **Orçamento R$ 0.** Nenhuma API paga é habilitada; a WineAPI fica no plano free (100 buscas/dia). Falha de qualquer integração leva ao cadastro manual.
- **Plataforma em aberto** (provável Expo/React Native). O MVP segue no Next.js atual, e as regras de negócio ficam no banco (SQL/RPC) ou em `web/src/lib/`, nunca dentro de componentes React.

## 5. Jornadas do MVP
### J1 — Montar a adega
Criar conta → nomear a adega → informar número de prateleiras → linhas × colunas de cada uma → escolher modo livre ou por regra → na regra por coluna, atribuir um valor a cada coluna (podendo aplicar o mesmo valor a um intervalo de colunas) → ver o mapa com o rótulo de cada coluna no topo.

### J2 — Cadastrar garrafa com precisão
Buscar (WineAPI ou EAN-13) → revisar a ficha → escolher posição(ões) → confirmar. Sem resultado ou com falha da busca, o fluxo segue manualmente sem bloquear. Se já existir um vinho igual (produtor + nome + safra normalizados), o app pergunta "É o mesmo vinho?" e, se sim, só adiciona garrafas à ficha existente.

### J3 — Encontrar vinho
Uma busca só (nome, produtor, país, região, uva, safra; sem diferenciar maiúsculas/acentos) → filtros rápidos por país e uva → cada resultado mostra cada localização em texto (`Prateleira 1 · Linha 4 · Coluna 7`) → tocar na localização abre o mapa com a posição destacada.

### J4 — Mover e trocar
Selecionar garrafa → escolher destino livre ou trocar com outra garrafa → a regra da prateleira é validada nos dois lados → o histórico registra origem e destino.

### J5 — Retirar e (opcionalmente) avaliar
Tocar na garrafa → "Retirar" → motivo opcional → confirmar → posição liberada. Depois, a avaliação (1–5 estrelas + comentário opcional) é oferecida como opcional. A nota só é obrigatória quando a pessoa decide registrar uma avaliação.

### J6 — Acompanhar a janela de consumo
Na ficha do vinho, informar "beber a partir de" e "beber até" (anos, opcionais) → ver o status (`cedo`, `pronto`, `ultimo_ano`, `passou`, `sem_janela`) → consultar a lista **Prontos para beber**, com os mais urgentes primeiro → ao abrir o app, ver um aviso quando houver vinhos no último ano ou que já passaram da janela.

## 6. Requisitos funcionais
| ID | Requisito | Req. | Situação | Aceite |
|---|---|---|---|---|
| F01 | Conta, login e adega única | — | Pronto | Conta autentica; uma conta não lê nem altera a adega de outra (RLS) |
| F02 | Prateleiras em grid com linhas × colunas editáveis | R2 | Pronto | 20 linhas × 10 colunas renderiza legível no celular, com zoom/rolagem |
| F03 | Posição única por garrafa | R2 | Pronto | Nenhuma posição duplicada, mesmo com requisições simultâneas |
| F04 | Modo livre e modo por regra | R4 | Pronto | Modo livre aceita qualquer vinho em posição livre |
| F05 | Regra por coluna com um valor por coluna e onboarding guiado | R4 | Ajustar | Recria uma adega com N colunas, cada uma de um país, em menos de 5 minutos; a RPC recusa vinho da França na coluna do Brasil |
| F06 | Bloquear edição de prateleira que deixaria garrafas fora do grid ou incompatíveis | R4 | Ajustar | Mensagem lista as garrafas que impedem a mudança |
| F07 | Cadastro preciso: obrigatórios, safra, revisão, duplicata, normalização | R3 | Ajustar | Não salva garrafa incompatível com a regra; não duplica ficha; safra é ano válido (1900 até o ano atual) ou "sem safra / não sei" |
| F08 | Editar ficha depois de cadastrar | R3 | Criar | Corrigir a ficha preserva garrafas e histórico |
| F09 | Busca textual na WineAPI com revisão | R3 | Pronto | Falha ou ausência de resultado leva ao cadastro manual |
| F10 | Scanner EAN-13 como atalho opcional | R3 | Pronto | Nenhum trabalho novo; nunca confirma safra sozinho |
| F11 | Encontrar vinho com localização | R1, R2 | Completar | Com 50+ garrafas, qualquer uma é localizada no mapa em até 3 toques a partir da tela inicial |
| F12 | Mover e trocar garrafas | R2 | Pronto | Troca validada dos dois lados e registrada atomicamente |
| F13 | Retirada sem avaliação obrigatória | R1 | Ajustar | É possível retirar sem avaliar; o histórico registra a retirada |
| F14 | Avaliação opcional de 1–5 estrelas | — | Pronto | Nota obrigatória só dentro da avaliação; média por vinho/safra correta |
| F15 | Histórico de movimentações e retiradas | R1 | Pronto | Cada movimento registra data, responsável, origem e destino |
| F16 | Janela de consumo e lista "Prontos para beber" | R5 | Criar | Testes cobrem os 5 status e as bordas de ano; banner só aparece com vinhos `ultimo_ano` ou `passou` |
| F17 | Tela inicial de resumo | R1 | Criar | Totais de garrafas e rótulos, ocupação e contagem por país batem com o banco após cadastrar, mover e retirar |
| F18 | Identificação por foto escondida atrás de feature flag | — | Esconder | Flag `photo_identification` desligada por padrão; UI escondida e rota desabilitada |

Detalhes de cada item: seção 3.3 de [`docs/MVP.md`](docs/MVP.md).

## 7. Regras de negócio
### Posições e regra da prateleira
- `posição = adega + prateleira + linha + coluna`, única. Linha e coluna não podem passar das dimensões da prateleira.
- Ocupar, mover e trocar são operações atômicas no banco (transação + constraint de unicidade para garrafa ativa).
- Em prateleira por regra, o valor do vinho no critério (país, região, uva, safra ou campo personalizado) precisa bater com o valor da linha/coluna. A checagem acontece no servidor (RPC), não só na interface.
- Vinho de corte pode ocupar posição de qualquer uva confirmada.
- Mover ou trocar não apaga histórico.

### Ficha do vinho
- **Obrigatórios:** nome e produtor. O campo usado pela regra (ex.: país) é obrigatório quando a prateleira escolhida tem regra.
- **Safra:** ano entre 1900 e o ano atual, ou marcação explícita "sem safra / não sei".
- **Normalização:** aparar espaços e padronizar a capitalização; país vem de uma lista em português com autocompletar, para evitar "frança" e "França" como valores diferentes.
- **Duplicata:** produtor + nome + safra normalizados identificam o mesmo vinho. Reaproveitar a ficha só depois de a pessoa confirmar.
- Vinhos com nomes parecidos não são fundidos automaticamente.

### Janela de consumo
- `drink_from_year` e `drink_until_year` são opcionais; quando ambos existem, a partir de ≤ até.
- Status calculado por função pura em `web/src/lib/`: `cedo` (ano < a partir de), `pronto` (dentro da janela), `ultimo_ano` (ano = até), `passou` (ano > até), `sem_janela` (campos vazios).

### Vinho × garrafa
- `Wine`: identidade (produtor, nome, safra, país, região, uvas, janela de consumo).
- `Bottle`: unidade física, posição, status e histórico próprio. Um vinho pode ter várias garrafas.

## 8. Telas
1. Login / criar conta.
2. Onboarding da adega e das prateleiras.
3. Resumo (tela inicial): totais, ocupação, contagem por país, aviso da janela de consumo e atalhos **Encontrar vinho**, **Cadastrar garrafa**, **Prontos para beber**.
4. Mapa da adega: grid por prateleira, rótulo de cada coluna, posição destacada, badges de janela de consumo.
5. Encontrar vinho: busca única, filtros por país e uva, localizações em texto.
6. Cadastro: busca (WineAPI/EAN) → revisão → posições → confirmação.
7. Ficha do vinho: dados, janela de consumo, garrafas e localizações, editar ficha.
8. Prontos para beber.
9. Histórico: movimentações, trocas, retiradas e avaliações.

**Padrão móvel:** iPhone e Android no navegador, alvos de toque ≥ 44px, fluxos curtos, sem digitação desnecessária.

## 9. Arquitetura
- **Web:** Next.js 16 + React 19 + TypeScript, PWA.
- **Banco e auth:** Neon Postgres + Neon Auth + Data API, com RLS por proprietário. Migrations SQL versionadas em `web/db/migrations/`, **só aditivas** (a próxima é `0010_...`).
- **Regras de negócio:** no banco (constraints, triggers, RPCs) ou em `web/src/lib/` como funções puras e testadas. Acesso a dados em `web/src/lib/neon/` atrás de uma interface única, que o modo demo (localStorage) também implementa.
- **Integrações:** rotas server-side para WineAPI e EAN; nenhuma chave no cliente.
- **Feature flags:** `web/src/lib/features.ts`, lidas de `NEXT_PUBLIC_FEATURE_*` e desligadas por padrão.

## 10. Qualidade
- CI verde: `lint`, `build`, `test:identification`, `test:migrations:local`.
- Testes unitários para toda regra nova ou extraída para `web/src/lib/`.
- `test:concurrency` e `test:auth-rls` continuam passando.
- Testes e migrations nunca apontam para o banco de produção; só para a branch Neon de desenvolvimento ou o Postgres local.

## 11. Definição de pronto
O MVP está pronto quando, **na adega real da cliente-piloto**:
1. Todas as garrafas estão cadastradas, cada uma na posição física correta.
2. Qualquer garrafa é encontrada no app e na adega em **menos de 30 segundos**.
3. Cadastrar uma garrafa nova leva **menos de 2 minutos**, com dados revisados.
4. Retirar uma garrafa atualiza o mapa na hora.
5. A organização por país/coluna é respeitada e protegida pelo app.
6. Vinhos no fim da janela de consumo aparecem em destaque.
7. A cliente usa por 2 semanas sem precisar de ajuda para resolver bug.

## 12. Fora do MVP
Preço pago e valor de mercado · conversão cambial/PTAX · cotações periódicas · identificação por foto/IA (além de esconder o que existe) · QR Code e visitantes · convites e papéis MANAGER/VISITOR · rede social/amizades entre adegas · sugestão automática de posição · múltiplas adegas · transferências entre adegas · notificações push · planos pagos/assinatura · app nativo (decisão separada).

O detalhamento anterior desses itens está no **Backlog pós-MVP** do [`ROADMAP.md`](ROADMAP.md) e em [`PROPOSTA_TECNICA.md`](PROPOSTA_TECNICA.md).

## 13. Pontos em aberto
- Tamanho real da adega da cliente-piloto (prateleiras, linhas × colunas, número de garrafas).
- A cliente-piloto usa iPhone ou Android? Ela mesma vai operar o app?
- Plataforma final (Expo/React Native ou PWA): decisão separada, com spike e ADR.
- Validar a definição de pronto (seção 11) com a cliente-piloto.

## 14. Referências
- [`docs/MVP.md`](docs/MVP.md): escopo detalhado, feature flags, refatoração e ordem dos PRs.
- [`docs/ENTREVISTA_DESCOBERTA.md`](docs/ENTREVISTA_DESCOBERTA.md): respostas, análise e decisões.
- WineAPI: https://wineapi.io/docs/ · termos: https://wineapi.io/terms
