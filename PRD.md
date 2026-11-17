# PRD — Adega pessoal inteligente

**Versão:** 1.0 (planejamento do MVP)  
**Data:** 13/11/2026  
**Status:** pronto para validação técnica; não é especificação congelada  
**Visão:** permitir que uma pessoa descubra, cadastre e encontre fisicamente seus vinhos com a facilidade de fotografar um rótulo ou pesquisar por nome.

## 1. Problema e proposta de valor
Colecionadores domésticos frequentemente não sabem com precisão quais vinhos têm, em que posição estão guardados e quanto vale a coleção. Digitar ficha por ficha é demorado; identificar uma safra específica e consultar preços confiáveis é difícil. O produto combina **identificação assistida por IA + catálogo verificável + adega física visual com endereço exato para cada garrafa**.

### Público inicial
- Proprietários de adegas domésticas, da pequena coleção à adega organizada em grandes prateleiras.
- Familiares que consultam o acervo pelo QR Code ou colaboram com autorização do proprietário.

### Objetivo do MVP
Cadastrar pelo menos uma adega doméstica, fotografar ou buscar vinhos, confirmar sua identidade, guardar uma ou várias garrafas em posições físicas e consultá-las. Exibir histórico, preço investido quando conhecido e estimativa de valor de mercado com transparência.

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

### J2 — Cadastrar vinho por foto
1. Abrir câmera ou enviar foto.
2. IA extrai texto visível: nome, produtor/marca, safra, país/região, uvas indicadas, álcool e volume (campos ausentes = desconhecido).
3. Serviço de catálogo busca correspondências; apresenta sugestão com origem e confiança, inclusive possibilidades semelhantes, **sem inventar safra/uvas**.
4. Pessoa confirma ou corrige dados. Pode trocar para preenchimento manual.
5. Escolher compra nova ou acervo anterior: nova exige preço pago e moeda; acervo anterior permite preço desconhecido.
6. Informar quantidade; receber sugestões de posições e escolher uma posição livre/compatível para cada unidade.
7. Salvar as garrafas e a ficha do vinho; evitar duplicar fichas idênticas.

### J3 — Cadastrar por nome
Pesquisar nome/produtor/safra → escolher correspondência ou criar manualmente → confirmar → informar quantidade, aquisição e posições.

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
| F07 | Identificação por foto e revisão humana | P0 | Dados encontrados/ausentes identificados; edição antes de salvar |
| F08 | Busca textual e cadastro manual | P0 | Garrafa pode ser cadastrada mesmo sem foto/API |
| F09 | Cadastro em lote do mesmo vinho | P0 | Para N unidades, exigir N posições válidas distintas |
| F10 | Sugestão inteligente de posição | P1 | Sugere próximas a vinhos iguais/semelhantes sem bloquear escolha válida |
| F11 | Mover e trocar posições | P1 | Troca validada dos dois lados e registrada atomicamente |
| F12 | Histórico auditável | P1 | Cada movimento e retirada registra data, usuário e origens/destinos |
| F13 | Retirada e avaliação por garrafa | P1 | Histórico e avaliações opcionais; média correta por vinho/safra |
| F14 | Preço pago/valor investido | P1 | Compra nova exige valor+moeda; acervo antigo permite desconhecido |
| F15 | Multimoeda e total em BRL | P1 | Preserva moeda original; com data usa taxa histórica; sem data permite BRL manual |
| F16 | Preços de mercado e estimativas | P1 | Cotação exata preferida; outra safra rotulada; manual como fallback |
| F17 | Atualização semanal de preços | P1 | Job no servidor; substitui valor manual por cotação confiável, mantendo histórico |
| F18 | Total estimado da coleção | P1 | BRL; parcelas de preços exatos e estimados discriminadas; desconhecidos não viram zero |
| F19 | QR/link revogável para visitante sem login | P1 | Somente leitura, acesso não indexado; regeneração/revogação efetiva |
| F20 | Visibilidade dos preços por adega | P1 | Duas chaves independentes: preço pago e preço de mercado, ocultos por padrão |
| F21 | Compartilhamento por convite | P2 | Apenas proprietário emite convite; gerente edita; visitante consulta |

**Nota:** P0 = indispensável para primeira versão utilizável; P1 = extensão para beta completo; P2 = após base estabilizada. Nenhuma integração externa é requisito para conseguir cadastrar manualmente.

## 5. Regras de negócio detalhadas
### Posições
- `position = cellar_id + shelf_id + row_index + column_index` (unívoca). Linha/coluna não podem extrapolar dimensões.
- Acesso concorrente: duas operações não podem ocupar a mesma posição. Usar transação, restrição de unicidade para garrafa ativa e verificação de compatibilidade no servidor.
- Apenas prateleiras **estruturadas** exigem metadados usados na regra. Se uva/país/safra necessário estiver ausente, pedir confirmação antes de selecionar posição.
- Mover/trocar não apaga histórico nem altera dados de aquisição.

### Produto x garrafa
- `Wine`: identidade de vinho/produtor/rótulo e, quando disponível, safra validada.
- `Bottle`: unidade física, posição, status, preço pago, moeda, aquisição e histórico individual.
- Mesmo vinho/safra pode ter N unidades e custos distintos.
- Não confundir vinhos distintos com nomes parecidos; jamais assumir que todo “Bellevue” corresponde ao mesmo produtor ou safra.

### Preços
- Preço de compra obrigatório apenas se cadastro sinalizado **nova compra**. Acervo já existente pode ter preço nulo, não zero.
- Registrar `amount_original`, `currency_original` e `date_of_purchase?`. Com data, usar conversão histórica BRL com fonte e data da taxa; sem data e moeda estrangeira, solicitar `amount_brl_manual`.
- Totais mostrados sempre em BRL; investimento desconhecido deve ser apresentado como **parcial**, com contagem de garrafas sem custo histórico.
- Cotação de mercado automática **semanal** com preço, moeda, safra, loja/fonte, link e data da observação. Não tratar oferta desatualizada como valor de mercado atual.
- Ordem: mesma safra confiável → referência de outra safra rotulada → preço manual rotulado → sem preço. Uma cotação automática confiável pode substituir estimativa manual preservando log.
- Estimativas participam do valor total, porém o painel discrimina percentual/valor estimado; preços de mercado não são promessa de revenda.
- Preço pago e preço de mercado possuem **chaves de visibilidade independentes por adega**, ambas desligadas por padrão para visitantes.

### Permissões
- `OWNER`: configura prateleiras, usuários, QR e privacidade, além de gerir estoque.
- `MANAGER`: pode cadastrar, mover, retirar e avaliar; não emite convites nem muda controles de acesso.
- `VISITOR`: somente leitura; sem conta via link/QR; visitantes convidados com conta continuam sem edição.
- As rotas de API verificam função e propriedade; não depender apenas de esconder botões.

## 6. UX e telas
1. Login/criar conta.
2. Onboarding de adega e prateleiras (modo pequeno/livre ou estruturado).
3. Dashboard: total garrafas, ocupação, valor estimado + parte estimada, busca.
4. Adega visual: grid por prateleira; zoom, filtros, ocupação, posição selecionada.
5. Escanear rótulo: câmera/upload, candidatos, ficha confirmável e seleção de posições em lote.
6. Busca/cadastro manual de vinho.
7. Ficha do vinho: informações, origem dos dados, preço e garrafas/localizações.
8. Histórico: retiradas, avaliações e movimentações.
9. Visitante por link/QR (sem login; preços sujeitos às chaves).
10. Configurações: prateleiras, privacidade, compartilhamento.

**Padrão móvel:** fluxos curtos, botões grandes, navegação fluida no iPhone, sem exigir digitação desnecessária; desktop responsivo.

## 7. Pipeline de reconhecimento (decisão técnica sujeita a benchmark)
1. Foto → endpoint seguro do backend → normalização opcional de imagem.
2. IA visual extrai campos com `valor`, `origem=rotulo`, `certeza`, e deixa `null` quando não legível.
3. Consultar adaptador de catálogo por nome, produtor, país, safra; opcionalmente API especializada de reconhecimento se custo/cobertura justificarem.
4. Fazer *entity resolution*: comparar produtor + marca/linha + denominação + safra, não apenas nome.
5. Montar candidatos com evidências e incompatibilidades. Nunca transformar confiança subjetiva do modelo em garantia.
6. Confirmar com usuário; guardar fornecedor, id externo, campos, fonte, data e eventuais correções.
7. Se fornecedor falhar, cadastro manual continua disponível.

**Adaptadores previstos:** `VisionProvider`, `WineCatalogProvider`, `MarketPriceProvider`, `FXProvider`, sem acoplar o modelo de dados a um único fornecedor.

## 8. Arquitetura proposta
- **Web/PWA:** Next.js + TypeScript, mobile-first, câmera via navegador, instalável no iPhone.
- **Banco e Auth da Fase 1:** Neon Postgres + Neon Auth e Data API, com RLS por proprietário; migrations SQL versionadas e constraints/transações para posições. O navegador recebe apenas o endpoint público do projeto; a connection string privada fica em ferramentas locais de desenvolvimento e nunca no cliente.
- **Backend:** rotas server-side em Next.js quando uma operação precisar de privilégios; jobs de preços separados do tráfego do usuário. O cadastro manual em lote usa função Postgres invoker e continua sujeito a RLS.
- **Fotos:** armazenamento privado de objetos; URLs assinadas quando necessário; limitar tamanho/tipo.
- **Hospedagem:** serviço com HTTPS, tarefas agendadas e banco gerenciado.
- **Segurança e LGPD:** dados de conta privados; QR com token não adivinhável, revogável e não indexado; rate limit na busca/scan, não expor segredos no front; logs sem imagens sensíveis desnecessárias; política clara de envio de fotos a terceiros.

### Entidades principais
`User`, `Cellar`, `CellarMember`, `Invite`, `PublicShareToken`, `Shelf`, `ShelfRule`, `Position`, `Wine`, `WineGrape`, `Bottle`, `BottleMovement`, `BottleRemoval`, `BottleReview`, `PurchaseFX`, `WineExternalMatch`, `MarketQuote`, `MarketPriceRevision`.

## 9. Requisitos não funcionais e qualidade
- Aplicativo utilizável sem API externa graças ao cadastro manual.
- Upload com tratamento de falhas, limites e tentativa segura de repetição.
- Operações concorrentes nas posições devem ser atômicas e auditáveis.
- Índices para pesquisa de vinho/safra/posições; cache de consultas com TTL e respeito aos termos de fornecedor.
- Backups/recuperação do banco e teste de restauração antes do beta externo.
- Acessibilidade básica: contraste, rótulos para leitores de tela, navegação por toque e teclado.
- Observabilidade: taxa de acerto de reconhecimento, latência, custo por scan, cobertura e atualização de preços, falhas de job, posições duplicadas (meta zero).

## 10. Critérios para liberar o beta
- Testar **30–50 rótulos reais**, contendo safras antigas, vinhos brasileiros, nomes genéricos e fotos ruins. Medir top-1/top-3 por vinho+safra (separadamente), metadados e custo.
- Metas *iniciais para validação*, a revisar com testes: ≥85% de identificação correta no top-3 para o conjunto de benchmark; ≥90% leitura correta da safra quando legível; **zero confirmação automática de identidade duvidosa**.
- Cadastro de lote não gera duas garrafas na mesma posição, mesmo com requisições simultâneas.
- Posição incompatível é bloqueada em operação estruturada; modo pequena/livre aceita posição livre.
- Visitante não pode alterar nada mesmo manipulando chamadas HTTP.
- Preço de outra safra nunca aparece como confirmado para a safra exata; valor investido desconhecido não vira R$0.
- Atualização automática semanal registra histórico e não altera preço pago.

## 11. Fora do MVP
- Transferências entre adegas, transporte e recebimento parcial.
- Múltiplas adegas por proprietário na UI.
- Marketplace, compra/venda, integração com e-commerce, carteira digital.
- Recomendações sofisticadas de consumo, sensor de temperatura, sommelier conversacional.
- Treinar do zero um modelo proprietário de visão ou copiar catálogo protegido de terceiros.

## 12. Pontos abertos (não impedem a prova de conceito)
- Definir, com usuários reais, o que caracteriza *adega pequena* e se essa classificação será por capacidade ou escolha explícita.
- Verificar fonte contratável/licença para preços brasileiros por safra. Cobertura não garantida.
- Negociar condições comerciais, retenção/caching e uso de dados dos provedores de catálogo.
- Confirmar hospedagem, armazenamento privado de fotos e jobs agendados antes dessas fases; o benchmark de reconhecimento continua adiado.
- Avaliar se compartilhamento de gerentes/familiares entra no beta inicial ou na entrega seguinte.

## 13. Documentação de referência verificada em 13/11/2026
- WineAPI: https://wineapi.io/ ; https://wineapi.io/docs/ ; https://wineapi.io/data-coverage ; https://wineapi.io/terms
- InVintory Partner API: https://invintory.com/api/
- TinEye WineEngine: https://services.tineye.com/WineEngine
- OpenAI vision API: https://developers.openai.com/api/docs/guides/images-vision

**Princípio de produto:** chegar perto da experiência do Vivino é uma meta de UX e precisão, **não uma promessa de cobertura equivalente** até que um benchmark e contratos sustentem isso.
