# PRD — Adega pessoal inteligente

**Versão:** 1.1 (escopo atualizado)
**Data:** 17/11/2026
**Status:** MVP com cadastro manual e busca textual; histórico e avaliações são a próxima etapa.
**Visão:** ajudar uma pessoa a cadastrar e encontrar fisicamente cada garrafa, com busca textual e adega visual.

## 1. Problema e proposta de valor
Colecionadores domésticos frequentemente não sabem com precisão quais vinhos têm nem em que posição estão guardados. Digitar ficha por ficha é demorado; o produto combina busca de vinhos revisável com uma adega física visual e o endereço exato de cada garrafa.

### Público inicial
- Proprietários de adegas domésticas, da pequena coleção à adega organizada em grandes prateleiras.
- Familiares que consultam o acervo pelo QR Code ou colaboram com autorização do proprietário.

### Objetivo do MVP
Cadastrar uma adega doméstica, pesquisar vinhos ou cadastrá-los manualmente, guardar uma ou várias garrafas em posições físicas e consultá-las. Manter histórico de movimentações, retiradas e avaliações.

## 2. Premissas de escopo
- **MVP: uma adega por conta proprietária.** Modelo de dados deve permitir expansão posterior, mas não construir telas de múltiplas adegas agora.
- **Transferências entre adegas: fora do MVP.** Não construir status de transporte, recebimento parcial ou fluxo interadegas.
- Uma adega contém uma ou mais prateleiras; uma prateleira tem dimensões configuráveis (linhas × colunas). Exemplo real: 2 prateleiras, cada uma com 10 colunas × 20 linhas.
- **Uma garrafa física = uma posição física exclusiva.** Posição obrigatória para cadastrar garrafas na adega; uma garrafa retirada libera a posição.
- **Organização livre apenas em modo de adega pequena.** Para a organização estruturada, a pessoa configura um único critério por prateleira; a regra é obrigatória. A definição/limiar exato do que configura adega pequena fica como parâmetro de produto a validar, sem inventar uma capacidade fixa.

## 3. Jornadas principais
### J1 — Primeiro acesso
1. Criar conta e entrar.
2. Nomear a adega, informar se é pequena/organização livre ou estruturada.
3. Criar prateleira(s) com número de linhas e colunas.
4. Se organização estruturada: escolher um critério por prateleira (país, uva, safra, região ou campo personalizado) e distribuí-lo por **linhas ou colunas**.
5. Ver prateleira visual e mapa de posições vazias.

### J2 - Cadastrar vinho por busca textual
1. Pesquisar por nome, produtor ou safra na WineAPI; se não encontrar, seguir com cadastro manual.
2. Escolher um candidato e carregar os dados disponíveis, deixando ausentes como desconhecidos.
3. Revisar e corrigir a ficha antes de salvar.
4. Informar quantidade e escolher uma posição livre/compatível para cada unidade.
5. Salvar as garrafas e reutilizar uma ficha existente quando vinho, produtor e safra coincidirem.

### J3 - Cadastrar manualmente
Preencher a ficha do vinho → confirmar → informar quantidade e posições → salvar as garrafas.

### J4 — Encontrar vinho
Pesquisar ou filtrar coleção → abrir ficha → visualizar todas as garrafas disponíveis e **prateleira, linha e coluna** → destacar localização no mapa visual.

### J5 — Retirar e avaliar
Selecionar garrafa → retirar → liberar posição → registrar no histórico data e usuário, com motivo opcional (bebeu, presenteou, vendeu, descartou etc.). Se consumida, permitir nota de 1 a 5 estrelas e comentário opcionais por garrafa. Calcular média por vinho com base somente em avaliações efetivamente existentes.

### J6 — Visita por QR Code
Proprietário compartilha QR Code ou URL secreta e revogável → visitante sem conta consulta coleção e localizações em modo somente leitura. A adega **não é indexada/listada**; a posse do link concede leitura, então o link não é privacidade absoluta.

## 4. Requisitos funcionais do MVP
| ID | Requisito | Prioridade | Aceite |
|---|---|---|---|
| F01 | Conta, login e adega do proprietário | P0 | Conta autentica; proprietário gerencia sua adega |
| F02 | Prateleiras visuais com linhas/colunas editáveis | P0 | 10×20 renderiza e mantém endereço único por posição |
| F03 | Endereço de posição e ocupação exclusiva | P0 | Não permite duas garrafas na mesma posição; gravação atômica |
| F04 | Modo livre para adega pequena | P0 | Posição livre aceita qualquer vinho no modo livre |
| F05 | Organização por um critério por prateleira estruturada | P0 | Usuário escolhe linhas **ou** colunas; regra bloqueia incompatíveis |
| F06 | Múltiplas uvas | P0 | Vinho de corte pode ocupar posição correspondente a qualquer uva confirmada |
| F07 | Busca textual e revisão da ficha | P0 | Selecionar candidato; campos ausentes continuam desconhecidos e editáveis |
| F08 | Cadastro manual de vinho | P0 | Garrafa pode ser cadastrada mesmo sem resultado ou integração externa |
| F09 | Cadastro em lote do mesmo vinho | P0 | Para N unidades, exigir N posições válidas distintas |
| F10 | Sugestão inteligente de posição | P1 | Sugere próximas a vinhos iguais/semelhantes sem bloquear escolha válida |
| F11 | Mover e trocar posições | P1 | Troca validada dos dois lados e registrada atomicamente |
| F12 | Histórico auditável | P1 | Cada movimento e retirada registra data, usuário e origens/destinos |
| F13 | Retirada e avaliação por garrafa | P1 | Histórico e avaliações opcionais; média correta por vinho/safra |
| F14 | QR/link revogável para visitante sem login | P1 | Somente leitura, acesso não indexado; regeneração/revogação efetiva |
| F15 | Compartilhamento por convite | P2 | Apenas proprietário emite convite; gerente edita; visitante consulta |

**Nota:** P0 = indispensável para primeira versão utilizável; P1 = extensão para beta completo; P2 = após base estabilizada. Nenhuma integração externa é requisito para conseguir cadastrar manualmente.

## 5. Regras de negócio detalhadas
### Posições
- `position = cellar_id + shelf_id + row_index + column_index` (unívoca). Linha/coluna não podem extrapolar dimensões.
- Acesso concorrente: duas operações não podem ocupar a mesma posição. Usar transação, restrição de unicidade para garrafa ativa e verificação de compatibilidade no servidor.
- Apenas prateleiras **estruturadas** exigem metadados usados na regra. Se uva/país/safra necessário estiver ausente, pedir confirmação antes de selecionar posição.
- Mover/trocar não apaga histórico nem altera dados de aquisição.

### Produto x garrafa
- `Wine`: identidade de vinho/produtor/rótulo e, quando disponível, safra validada.
- `Bottle`: unidade física, posição, status e histórico individual.
- O mesmo vinho/safra pode ter várias garrafas físicas.
- Não confundir vinhos distintos com nomes parecidos; jamais assumir que todo “Bellevue” corresponde ao mesmo produtor ou safra.

### Permissões
- `OWNER`: configura prateleiras, membros e compartilhamento, além de gerir o estoque.
- `MANAGER`: pode cadastrar, mover, retirar e avaliar; não emite convites nem muda controles de acesso.
- `VISITOR`: somente leitura; sem conta via link/QR; visitantes convidados com conta continuam sem edição.
- As rotas de API verificam função e propriedade; não depender apenas de esconder botões.

## 6. UX e telas
1. Login/criar conta.
2. Onboarding de adega e prateleiras (modo pequeno/livre ou estruturado).
3. Dashboard: total de garrafas, ocupação e busca.
4. Adega visual: grid por prateleira; zoom, filtros, ocupação, posição selecionada.
5. Busca textual: resultados revisáveis e seleção de posições em lote.
6. Busca/cadastro manual de vinho.
7. Ficha do vinho: informações, origem dos dados e garrafas/localizações.
8. Histórico: retiradas, avaliações e movimentações.
9. Visitante por link/QR (sem login; somente leitura).
10. Configurações: prateleiras e compartilhamento.

**Padrão móvel:** fluxos curtos, botões grandes, navegação fluida no iPhone, sem exigir digitação desnecessária; desktop responsivo.

## 7. Busca textual e confirmação da ficha
1. Pesquisar por nome, produtor ou safra na WineAPI por uma rota segura do servidor.
2. Exibir candidatos como sugestões, sem tratar correspondência como confirmação automática.
3. Carregar os detalhes disponíveis; preservar campos ausentes como desconhecidos.
4. Permitir correção manual antes do cadastro e manter o cadastro manual como alternativa.
5. Reconhecimento por foto e identificação visual ficam adiados e fora do escopo atual.

## 8. Arquitetura proposta
- **Web:** Next.js + TypeScript, interface responsiva.
- **Banco e Auth da Fase 1:** Neon Postgres + Neon Auth e Data API, com RLS por proprietário; migrations SQL versionadas e constraints/transações para posições. O navegador recebe apenas o endpoint público do projeto; a connection string privada fica em ferramentas locais de desenvolvimento e nunca no cliente.
- **Backend:** rotas server-side para integrações; cadastro em lote usa RPC transacional no Postgres com validação explícita de autenticação, propriedade da adega e posições.
- **Hospedagem:** serviço com HTTPS e banco gerenciado.
- **Segurança e LGPD:** dados de conta privados; QR com token não adivinhável, revogável e não indexado; rate limit na busca; não expor segredos no front.

### Entidades principais
`User`, `Cellar`, `CellarMember`, `Invite`, `PublicShareToken`, `Shelf`, `ShelfRule`, `Position`, `Wine`, `WineGrape`, `Bottle`, `BottleMovement`, `BottleRemoval`, `BottleReview`, `WineExternalMatch`.

## 9. Requisitos não funcionais e qualidade
- Aplicativo utilizável sem API externa graças ao cadastro manual.
- Busca externa com tratamento de falhas e alternativa de cadastro manual.
- Operações concorrentes nas posições devem ser atômicas e auditáveis.
- Índices para pesquisa de vinho/safra/posições e cache de consultas com TTL, respeitando os termos de fornecedor.
- Backups/recuperação do banco e teste de restauração antes do beta externo.
- Acessibilidade básica: contraste, rótulos para leitores de tela, navegação por toque e teclado.
- Observabilidade: qualidade e latência da busca, taxa de correção, cobertura e posições duplicadas (meta zero).

## 10. Critérios para liberar o beta
- Busca textual nunca confirma silenciosamente um rótulo ambíguo; a ficha pode ser revisada antes do cadastro.
- Cadastro de lote não gera duas garrafas na mesma posição, mesmo com requisições simultâneas.
- Posição incompatível é bloqueada em operação estruturada; modo pequena/livre aceita posição livre.
- Visitante não pode alterar nada mesmo manipulando chamadas HTTP.
- Movimentos, retiradas e avaliações permanecem associados à garrafa correta.

## 11. Fora do MVP
- Identificação por foto, OCR e reconhecimento visual (adiados por custo).
- Preço pago, valor de mercado, conversão cambial e totais financeiros da coleção.
- Transferências entre adegas, transporte e recebimento parcial.
- Múltiplas adegas por proprietário na UI.
- Marketplace, compra/venda, integração com e-commerce, carteira digital.
- Recomendações sofisticadas de consumo, sensor de temperatura, sommelier conversacional.
- Treinar do zero um modelo proprietário de visão ou copiar catálogo protegido de terceiros.

## 12. Pontos abertos (não impedem a prova de conceito)
- Definir, com usuários reais, o que caracteriza *adega pequena* e se essa classificação será por capacidade ou escolha explícita.
- Negociar condições comerciais, retenção/caching e uso de dados dos provedores de catálogo.
- Avaliar se compartilhamento de gerentes/familiares entra no beta inicial ou na entrega seguinte.

## 13. Documentação de referência
- WineAPI: https://wineapi.io/ ; https://wineapi.io/docs/ ; https://wineapi.io/terms
