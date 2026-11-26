# Roadmap — Adega Inteligente

**Versão:** 2.0 | **Status:** Fases 1–3 integradas; MVP em execução; fases 0 e 4–7 movidas para o backlog pós-MVP | **Data:** 26/11/2026

> O escopo e a ordem de trabalho vêm de [`docs/MVP.md`](docs/MVP.md), que prevalece em caso de conflito. Produção na Vercel continua desativada; previews habilitados. Nenhuma API paga é habilitada.

## MVP — ordem dos PRs
**Objetivo:** colocar o núcleo que já existe na frente da adega real da cliente-piloto, completando só o que falta. Cada PR é pequeno, tem a seção "Explicação para o Lobo" e mantém o CI verde.

| PR | Título | Conteúdo | Depende de | Status |
|---|---|---|---|---|
| 1 | `docs: recortar escopo para o MVP` | `docs/MVP.md`; `PRD.md` enxuto; este roadmap (MVP + backlog pós-MVP); `README.md` | — | em revisão |
| 2 | `refactor: separar page.tsx em componentes, hooks e lib` | Seção 5 do MVP, sem mudar comportamento; testes unitários das regras extraídas | 1 | a fazer |
| 3 | `feat: feature flags e retirada sem avaliação obrigatória` | Seções 3.3.6 e 4 | 2 | a fazer |
| 4 | `feat: cadastro preciso` | Seção 3.3.3: obrigatórios, safra, revisão, duplicata, normalização, editar ficha | 2 | a fazer |
| 5 | `feat: regra por coluna e onboarding da adega` | Seção 3.3.4 | 2 | a fazer |
| 6 | `feat: encontrar vinho com localização` | Seção 3.3.2 | 2 | a fazer |
| 7 | `feat: janela de consumo` | Seção 3.3.5 + migration `0010_drinking_window.sql` | 4 | a fazer |
| 8 | `feat: tela de resumo` | Seção 3.3.1 | 6, 7 | a fazer |
| 9 | `chore: polimento mobile e roteiro de teste real` | Seção 3.3.7 + `docs/TESTE_ADEGA_REAL.md` | 3–8 | a fazer |

Os PRs 3 a 6 podem ser feitos em paralelo depois do PR 2.

### Regras de trabalho
- Nada direto na `main`; todo PR é revisado.
- Migrations só aditivas (`0010_...`, `0011_...`); nunca editar as existentes.
- Nunca apontar comandos, testes ou migrations para o banco de produção.
- Funcionalidades fora do MVP que já existem ficam atrás de feature flags desligadas, sem apagar código.
- Regras de negócio no banco ou em `web/src/lib/`, com testes; nunca dentro de componentes React.
- Na dúvida sobre comportamento de produto, deixar a pergunta na descrição do PR em vez de inventar.

### Saída do MVP
A definição de pronto da seção 8 de [`docs/MVP.md`](docs/MVP.md), validada na adega real da cliente-piloto: todas as garrafas cadastradas na posição certa, qualquer garrafa encontrada em menos de 30 segundos, cadastro em menos de 2 minutos e 2 semanas de uso sem ajuda.

## Concluído — Fases 1–3
O núcleo abaixo já está em `main` e é a base do MVP. O conteúdo é o da versão 1.8 deste roadmap.

### Fase 1 — Base do projeto e adega visual mínima
**Status:** concluída e validada ponta a ponta no Neon.

- [x] Criar projeto Next.js + TS + banco relacional e autenticação.
- [x] Criar uma adega por proprietário no MVP.
- [x] Criar prateleiras com linhas e colunas; grid visual navegável e edição de prateleira.
- [x] Criar modo pequena/livre e modo organizado por um critério/prateleira.
- [x] Persistir posição única por garrafa; prevenção de dupla ocupação em transação.
- [x] Pesquisar e cadastrar vinho manualmente, escolher posição e quantidade.
- [x] Confirmar cadastro manual, persistência remota e reabertura dos dados no Neon.

**Saída:** app funcional sem IA que já encontra cada garrafa na posição física.

### Fase 2 — Cadastro e identificação assistida
**Escopo entregue:** busca textual, cadastro manual, scanner EAN-13 e revisão humana. Reconhecimento por foto faz parte do escopo do produto e está planejado como complemento na Fase 5; não altera o que já foi entregue nesta fase.
**Status:** concluída e validada ponta a ponta no Neon.

- [x] Buscar candidatos na WineAPI pela pesquisa textual, quando habilitada.
- [x] Carregar ficha disponível, permitir revisão/correção manual e deixar campos desconhecidos em branco.
- [x] Escolher quantidade e posições; bloquear posições ocupadas ou incompatíveis com a regra da prateleira.
- [x] Reusar ficha por nome, produtor e safra revisados, sem criar duplicatas ao cadastrar mais unidades.
- [x] Validar scanner EAN-13, associação a vinhos existentes e fluxo manual; integrações externas permanecem protegidas por configuração/credencial.

**Saída:** busca/código → candidatos revisáveis → ficha revisada → posições → garrafas cadastradas e persistidas.

### Fase 3 — Histórico e avaliações das garrafas
**Status:** integrada em `main` pelo PR #9 (merge `597b4e3`); validações funcionais foram concluídas antes do merge no Preview e em branch Neon descartável. Migrations 0001–0009 foram aplicadas/verificadas na branch descartável e no PostgreSQL 16 local descartável. Não foram reaplicadas durante o merge.

- [x] Mover garrafas entre posições e trocar ocupantes, respeitando regras e registrando origem/destino.
- [x] Retirar garrafas, liberar posição e registrar data, responsável e motivo opcional.
- [x] Consultar movimentações, trocas e retiradas no histórico.
- [x] Avaliar cada garrafa de 1 a 5 estrelas e calcular média por vinho/safra.
- [x] Validar persistência, conflitos, regras e autorização do proprietário.
- [x] Validar interface, concorrência de posições e RLS com duas contas.

**Saída:** inventário com histórico de movimentações, retiradas e avaliações. O escopo concluído desta fase não muda.

**Gate de produção (pendente):** integração do código não executa migrations nem autoriza publicação. Antes de habilitar produção, validar backup/restauração, comparar o ledger e schema do destino, conferir o preflight de dados da migration 0008 e aprovar explicitamente uma janela de publicação. Não apontar testes para produção.

## Backlog pós-MVP
Tudo abaixo ficou **fora do MVP** (decisão registrada em [`docs/MVP.md`](docs/MVP.md), seção 6). O texto é o da versão 1.8 deste roadmap, preservado sem cortes para quando o escopo for reaberto. A ordem e os critérios de bloqueio abaixo valem só para esse backlog; não se aplicam ao MVP.

### Ideias novas da entrevista de descoberta
- Rede social de adegas: ver adegas de amigos, adicionar adegas e sistema de amizades (evolução do QR Code).
- Notificações push para a janela de consumo (no MVP, o lembrete é um aviso dentro do app).
- Serviço de instalação presencial (cadastrar a coleção do cliente pessoalmente).
- Planos free/premium e assinatura in-app.
- App nativo (Expo/React Native): decisão separada, com spike e ADR.

### Fase 0 — Descoberta de EAN, foto e cotações
**Status:** proposta e custos documentados; benchmark representativo e decisão final de fornecedor pendentes. Esta fase não exige contratação nem chamadas pagas.

- [x] Atualizar o escopo para incluir gestão financeira e reconhecimento por foto.
- [x] Registrar opções técnicas, licenças públicas, preços publicados e lacunas de precisão em `PROPOSTA_TECNICA.md`.
- [ ] Solicitar propostas/termos de uso e acesso de avaliação sem contratar plano: InVintory, Wine-Searcher e, se ainda competitivo, WineEngine.
- [ ] Montar conjunto rotulado de 30–50 garrafas/EANs e fotos, incluindo vinhos brasileiros, nomes parecidos, múltiplas safras e casos de safra ilegível.
- [ ] Medir top-1/top-3 de identidade, precisão/cobertura de safra, uva e região, falsos positivos, cobertura de preços no Brasil, latência, correções humanas e custo real por cadastro.
- [ ] Comparar a busca EAN da adega, Open Food Facts, catálogos de vinho e pesquisa web; nunca deduzir safra do EAN sozinho.
- [ ] Aprovar explicitamente provedor, orçamento, retenção de fotos, licença/caching de catálogo e limites antes de qualquer integração paga.

**Saída:** decisão de go/no-go com comparação testável, custo por 100/1.000 identificações e fornecedor escolhido (ou manutenção do fluxo manual).

### Fase 4 — Gestão financeira da coleção
**Dependência:** a captura manual de preço pago e o resumo financeiro inicial não dependem da Fase 0 nem de API externa. Cotações automatizadas dependem de fonte e licença aprovadas; não contratar nem habilitar serviços pagos nesta etapa.

- [ ] Exigir preço pago em cada nova compra, por garrafa e na moeda original; preservar a moeda/valor informados.
- [ ] Converter o preço pago historicamente pela data da compra e guardar taxa/fonte. Se não houver data ou taxa aplicável, aceitar equivalente em BRL informado manualmente e identificá-lo como conversão manual.
- [ ] Consultar cotação atual por vinho, safra e formato; armazenar histórico, URL, provedor, moeda, data da coleta e taxa de câmbio.
- [ ] Classificar oferta verificável da safra/formato exatos como confirmada; médias, histórico, outra safra ou correspondência incompleta como estimada. Outra safra pode servir de referência, desde que a safra comparada apareça explicitamente.
- [ ] Aceitar estimativa manual quando não houver cotação, sempre identificada como estimativa. Ao surgir cotação confiável da mesma safra e formato, substituir automaticamente a estimativa no valor atual e preservar a observação anterior no histórico.
- [ ] Atualizar cotações semanalmente e oferecer botão de atualização manual, com indicação de última atualização e cotação vencida.
- [ ] Calcular todos os totais financeiros em BRL e exibir separadamente preço pago convertido, parcela confirmada, parcela estimada e unidades sem valor.
- [ ] Criar controles independentes de privacidade para preço pago e valor de mercado, privados por padrão para visitantes.
- [ ] Aplicar autorização/RLS e filtros no servidor; QR/link público nunca recebe valores por padrão.

**Saída:** valores por garrafa rastreáveis e resumo financeiro em BRL, sem preencher lacunas por suposição.

### Fase 5 — Identificação por foto como complemento ao EAN
**Dependência:** conclusão da Fase 0; preservar scanner e cadastro manual da Fase 2.

- [ ] Começar por EAN-13 já implementado; resolver primeiro associações locais, depois catálogos autorizados e busca web pelo código e candidatos.
- [ ] Usar IA apenas para ordenar/explicar candidatos encontrados por fontes, com URL e proveniência por campo; não tratar código EAN como atributo semântico.
- [ ] Oferecer foto quando o EAN não existir, estiver ambíguo ou não tiver ficha suficiente.
- [ ] Avaliar fornecedor especializado e OCR/visão genéricos; obter produtor, nome, safra, uva e região quando houver evidência.
- [ ] Mostrar candidatos e origem/confiança para cada campo; ausentes ou conflitantes ficam `desconhecidos`.
- [ ] Exigir revisão e confirmação humana antes de criar ficha, associação EAN ou garrafa.
- [ ] Nunca inventar, inferir ou confirmar automaticamente uma safra incerta; falha do provedor retorna ao fluxo manual.
- [ ] Medir precisão, cobertura, taxa de correção, latência, custo por cadastro finalizado e descarte de fotos.

**Saída:** fluxo EAN → pesquisa de candidatos → foto/IA quando necessário → revisão humana → cadastro explícito.

### Fase 6 — Compartilhamento e beta familiar
**Dependência:** concluir Fases 4–5 e validar privacidade das informações financeiras.

- [ ] QR Code revogável e URL não listada para leitura sem conta.
- [ ] Expor coleção/localizações em leitura; ocultar preço pago e cotação por padrão.
- [ ] Aplicar controles de visibilidade separados definidos na Fase 4.
- [ ] Convites apenas pelo proprietário; funções OWNER/MANAGER/VISITOR.
- [ ] Validar acesso no backend, inclusive chamadas diretas à API.
- [ ] Testar adega real de 2×(10×20) posições e outra pequena sem regra.
- [ ] Melhorar UX no iPhone: câmera, busca, posições e carregamento.

**Saída:** beta familiar com controles de acesso e de privacidade de valores validados.

### Fase 7 — Hardening e expansão orientada por uso
**Dependência:** concluir o beta familiar na Fase 6.

- [ ] Medir precisão de EAN/foto, taxas de correção, cobertura de preços e custo por consulta.
- [ ] Resolver gargalos, acessibilidade, rate limits, observabilidade e backups.
- [ ] Testar restauração e detecção de cotações vencidas/fonte removida.
- [ ] Validar contratos e licenças dos dados antes de monetizar.
- [ ] Só com evidência de uso avaliar múltiplas adegas, transferências, recomendações e monetização.

**Saída:** beta operacionalmente confiável; expansões apoiadas por métricas e licenças verificadas.

### Ordem obrigatória
**Fases 1–3 integradas → Fase 4.1 (preço pago e gestão manual, sem APIs) → Fase 0 (descoberta/gate apenas para fontes externas) → Fase 4.2 (cotações, após aprovação) e Fase 5 (EAN + foto/IA) → Fase 6 (compartilhamento) → Fase 7 (hardening).**

Nenhuma etapa reabre ou reduz o escopo entregue nas Fases 1–3. As integrações pagas só podem ser escolhidas depois de benchmark, licença e custo aprovados.

### Critérios de bloqueio
- Safra incerta, contraditória ou sem fonte permanece desconhecida; nenhum modelo pode confirmá-la automaticamente.
- Correspondência ambígua não pode gravar produto ou garrafa sem revisão humana.
- Valor `confirmado` exige oferta verificável de vinho, safra e formato compatíveis, com URL e data; caso contrário mostrar `estimado` ou desconhecido.
- Visitante não pode obter valores financeiros enquanto o proprietário não liberar cada categoria.
- Provedor sem licença de uso, retenção e caching compatível não pode ser ativado.
- Custo ou cobertura inadequados mantêm caminho manual e bloqueiam contratação, não as Fases 1–3.

### Backlog fora do escopo desta versão
- Múltiplas adegas por proprietário na UI; transferências entre adegas ou transporte/recebimento parcial.
- Marketplace, compra/venda e integração de e-commerce.
- Funcionalidades sociais públicas, sommelier conversacional e sensores físicos.
- Treinar modelo proprietário de visão do zero ou copiar catálogo protegido de fornecedor.

### Decisões revisadas
- Gestão financeira voltou ao escopo de produto; preço pago, mercado, atualização periódica, total em BRL e privacidade são requisitos da Fase 4.
- Foto e IA voltaram ao escopo como complemento do EAN, não como substituto; revisão humana obrigatória e safra incerta nunca é confirmada automaticamente.
- O conteúdo anteriormente excluído foi atualizado em `PRD.md` e `TESTES_APIS.md`; ver também [proposta e estimativas](PROPOSTA_TECNICA.md).
