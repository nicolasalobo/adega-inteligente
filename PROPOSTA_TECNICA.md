# Proposta técnica — identificação e gestão financeira

**Revisão:** 24/11/2026 · **Status:** proposta de planejamento; sem integrações pagas habilitadas. Preços públicos consultados nesta data e sujeitos a confirmação antes de contratar.

## Recomendação

Manter o scanner EAN-13 existente como primeira tentativa. Um EAN serve para buscar um produto em bases e na web; o código em si não comprova safra, uvas ou região. Quando nenhuma fonte resolver a identidade com segurança, oferecer foto do rótulo e combinar candidatos de reconhecimento especializado ou visão/OCR com a ficha do catálogo. Sempre mostrar fonte e campos desconhecidos, pedir revisão humana e só então salvar.

Separar preço pago de cotação de mercado na unidade física. Exigir o preço pago por garrafa em cada nova compra e armazená-lo na moeda original. Converter valores pagos pela taxa histórica da data de compra, guardando taxa e fonte; se faltar data ou taxa aplicável, aceitar o equivalente em BRL informado manualmente e identificá-lo como tal. Guardar cotações como observações com proveniência, classificar oferta exata verificável como confirmada e o restante como estimado. Atualizar semanalmente, com opção manual, calcular todos os totais financeiros em BRL e ocultar preço pago e mercado por controles independentes. Não contratar nem habilitar provedor antes de medir cobertura brasileira, termos e custo num benchmark de 30–50 vinhos.

## Fluxo integrado proposto

1. **EAN:** validar checksum no scanner atual e consultar primeiro associações locais. Se houver mais de uma safra associada, apresentar todas como ambíguas.
2. **Fontes de EAN e pesquisa web:** consultar base licenciada/aberta permitida; quando necessário, pesquisar o número EAN e o nome do candidato na web. Mostrar links e permitir mais de um candidato. Pesquisa web descobre evidência, não certifica disponibilidade ou preço.
3. **IA para EAN:** se houver candidatos, um modelo pode ordenar e explicar qual é mais compatível com as fontes. Não enviar somente os dígitos para um LLM pedir que adivinhe o vinho. A IA não confirma campo nem grava associação.
4. **Foto quando EAN falhar ou for ambíguo:** capturar frente do rótulo e, opcionalmente, contrarrótulo. Avaliar reconhecimento especializado de vinho e visão/OCR genéricos. Produzir candidatos e extrações para produtor, nome, safra, uva e região.
5. **Fusão com proveniência:** confrontar o que está impresso com os dados do catálogo. Para cada campo, mostrar valor, fonte e certeza; valor que não aparece no rótulo e não tem fonte de catálogo fica desconhecido. Score bruto do fornecedor não é probabilidade de acerto.
6. **Revisão humana:** a pessoa escolhe o candidato, edita os campos e confirma ficha/safra explicitamente. Safra incerta ou conflitante permanece em branco/“não confirmada”; não existe confirmação automática, mesmo quando EAN, foto ou IA parecem concordar.
7. **Cadastro:** somente após confirmação criar/reusar `Wine`, registrar a associação EAN e criar cada `Bottle` em posição livre válida. Se serviço falhar, seguir no cadastro manual.

Proposta de privacidade: processar imagem por rota server-side, limitar tamanho, não expor chave no browser e descartar a foto após resposta por padrão. Retenção opcional de imagem requer decisão específica e consentimento. Respostas externas precisam ser armazenadas só na medida permitida pelo contrato e licença.

## Dados financeiros

- **Preço pago:** obrigatório para cada nova compra, por garrafa e na moeda original. Manter valor e moeda originais, data da compra quando conhecida, loja opcional e nota/comprovante opcional. Não é substituído por cotação e a coleta manual funciona sem integração.
- **Conversão histórica:** preferir cotação histórica diária do Banco Central (PTAX para moedas cobertas), registrar moeda, tipo compra/venda ou regra de conversão, valor, data, identificador/URL e fonte. Se a compra ocorreu em feriado/fim de semana sem taxa daquele dia, definir e exibir uma regra determinística aprovada para o dia útil adjacente; se não houver data/taxa aplicável, permitir informar equivalente em BRL manualmente e marcá-lo. Conservar moeda/valor originais. Nunca estimar uma taxa sem fonte.
- **Observação de mercado:** preço/faixa em moeda de origem, fornecedor, URL, varejista, mercado/país, data/hora, disponibilidade, volume, safra correspondida, taxa e fonte de câmbio, e status `confirmado`, `estimado`, `vencido` ou `sem dado`.
- **Confirmado:** o link permite verificar uma oferta pública atual do mesmo vinho, safra e formato. A classificação prova somente a observação registrada naquele instante, não preço futuro nem autenticidade da garrafa da coleção.
- **Estimado:** média/faixa agregada, estimativa manual, fonte secundária sem oferta atual, outra safra/volume, preço antigo ou correspondência incompleta. Sempre exibir esse status e a diferença de safra quando houver. Uma estimativa manual substituída automaticamente por cotação confiável da mesma safra e formato permanece no histórico, mas deixa de ser o valor atual. Preço de outra safra pode ser referência, nunca confirmado.
- **Desconhecido:** sem fonte, registro vazio, produto sem correspondência ou cotação vencida sem atualização. Não preencher com zero nem usar preço de outra safra sem sinalização.
- **Atualização:** agenda semanal e botão de atualização manual; atualizar por combinação distinta de vinho/safra/formato, não por cada garrafa repetida. Aplicar limites por usuário e cache/TTL conforme licença. Manter snapshots anteriores e exibir “atualizado em”.
- **Total em BRL:** todos os agregados monetários da coleção, incluindo preço pago e mercado, são exibidos em reais. Mostrar preço pago total convertido, mercado confirmado, mercado estimado e unidades sem valor. Explicitar no resumo a composição confirmada/estimada; não somar desconhecidos como zero. Toda conversão conserva valor/moeda originais, taxa, fonte e data, ou identificação de entrada manual em BRL.
- **Privacidade:** controles separados de preço pago e valor de mercado. Ambos começam privados e não aparecem em QR/link público. Apenas servidor filtra a resposta; não basta ocultar valores no componente visual.

Modelo lógico inicial: `BottleAcquisition` (uma aquisição por unidade ou eventos de compra, a decidir no desenho de migration), `WinePriceObservation` (snapshots periódicos por vinho/safra/formato), e `CellarPrivacySettings` (visibilidade independente). O subtotal por unidade usa o valor da garrafa e não multiplica incorretamente apenas pelo agrupamento da ficha de vinho.

## Alternativas e precisão conhecida

| Alternativa | Serve para | Precisão/limites publicados | Posição proposta |
|---|---|---|---|
| Scanner local + Open Food Facts | Ler EAN e consultar ficha comunitária | Cobertura varia; os dois EANs reais registrados em `TESTES_APIS.md` retornaram 404 na consulta. Pode haver obrigações de atribuição/licença. Não determina safra por si só. | Manter como opção de baixo custo, com revisão e fallback web/manual. |
| Busca web por EAN (Brave) + IA de ranking | Encontrar páginas, varejistas ou páginas do produtor relacionadas ao código/candidato | Não há precisão de identificação publicada para vinho. Página encontrada pode ser outra safra/produto ou não estar disponível. IA só pode comparar as evidências retornadas. | Boa etapa complementar; guardar URLs e não tratar snippet como preço confirmado. |
| Barcode Lookup | API comercial genérica de EAN/UPC e produto/loja/preço | Não publica acurácia específica de vinho/safra; parâmetros geográficos divulgados focam US/CA/UK/EU, sem evidência de cobertura forte no Brasil. | Não selecionar como base principal; custo fixo alto para uso doméstico. |
| WineAPI | Busca/catálogo, preço e reconhecimento por foto no mesmo fornecedor | O próprio fornecedor diz que disponibilidade varia, muitos vinhos não têm preço e preços não são necessariamente ofertas atuais; não publica acurácia independente. Pro inclui reconhecimento por foto; isso não garante cobertura. | Candidato de piloto por custo público baixo; validar vinhos brasileiros, safra e licença. |
| InVintory Partner API | Reconhecimento visual especializado e catálogo de vinhos | A API divulga produtor, safra, região e correspondências; o `score` de exemplo não é acurácia calibrada. Sem taxa de sucesso independente publicada. Preço e acesso de parceiro são sob consulta. | Solicitar acesso/preço de avaliação e medir cobertura real. |
| TinEye WineEngine | Correspondência visual de rótulo, safra e variedade | O fornecedor afirma detectar safra/variedade e lidar com fotos difíceis; não publica benchmark independente. Requer coleção própria de imagens de referência. Starter: US$ 200/mês, 1.000 buscas/mês, até 5.000 imagens; excedentes publicados de US$ 0,01/busca e US$ 0,01/imagem/mês. | Medir precisão/cobertura; exigência de curadoria própria e custo mínimo reduzem adequação a adega pessoal. |
| Google Cloud Vision OCR | Transcrever texto visível no rótulo | OCR detecta texto, não valida identidade, safra ou uvas. Acurácia depende de imagem/idioma/rótulo. | Componente simples e barato de extração; combinar com catálogo e revisão. |
| Gemini/OpenAI visão | Extrair texto/campos, comparar candidatos e devolver JSON | Nenhum modelo genérico é catálogo de vinhos ou fonte de verdade. Pode produzir dado plausível mas falso. Não usar para confirmar safra, origem ou uvas sem evidência citável. | Comparar no benchmark; retornar `null` quando a imagem/fonte não sustentar o campo. |
| Wine-Searcher Data API | Preços agregados e ofertas/listagens de varejistas | API voltada a preço e comerciantes, não reconhecimento visual. Cobertura de varejo brasileiro e por safra da coleção precisa ser medida. | Referência de preço potencialmente rica; solicitar cotação e trial atuais antes de considerar o plano. |

**Não há número confiável de precisão hoje.** Os testes existentes são dois rótulos e consultas de nome/EAN, não constituem benchmark visual. Valores de “score” e alegações dos fornecedores precisam ser tratados como alegações até medir top-1/top-3 e erro de safra em fotos próprias com verdade de referência.

## Custos estimados de identificação

Preços publicados consultados em **24/11/2026**, em USD, antes de impostos, câmbio, armazenamento, retries e suporte. “Identificação” para busca significa uma chamada por EAN; para visão significa uma imagem e um JSON curto. São estimativas de custo de API, não precisão comprovada. Confirmar as tarifas antes da contratação.

Taxa ilustrativa de conversão: **US$ 1 ≈ R$ 5,93 em 23/11/2026**. É só para comparar orçamento; não é a taxa que o aplicativo deve aplicar. Custo real em BRL depende da taxa e do spread na cobrança.

| Serviço / hipótese | Base publicada | 100 ident./mês | 1.000 ident./mês | Observação |
|---|---:|---:|---:|---|
| Brave Search API, 1 consulta EAN | US$ 5/1.000 consultas = US$ 0,005 por busca | US$ 0,50 (≈R$ 2,97) | US$ 5 (≈R$ 29,66) | Exclui eventual chamada adicional e custo de modelo; resultado de busca não é verificação de oferta. |
| Gemini 3.8 Flash, foto + saída curta | US$ 0,75/M tokens de entrada e US$ 3,75/M de saída até 31/12/2026; hipótese 1–5 mil tokens de entrada e 200 de saída por foto | US$ 0,15–0,45 (≈R$ 0,89–2,67) | US$ 1,50–4,50 (≈R$ 8,90–26,69) | Estimativa calculada; resolução, raciocínio, segunda foto e retries alteram a fatura. Tarifas publicadas dobram para US$ 1,50/M entrada e US$ 7,50/M saída em 01/01/2027. |
| OpenAI GPT-6.2 Sol com visão, foto + JSON | US$ 2/M tokens de entrada e US$ 10/M de saída; hipótese 1–5 mil tokens de entrada e 200 de saída por foto | US$ 0,40–1,20 (≈R$ 2,37–7,12) | US$ 4–12 (≈R$ 23,72–71,16) | Estimativa por tokens; custo de imagem varia conforme resolução/patches e saída. Confirmar com a calculadora oficial. |
| Cloud Vision Text Detection, OCR por imagem | 1.000 unidades/mês grátis; depois US$ 1,50/1.000 = US$ 0,0015/imagem | US$ 0 até 1.000 unidades na conta | US$ 0 até 1.000 unidades na conta | Só transcreve; não identifica o vinho. Acima do nível gratuito, 1.000 imagens adicionais custam US$ 1,50. |
| WineAPI Supporter, catálogo comercial | US$ 25/mês, até 250 requisições/dia | efetivo US$ 0,25/consulta se usar 100/mês | US$ 0,025/consulta se usar 1.000/mês | Inclui licença de uso empresarial; não inclui reconhecimento por imagem. Cobertura de preços continua limitada. |
| WineAPI Pro, catálogo + foto | US$ 100/mês, até 1.000 req./dia | efetivo US$ 1,00/identificação a 100/mês | US$ 0,10/identificação a 1.000/mês | Inclui reconhecimento de rótulo e histórico de preços limitado. Plano fixo, não tarifa unitária; acesso não garante que haja registro para cada vinho. |
| InVintory Partner API | Preço personalizado; contato comercial | Sob consulta | Sob consulta | Sem custo por scan público. Exigir avaliação, cobertura Brasil e licença em proposta. |
| TinEye WineEngine Starter | US$ 200/mês, 1.000 buscas/mês, até 5.000 imagens; excedentes US$ 0,01/busca e US$ 0,01/imagem/mês | US$ 2,00/identificação a 100/mês | US$ 0,20/identificação a 1.000/mês | Requer a coleção própria de imagens de rótulo; custos de curadoria não incluídos. |

## Custos estimados para cotações de mercado

Uma consulta de preço não é uma identificação visual. O cenário semanal assume uma busca por combinação distinta de vinho+safra+formato, reaproveitada entre garrafas idênticas: 100 combinações geram aproximadamente 433 chamadas/mês (100 × 52 ÷ 12); 1.000 geram 4.333. Isso exclui tentativas repetidas, abertura/verificação de páginas e custos de extração.

| Fonte | Preço público e custo efetivo aproximado | Cobertura/risco |
|---|---|---|
| Wine-Searcher Data API | Formulário público antigo lista US$ 250–260/mês para 500 chamadas/dia (revisão de 2018; não é preço vigente). Como ordem de grandeza: esse valor equivaleria a ~US$ 0,58 por atualização a 433 chamadas/mês ou ~US$ 0,06 a 4.333; pedir cotação e trial atuais. | Potencialmente oferece preços/listagens de comerciantes; custo/preço atual e disponibilidade exigem confirmação comercial. Testar vinhos/safras brasileiras e termos de armazenamento. |
| WineAPI Supporter/Pro | US$ 25/mês ou US$ 100/mês, compartilhando quota com demais chamadas. | Mais acessível para piloto comercial, mas o fornecedor declara que muitos registros não têm preço e que os valores não são necessariamente ofertas atuais. |
| Pesquisa web (Brave) | US$ 5/1.000 requisições. Frequência semanal: 433 chamadas/mês ≈US$ 2,17; 4.333 ≈US$ 21,67, antes dos US$ 5 em créditos mensais que o fornecedor publica para contas elegíveis. | Baixo custo de descoberta, mas cada oferta exige conferir comerciante, safra, formato, disponibilidade, moeda e data. Resultado/snippet não confirma cotação. |

**Regra de investimento:** primeiro medir cobertura de 30–50 vinhos reais e quantas cotações são exatas no Brasil. Pesquisa web pode ter custo variável baixo, mas exige validação manual e não confirma preço sozinha. Planos fixos de WineAPI/TinEye/Wine-Searcher podem custar US$ 25–200+/mês e não garantem cobertura do inventário; exigir proposta/licença e benchmark. Não ativar integrações pagas nesta etapa.

## Plano de benchmark e decisão

1. Fixar o conjunto de 30–50 vinhos/EANs e fotos e anotar verdade de referência por fonte confiável (produtor, contra-rótulo, comprovante/garrafa); variar país, safra, luz, ângulo e similaridade de nomes.
2. Para EAN, comparar associação local, Open Food Facts, uma busca web e base comercial genérica; verificar se o código muda por safra e se uma mesma associação local retorna anos conflitantes.
3. Para foto, comparar WineAPI Pro, InVintory e, se custo permitir, WineEngine com OpenAI/Gemini+OCR. Nenhum fornecedor é presumido vencedor antes dos resultados.
4. Medir exatidão top-1/top-3 do vinho, acerto exato de produtor/nome/safra, precisão e cobertura de uva/região, confiança mal calibrada, falsos positivos, latência, taxa de correção humana, custo por ficha concluída e preço com oferta verificável no Brasil.
5. Para valuation, comparar URL, safra, formato, disponibilidade, data, moeda e faixa de preço em cada fonte. Não usar preço de safra diferente como confirmado.
6. Aprovar por escrito orçamento, retenção/caching, licença e privacidade da foto/dados. Se os custos ou a cobertura falharem, manter o cadastro manual, captura de preço pago e cotações como desconhecidas.

## Referências consultadas

- [WineAPI: planos, reconhecimento e preço](https://wineapi.io/) · [cobertura e limites dos preços](https://wineapi.io/data-coverage) · [documentação](https://wineapi.io/docs/) · [termos de uso](https://wineapi.io/terms).
- [InVintory Partner API](https://invintory.com/api/) — endpoint `scan-image`, campos de exemplo, catálogo e preço sob consulta.
- [TinEye WineEngine](https://services.tineye.com/WineEngine) — reconhecimento, preços e limites publicados.
- [Wine-Searcher Data API](https://www.wine-searcher.com/trade/api) — cotações; solicitar condições atuais. O [formulário público de pedido](https://www.wine-searcher.com/images/for-trade/WS-3-API-Order-2.pdf) tem revisão de 2018 e serve apenas como referência histórica de preço.
- [Brave Search API pricing](https://api-dashboard.search.brave.com/documentation/pricing) e [Barcode Lookup API](https://www.barcodelookup.com/api).
- [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing) — Text Detection.
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) e [OpenAI pricing](https://developers.openai.com/api/docs/pricing) / [image input guide](https://developers.openai.com/api/docs/guides/images-vision) / [image cost calculator](https://developers.openai.com/api/docs/guides/image-cost-calculator).
- [Banco Central do Brasil — dados PTAX diários e API OData](https://dadosabertos.bcb.gov.br/dataset/taxas-de-cambio-todos-os-boletins-diarios) — fonte candidata para conversão histórica, respeitando calendário e moedas disponíveis.
- [USD/BRL histórico de 23/11/2026](https://wise.com/us/currency-converter/usd-to-brl-rate/history) — conversão somente ilustrativa.
