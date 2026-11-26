# MVP — Adega Inteligente

> **Para o agente de código (Claude Code / Codex):** este documento descreve como transformar o programa atual em um MVP enxuto. Leia tudo antes de começar e siga a ordem dos PRs da seção 7. Em caso de conflito com `PRD.md` ou `ROADMAP.md`, **este documento prevalece**. O PR 1 atualiza esses dois arquivos para refletir o MVP.

**Versão:** 1.0 · **Data:** 26/11/2026 · **Origem:** entrevista com o dono do produto (Nicolas Lobo) em 24/11/2026

---

## 1. Contexto

O app ajuda donos de adega doméstica a saber **o que têm** e **onde cada garrafa está**. A cliente-piloto é uma pessoa real, a avó do dono do produto. A adega dela não tem controle nenhum hoje e é organizada **por colunas, uma coluna por país**.

O código atual (Next.js 16 + React 19 + TypeScript, PWA, Neon Postgres + Neon Auth com RLS, migrations 0001–0009) já implementa boa parte do que o MVP precisa. Só que o escopo planejado (fases 4–7: financeiro, câmbio, foto com IA, QR Code, convites) cresceu demais e não foi pedido pelo cliente.

**O objetivo deste trabalho é consolidar, simplificar e completar o núcleo, não adicionar escopo.**

### Decisão de plataforma
A plataforma final ainda está em aberto (provável migração para Expo/React Native). Por isso:
- O MVP continua neste repo, no Next.js atual.
- **Regras de negócio devem ficar no banco (SQL/RPC) ou em `src/lib/`, nunca dentro de componentes React.** Assim tipos, validações e acesso a dados podem ser reaproveitados por um app nativo depois.

---

## 2. Regras para o agente

1. **PRs pequenos**, um por item da seção 7. Nada direto na `main`.
2. **Toda descrição de PR tem uma seção "Explicação para o Lobo"**: o que mudou, por quê, como testar, em português simples, sem jargão. O dono do produto está aprendendo e precisa entender cada PR para aprová-lo.
3. **Migrations só aditivas:** criar `0010_...`, `0011_...`. Nunca editar migrations já existentes.
4. **Nunca** apontar comandos, testes ou migrations para o banco de produção. Usar só a branch Neon de desenvolvimento descrita no `README.md` ou o Postgres local.
5. **Não habilitar nem contratar nenhuma API paga.** A WineAPI fica no plano free (100 buscas/dia).
6. **Não apagar código de funcionalidades fora do MVP sem necessidade.** Escondê-las atrás de feature flags desligadas por padrão (seção 4).
7. Manter verde o que o CI já roda (`lint`, `build`, `test:identification`, `test:migrations:local`) e adicionar testes para o que for novo.
8. Na dúvida sobre comportamento de produto, **não inventar**: deixar uma pergunta na descrição do PR.

---

## 3. Escopo do MVP

### 3.1 Requisitos do cliente (o que define sucesso)
| # | Requisito | Prioridade |
|---|---|---|
| R1 | Saber **quais vinhos** tenho | P0 |
| R2 | Saber **onde** cada garrafa está (prateleira, linha, coluna) | P0 |
| R3 | **Cadastro fácil e preciso**: precisão tem prioridade sobre rapidez | P0 |
| R4 | **Organizar prateleira por regra** (ex.: cada coluna = um país) | P0 |
| R5 | **Janela de consumo** com lembrete | P1 |

### 3.2 Matriz manter / ajustar / esconder / criar

| Funcionalidade | Situação atual | Ação no MVP |
|---|---|---|
| Conta e login (Neon Auth) | Pronto | **Manter** |
| Uma adega por conta | Pronto | **Manter** |
| Prateleiras em grid (linhas × colunas) | Pronto | **Manter**; melhorar onboarding (3.3.4) |
| Modo livre vs. estruturado por regra | Pronto | **Manter**; garantir regra por **coluna** com um valor por coluna (3.3.4) |
| Posição única por garrafa (transação/constraint) | Pronto | **Manter**, não mexer |
| Cadastro manual | Pronto | **Ajustar** para precisão (3.3.3) |
| Busca textual na WineAPI + revisão | Pronto | **Manter**; falha da API leva sempre ao manual |
| Scanner EAN-13 | Pronto | **Manter** como atalho opcional; nenhum trabalho novo |
| Identificação por foto (`/api/identification/photo`) | Parcial | **Esconder** (flag `photo_identification`) |
| Mover / trocar garrafas | Pronto | **Manter** |
| Retirar garrafa | Pronto | **Ajustar**: avaliação **opcional** na retirada |
| Avaliação 1–5 estrelas | Pronto | **Manter** como opcional |
| Histórico de movimentações | Pronto | **Manter** |
| Busca na coleção + localização | Parcial | **Completar** (3.3.2) |
| Janela de consumo | Não existe | **Criar** (3.3.5) |
| Resumo da adega | Parcial | **Criar/ajustar** (3.3.1) |
| Preço pago, valor de mercado, PTAX | Planejado | **Fora do MVP** |
| QR Code / visitante / convites / amizades | Planejado | **Fora do MVP** |
| Sugestão automática de posição | Planejado | **Fora do MVP** |

### 3.3 Detalhamento

#### 3.3.1 Tela inicial: resumo
- Total de garrafas, total de rótulos, ocupação (% de posições preenchidas).
- Contagem por país (é o critério da cliente-piloto).
- Atalhos: **Encontrar vinho**, **Cadastrar garrafa**, **Prontos para beber** (3.3.5).

**Aceite:** os números batem com o banco depois de cadastrar, mover e retirar garrafas.

#### 3.3.2 Encontrar vinho (R1 + R2)
- Uma busca única por nome, produtor, país, região, uva e safra; sem distinção de maiúsculas/acentos ("Franca" encontra "França").
- Filtros rápidos por país e por uva.
- Cada resultado mostra o rótulo, o número de garrafas e **cada localização em texto**, ex.: `Prateleira 1 · Linha 4 · Coluna 7`.
- Tocar em uma localização abre o mapa na prateleira certa com a posição **destacada**.

**Aceite:** com 50+ garrafas cadastradas, qualquer garrafa é localizada no mapa em até 3 toques a partir da tela inicial.

#### 3.3.3 Cadastro preciso (R3)
Fluxo: **buscar (WineAPI ou EAN) → revisar → escolher posição(ões) → confirmar**. Se a busca falhar ou não houver resultado, o fluxo continua manualmente sem bloquear.

- **Obrigatórios:** nome e produtor. País é obrigatório **quando a prateleira escolhida tem regra por país** (vale para qualquer critério de regra).
- **Safra:** um ano válido (1900 até o ano atual) **ou** marcação explícita "sem safra / não sei". Nunca preencher automaticamente sem confirmação. Manter o princípio atual: dado incerto fica desconhecido.
- **Tela de revisão antes de salvar:** mostrar todos os campos e a posição escolhida, destacando campos vazios.
- **Detecção de duplicata:** se já existir um vinho com mesmo produtor + nome + safra (normalizados), perguntar "É o mesmo vinho?" e, se sim, reaproveitar a ficha só adicionando garrafas. Já existe lógica parecida (`sameWine`); consolidá-la em `src/lib/`.
- **Normalização:** aparar espaços e padronizar a capitalização de país, com uma lista de países em português para autocompletar, evitando "frança" e "França" como valores distintos.
- **Editar ficha** depois de cadastrar (corrigir erro de digitação) sem perder garrafas nem histórico.

**Aceite:** não é possível salvar uma garrafa incompatível com a regra da prateleira; não há duplicatas de ficha ao cadastrar mais unidades do mesmo vinho; editar a ficha preserva as garrafas.

#### 3.3.4 Prateleiras e regra por coluna (R4)
- Onboarding guiado da adega: nome → número de prateleiras → linhas × colunas de cada uma → modo livre ou por regra.
- **Regra por coluna:** atribuir um valor a cada coluna (ex.: coluna 1 = Brasil, colunas 2–3 = Argentina). Permitir atribuir o mesmo valor a um intervalo de colunas de uma vez. Verificar se o modelo atual (`rule.values` + `axis`) já suporta isso; se não, ajustar com migration aditiva.
- O mapa mostra o rótulo de cada coluna (o país) no topo.
- Editar dimensões/regra de uma prateleira com garrafas: **bloquear** mudanças que deixariam garrafas fora do grid ou incompatíveis, com mensagem explicando quais garrafas impedem a mudança.

**Aceite:** dá para recriar uma adega com N colunas, cada uma de um país, em menos de 5 minutos. O app recusa uma garrafa da França na coluna do Brasil, inclusive via chamada direta à RPC.

#### 3.3.5 Janela de consumo (R5)
- Campos opcionais na ficha do vinho: **beber a partir de (ano)** e **beber até (ano)**. Validação: a partir de ≤ até.
- Status calculado (em `src/lib/`, função pura e testada):
  - `cedo` — ano atual < a partir de
  - `pronto` — dentro da janela
  - `ultimo_ano` — ano atual == até
  - `passou` — ano atual > até
  - `sem_janela` — campos vazios
- Badge discreto na ficha e na posição do mapa para `ultimo_ano` e `passou`.
- Lista **Prontos para beber**, ordenada com os mais urgentes primeiro (`passou`, `ultimo_ano`, `pronto`).
- **Lembrete no MVP:** aviso dentro do app ao abrir (banner "3 vinhos estão no último ano da janela"). Notificação push fica fora do MVP.
- Migration aditiva `0010_drinking_window.sql`: colunas `drink_from_year smallint null` e `drink_until_year smallint null` em `wines`, com `check` de consistência.

**Aceite:** testes unitários cobrem os 5 status e as bordas de ano; o banner aparece só quando há vinhos `ultimo_ano` ou `passou`.

#### 3.3.6 Retirada simplificada
- Retirar = tocar na garrafa → "Retirar" → motivo opcional → confirmar. A posição é liberada na hora.
- Avaliação (estrelas + comentário) é oferecida **depois**, como opcional. Se hoje a retirada exigir nota (ver migration `0008_require_bottle_review_rating.sql`), garantir que **retirar não dependa de avaliar**. A nota continua obrigatória **apenas** quando a pessoa decide registrar uma avaliação.

**Aceite:** é possível retirar uma garrafa sem avaliar; o histórico registra a retirada.

#### 3.3.7 UX móvel
- Pensado para iPhone/Android no navegador: alvos de toque ≥ 44px, fluxos curtos, sem digitação desnecessária.
- Mapa legível em prateleiras grandes (ex.: 20 linhas × 10 colunas) com zoom/rolagem, sem quebrar o layout.

---

## 4. Feature flags

Criar `src/lib/features.ts` com flags lidas de variáveis de ambiente (`NEXT_PUBLIC_FEATURE_*`), **desligadas por padrão**:

| Flag | Esconde |
|---|---|
| `photo_identification` | Identificação por foto/IA (UI e rota retornam 404/desabilitado) |

O scanner EAN-13 continua **ligado**. Funcionalidades fora do MVP que ainda não existem não ganham flag: simplesmente não são construídas.

---

## 5. Refatoração necessária

`src/app/page.tsx` tem ~1.270 linhas com estado, regras e UI misturados. Antes de adicionar funcionalidades (PR 2):

- Separar telas em `src/components/` (ex.: `CellarMap`, `WineList`, `HistoryView`, `AddBottleFlow`, `ShelfEditor`, `ReviewModal`, `AuthScreen`).
- Extrair estado e operações para hooks (ex.: `useCellar`), e toda regra de negócio pura (busca, normalização, duplicata, compatibilidade com regra, janela de consumo) para `src/lib/`, **com testes unitários**.
- O acesso a dados fica em `src/lib/neon/` atrás de uma interface única. O modo demo local (localStorage) implementa a mesma interface.
- **Sem mudança de comportamento** nesse PR. A validação é: o app funciona igual e os testes existentes passam.

---

## 6. Fora do MVP (não implementar)

Preço pago e valor de mercado · conversão cambial/PTAX · cotações periódicas · identificação por foto/IA (além de esconder o que existe) · QR Code e visitantes · convites e papéis MANAGER/VISITOR · rede social/amizades entre adegas · sugestão automática de posição · múltiplas adegas · notificações push · planos pagos/assinatura · app nativo (decisão separada).

No PR 1, mover tudo isso para uma seção **"Backlog pós-MVP"** do `ROADMAP.md`, sem apagar o conteúdo, e reescrever o `PRD.md` com o escopo deste documento.

---

## 7. Ordem dos PRs

| PR | Título | Conteúdo | Depende de |
|---|---|---|---|
| 1 | `docs: recortar escopo para o MVP` | Adicionar este arquivo como `docs/MVP.md`; reescrever `PRD.md` (enxuto) e `ROADMAP.md` (MVP + backlog pós-MVP); atualizar `README.md` | — |
| 2 | `refactor: separar page.tsx em componentes, hooks e lib` | Seção 5, sem mudar comportamento; adicionar testes unitários das regras extraídas | 1 |
| 3 | `feat: feature flags e retirada sem avaliação obrigatória` | Seções 3.3.6 e 4 | 2 |
| 4 | `feat: cadastro preciso` | Seção 3.3.3 (obrigatórios, safra, revisão, duplicata, normalização, editar ficha) | 2 |
| 5 | `feat: regra por coluna e onboarding da adega` | Seção 3.3.4 | 2 |
| 6 | `feat: encontrar vinho com localização` | Seção 3.3.2 | 2 |
| 7 | `feat: janela de consumo` | Seção 3.3.5 + migration `0010` | 4 |
| 8 | `feat: tela de resumo` | Seção 3.3.1 | 6, 7 |
| 9 | `chore: polimento mobile e roteiro de teste real` | Seção 3.3.7 + `docs/TESTE_ADEGA_REAL.md` (passo a passo para cadastrar a adega da cliente-piloto) | 3–8 |

Os PRs 3 a 6 podem ser feitos em paralelo depois do PR 2.

---

## 8. Definição de pronto do MVP

O MVP está pronto quando, **na adega real da cliente-piloto**:
1. Todas as garrafas estão cadastradas, cada uma na posição física correta.
2. Qualquer garrafa é encontrada no app e na adega em **menos de 30 segundos**.
3. Cadastrar uma garrafa nova leva **menos de 2 minutos**, com dados revisados.
4. Retirar uma garrafa atualiza o mapa na hora.
5. A organização por país/coluna é respeitada e protegida pelo app.
6. Vinhos no fim da janela de consumo aparecem em destaque.
7. A cliente usa por 2 semanas sem precisar de ajuda para resolver bug.

E, tecnicamente:
- CI verde; testes unitários para tudo em `src/lib/` que for novo ou extraído.
- Nenhuma posição duplicada, mesmo com requisições simultâneas (manter `test:concurrency` passando).
- RLS: uma conta não lê nem altera a adega de outra (manter `test:auth-rls` passando).

---

## 9. Template de descrição de PR

```markdown
## O que muda
- ...

## Por quê
Requisito: R? / seção ? do docs/MVP.md

## Como testar
1. ...

## Explicação para o Lobo
(3–6 frases em português simples: o que essa mudança faz no app e o que foi mexido por dentro)

## Perguntas em aberto
- ...
```
