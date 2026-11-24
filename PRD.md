# PRD — Adega pessoal inteligente

**Versão:** 1.3 (requisitos financeiros e integração da Fase 3 consolidados)
**Data:** 24/11/2026
**Status:** Fases 1–2 integradas; Fase 3 implementada e validada em branch/ambiente isolado no PR #9, aguardando integração; gestão financeira e reconhecimento por foto planejados, ainda não implementados.
**Visão:** ajudar uma pessoa a identificar, organizar, localizar e acompanhar o valor de cada garrafa, combinando scanner EAN-13, busca revisável, foto opcional e adega visual.

## 1. Problema e proposta de valor
Colecionadores domésticos frequentemente não sabem com precisão quais vinhos têm nem em que posição estão guardados. Digitar ficha por ficha é demorado; o produto combina busca de vinhos revisável com uma adega física visual e o endereço exato de cada garrafa.

### Público inicial
- Proprietários de adegas domésticas, da pequena coleção à adega organizada em grandes prateleiras.
- Familiares que consultam o acervo pelo QR Code ou colaboram com autorização do proprietário.

### Objetivo do produto
Cadastrar uma adega doméstica, pesquisar vinhos ou cadastrá-los manualmente, guardar cada garrafa em posição física, manter o histórico de movimentações e avaliações e acompanhar preço pago e estimativa atual da coleção. A identificação por foto complementa o scanner EAN-13; ambos levam a uma ficha revisada por uma pessoa.

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

### J2 — Cadastrar e identificar vinho
1. Tentar o scanner EAN-13 existente e consultar associações locais, catálogos e pesquisa web autorizados.
2. Se o EAN não resolver ou gerar ambiguidade, oferecer foto do rótulo; a foto complementa o scanner e nunca o substitui.
3. Se ainda não houver candidato, permitir busca textual por nome/produtor/safra ou cadastro manual.
4. Carregar dados disponíveis e evidências; campos ausentes permanecem desconhecidos.
5. Revisar e corrigir cada campo antes de salvar; não confirmar automaticamente safra incerta.
6. Informar quantidade e escolher posição livre/compatível para cada unidade; reusar ficha apenas quando a pessoa confirmar a identidade.

### J3 - Cadastrar manualmente
Preencher a ficha do vinho → confirmar → informar quantidade e posições → salvar as garrafas.

### J4 — Encontrar vinho
Pesquisar ou filtrar coleção → abrir ficha → visualizar todas as garrafas disponíveis e **prateleira, linha e coluna** → destacar localização no mapa visual.

### J5 — Retirar e avaliar
Selecionar garrafa → retirar → liberar posição → registrar data, responsável e motivo opcional. Permitir nota obrigatória de 1 a 5 estrelas e comentário opcional por garrafa. Calcular a média por vinho e safra apenas a partir das notas existentes.

### J6 — Cadastrar por EAN ou foto
Escanear EAN-13 → consultar associação da adega, catálogos e pesquisa web → se não houver identidade segura, tirar foto do rótulo → combinar candidatos e evidências → revisar ou editar cada campo → confirmar explicitamente → cadastrar o vinho e as garrafas em posições livres. Safra ilegível, conflitante ou sem fonte confiável fica desconhecida até confirmação humana.

### J7 — Acompanhar valores
Informar o preço pago por garrafa → consultar cotações atuais quando disponíveis → identificar cada valor como confirmado ou estimado, com fonte e data → ver subtotais e total da coleção em reais → configurar separadamente a privacidade do preço pago e do valor de mercado.

### J8 — Visita por QR Code
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
| F16 | Registrar preço pago por garrafa | P1 | Obrigatório em cada nova compra; guardar valor por unidade e moeda original, com conversão histórica para BRL quando houver data/taxa correspondentes |
| F17 | Estimar valor atual por garrafa | P1 | Valor marcado como confirmado ou estimado; fonte, safra, formato e data visíveis; estimativa manual é substituída por cotação confiável exata, preservando histórico |
| F18 | Atualizar cotações periodicamente | P1 | Atualização semanal e manual respeitam limite/termos do provedor; observações antigas ficam históricas e podem expirar |
| F19 | Exibir total da coleção em reais | P1 | Todos os totais em BRL; separar confirmado, estimado e sem valor, sem contar desconhecidos como zero |
| F20 | Configurar privacidade dos valores | P1 | Preço pago e valor de mercado têm controles independentes; ambos ficam ocultos por padrão para visitantes |
| F21 | Identificar candidatos por EAN com fontes | P1 | Combina adega, catálogo e pesquisa web; IA pode ordenar candidatos, mas EAN não confirma safra nem grava ficha |
| F22 | Reconhecer foto do rótulo | P1 | Retorna produtor, nome, safra, uva e região com evidências por campo; exige revisão humana antes do cadastro |

**Nota:** P0 = indispensável para primeira versão utilizável; P1 = extensão para beta completo; P2 = após base estabilizada. Nenhuma integração externa é requisito para conseguir cadastrar manualmente.

## 5. Regras de negócio detalhadas
### Posições
- `position = cellar_id + shelf_id + row_index + column_index` (unívoca). Linha/coluna não podem extrapolar dimensões.
- Acesso concorrente: duas operações não podem ocupar a mesma posição. Usar transação, restrição de unicidade para garrafa ativa e verificação de compatibilidade no servidor.
- Apenas prateleiras **estruturadas** exigem metadados usados na regra. Se uva/país/safra necessário estiver ausente, pedir confirmação antes de selecionar posição.
- Mover/trocar não apaga histórico nem altera dados de aquisição.
- Preço pago pertence à unidade física (`Bottle`) e não é substituído por cotação ou estimativa de mercado.

### Valores e evidências
- Em cada nova compra, exigir preço pago por garrafa e guardar o valor na moeda original. Preço pago e valor de mercado permanecem separados; compras antigas importadas podem ser completadas conforme disponibilidade dos dados.
- Para mostrar valores pagos em BRL, usar a taxa histórica correspondente à data da compra e guardar data, taxa e fonte cambial junto da conversão. Se faltar data ou taxa histórica, permitir informar manualmente o equivalente em BRL, mantendo intactos valor e moeda originais e marcando a conversão como manual; nunca inventar taxa.
- `confirmado` só pode ser exibido quando a fonte mostra oferta verificável do mesmo vinho, safra e formato, com link e data de observação. Médias, preços históricos, outra safra, oferta indisponível ou correspondência incompleta são `estimado`.
- Quando não houver cotação, permitir estimativa manual explicitamente identificada como `estimada`, com fonte/nota e data informadas pela pessoa. Uma cotação confiável da mesma safra e formato passa a ser o valor atual automaticamente; a estimativa anterior permanece no histórico. Uma cotação de outra safra pode ser referência, mas sempre `estimada` e com a safra comparada visível.
- Sem evidência suficiente, valor é desconhecido; nunca usar zero nem completar com preço inventado.
- Cotações guardam fonte, URL, moeda, safra/formato correspondentes, instante da consulta, taxa e fonte cambial e status de validade. Atualizar semanalmente e permitir atualização manual, sujeita a limites/termos e controles contra abuso. Cada atualização cria observação histórica, sem apagar aquisição nem estimativas anteriores.
- Todos os totais financeiros da coleção são apresentados em BRL. Mostrar separadamente preço pago convertido, mercado confirmado, mercado estimado e garrafas sem valor; explicitar a parcela confirmada e a estimada no valor agregado. Desconhecidos não são contados como zero. Toda conversão informa origem e data da taxa ou que o equivalente foi informado manualmente.
- O proprietário controla visibilidade do preço pago e do valor de mercado separadamente. Ambos ficam privados em links/QR para visitantes até opt-in explícito; a regra é aplicada na API.

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
9. Scanner EAN-13 e captura opcional da foto do rótulo.
10. Ficha revisável com origem e estado de cada campo.
11. Valores por garrafa e resumo financeiro da coleção.
12. Visitante por link/QR (sem login; somente leitura).
13. Configurações: prateleiras, compartilhamento e privacidade dos valores.

**Padrão móvel:** fluxos curtos, botões grandes, navegação fluida no iPhone, sem exigir digitação desnecessária; desktop responsivo.

## 7. Busca textual e confirmação da ficha
1. Manter a busca textual da Fase 2 por rota server-side e o scanner EAN-13 já implementado.
2. EAN consulta primeiro associação confirmada na adega; depois, fontes de catálogo permitidas e pesquisa web pelo código e pelos candidatos conhecidos.
3. IA pode comparar/ordenar apenas candidatos que tenham evidência rastreável; código EAN sozinho não contém prova suficiente de safra, região ou uvas.
4. Quando EAN e pesquisa não resolverem, oferecer foto frontal do rótulo; reconhecimento especializado ou visão/OCR genéricos retornam candidatos e campos extraídos.
5. Mostrar fonte e grau de certeza por campo. Safra e uvas ausentes, ilegíveis ou conflitantes ficam vazias/desconhecidas; jamais inferir e confirmar automaticamente.
6. A pessoa revisa, corrige e confirma explicitamente antes de criar a ficha ou as garrafas. Falha ou ausência de serviço leva ao cadastro manual.

## 8. Arquitetura proposta
- **Web:** Next.js + TypeScript, interface responsiva.
- **Banco e Auth da Fase 1:** Neon Postgres + Neon Auth e Data API, com RLS por proprietário; migrations SQL versionadas e constraints/transações para posições. O navegador recebe apenas o endpoint público do projeto; a connection string privada fica em ferramentas locais de desenvolvimento e nunca no cliente.
- **Backend:** rotas server-side para integrações; cadastro em lote usa RPC transacional no Postgres com validação explícita de autenticação, propriedade da adega e posições.
- **Hospedagem:** serviço com HTTPS e banco gerenciado.
- **Segurança e LGPD:** dados de conta privados; QR com token não adivinhável, revogável e não indexado; rate limit na busca; não expor segredos no front.

### Entidades principais
`User`, `Cellar`, `CellarMember`, `Invite`, `PublicShareToken`, `CellarPrivacySettings`, `Shelf`, `ShelfRule`, `Position`, `Wine`, `WineGrape`, `Bottle`, `BottleAcquisition`, `WinePriceObservation`, `BottleMovement`, `BottleRemoval`, `BottleReview`, `WineExternalMatch`, `WineIdentificationEvidence`.

## 9. Requisitos não funcionais e qualidade
- Aplicativo utilizável sem API externa graças ao cadastro manual.
- Busca externa com tratamento de falhas e alternativa de cadastro manual.
- Identificação por EAN/foto com proveniência por campo, revisão explícita e ausência segura quando fonte/modelo não sabe.
- Valores financeiros isolados por adega e protegidos por RLS; chaves de provedores somente no servidor.
- Cotação vencida ou sem correspondência exata nunca é mostrada como valor confirmado.
- Operações concorrentes nas posições devem ser atômicas e auditáveis.
- Índices para pesquisa de vinho/safra/posições e cache de consultas com TTL, respeitando os termos de fornecedor.
- Backups/recuperação do banco e teste de restauração antes do beta externo.
- Acessibilidade básica: contraste, rótulos para leitores de tela, navegação por toque e teclado.
- Observabilidade: qualidade e latência da busca, taxa de correção, cobertura e posições duplicadas (meta zero).

## 10. Critérios para liberar o beta
- Busca textual nunca confirma silenciosamente um rótulo ambíguo; a ficha pode ser revisada antes do cadastro.
- EAN e foto não gravam um vinho sem revisão e confirmação humana; safra incerta nunca é confirmada pelo modelo.
- Cada valor de mercado tem status, fonte, data e safra/formato compatíveis; estimativas e valores ausentes são claramente separados.
- Visitante não recebe preço pago ou de mercado sem habilitação separada e explícita do proprietário.
- Cadastro de lote não gera duas garrafas na mesma posição, mesmo com requisições simultâneas.
- Posição incompatível é bloqueada em operação estruturada; modo pequena/livre aceita posição livre.
- Visitante não pode alterar nada mesmo manipulando chamadas HTTP.
- Movimentos, retiradas e avaliações permanecem associados à garrafa correta.

## 11. Fora do MVP
- Transferências entre adegas, transporte e recebimento parcial.
- Múltiplas adegas por proprietário na UI.
- Marketplace, compra/venda, integração com e-commerce, carteira digital.
- Recomendações sofisticadas de consumo, sensor de temperatura, sommelier conversacional.
- Treinar do zero um modelo proprietário de visão ou copiar catálogo protegido de terceiros.

## 12. Pontos abertos (não impedem a prova de conceito)
- Definir, com usuários reais, o que caracteriza *adega pequena* e se essa classificação será por capacidade ou escolha explícita.
- Negociar condições comerciais, retenção/caching e uso de dados dos provedores de catálogo.
- Medir cobertura de preços de varejistas brasileiros e adequação de moeda/safra antes de selecionar uma API de cotações.
- Confirmar contrato de imagens, retenção, licença de dados, preço e cotas dos fornecedores antes de qualquer integração paga.
- Benchmark independente de EAN, foto, produtor, safra, uva e região em 30–50 rótulos, incluindo vinhos nacionais e nomes/safras semelhantes.

## 13. Documentação de referência
- WineAPI: https://wineapi.io/ ; https://wineapi.io/docs/ ; https://wineapi.io/terms
- Proposta, comparação de provedores e custos: [PROPOSTA_TECNICA.md](PROPOSTA_TECNICA.md).
