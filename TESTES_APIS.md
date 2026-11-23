# Guia prático para testar APIs de vinhos

**Data das informações:** 13/11/2026. Preços e condições podem mudar.  
**Situação atual (17/11/2026):** fluxo ponta a ponta concluído no app local autenticado: cadastro manual, busca WineAPI, revisão de ficha, cadastro em lote, reuso da ficha existente e persistência após recarregar. Os registros temporários de validação foram removidos. Reconhecimento por foto está fora do escopo das fases 1 e 2 por custo. Preços e cotações de vinhos permanecem apenas como informação de pesquisa sobre APIs e não fazem parte do produto.

## Atualização — identificação EAN (18/11/2026)

Implementação de Fase 2 em `codex/fase-2-identificacao`; o núcleo foi validado em Neon real conforme abaixo. O `@zxing/browser` já faz parte do app e EAN-13 é validado com checksum. `npm run test:identification` passou com 7 testes que cobrem checksum, fonte encontrada/ausente/ambígua, falhas, ordem do pipeline e seleção restrita a candidatos. `npm run test:ui-identification-local` automatiza Chromium contra servidor local sem endpoint Neon nem chamadas externas: checksum inválido, consulta desabilitada sem autenticação, abertura/cancelamento do scanner e encerramento da track de mídia, cadastro manual e persistência após recarga.

`npm run test:migrations:local` cria um PostgreSQL 16 descartável via Docker, aplica migrations 0001–0007 em ordem e valida associação EAN, RPC atômico, RLS entre duas contas de teste, múltiplas safras, retries, erros e quotas. O teste simula `auth.uid()` e `neon_auth.user`; ele não valida Neon Auth/Data API nem substitui uma branch Neon isolada.

`npm run test:identification:live` fez GET real ao Open Food Facts v3 (sem autenticação) e recebeu HTTP 404 sem ficha para `7892500022445` e `8436559528924`. O EAN `7892500022445` tem correspondência exata a Panul Carménère 750 ml em [Atacadão](https://www.atacadao.com.br/vinho-chileno-panul-carmenere-garrafa-com-750ml-82045/p) e tabela oficial de compras do [Diário Oficial MS](https://assets.imprensaoficial.ms.gov.br/public/prd/Diario%20Oficial/2026/04/06/DO12118_06_04_2026_SUP_1.pdf). Para `8436559528924`, um [diretório de códigos](https://barcode-list.ru/barcode/RU/%D0%9F%D0%BE%D0%B8%D1%81%D0%BA.htm?barcode=SAUVIGNON) aponta Montecruz Cabernet Sauvignon e o [produtor oficial](https://bodegasfernandocastro.com/en/wines/montecruz-cabernet-sauvignon/) confirma o produto e a uva, mas não vincula o EAN; trate como sugestão a confirmar no rótulo.

WineAPI não foi chamada pela nova integração: apesar de haver variável de chave no `.env.local`, `ENABLE_WINEAPI_IDENTIFICATION` permanece false e os termos publicados limitam o plano gratuito ao uso pessoal não comercial. Brave Search e OpenAI estão sem chaves/flags; nenhum custo foi incorrido. O conector Open Food Facts não armazena cache. Reutilizar suas respostas requer revisão de atribuição, ODbL/Database Contents License e adequação de uso comercial. Pesquisa web é via Brave opt-in; preço atual publicado é US$ 5/1.000 buscas após créditos elegíveis. O pipeline OpenAI usa saída JSON estruturada e não foi testado ao vivo.

## Validação Neon real da Fase 2 — 18/11/2026

O projeto de teste identificado no Neon Console foi `adega-fase1-validacao` (`soft-mode-37622581`), fonte `fase1-migracoes` (`br-divine-math-bekaxx31`). Criamos a branch isolada `fase2-identificacao-validacao-20261118` (`br-round-thunder-be945fsj`), que expira em 19/11/2026 às 20:24 BRT. Antes de qualquer criação de conta/dado de teste, conferimos projeto, branch, endpoint, parent e `neon.branch_id` no SQL Editor; não usamos o endpoint indicado pelo `.env.local` desta worktree. Nenhuma operação foi executada em produção.

A migration `0007_intelligent_wine_identification.sql` foi executada uma vez em transação protegida por verificações de branch/projeto, presença exata das migrations 0001–0006 e ausência de 0007. `auth` e `neon_auth` gerenciados foram preservados. Depois, o histórico registrou 0001–0007; foram verificados RLS, policy de leitura, RPCs de registro/quota e grants: a role `authenticated` lê suas associações, não faz insert direto nelas e não lê a tabela privada de quota.

`npm run test:identification:neon` criou duas contas Neon Auth aleatórias, adegas e prateleiras separadas pela Data API. Passaram: sessão/JWT; leitura cruzada negada nas duas direções; escrita em adega de outra conta negada; associação de `7892500022445` a duas fichas/safras; resolução do EAN confirmado pela rota antes do Open Food Facts, com as duas safras apresentadas como ambíguas; escrita direta de associação bloqueada; checksum inválido negado; tentativa em posição ocupada deixou zero vinho/associação parcial; RPC atômico criou a garrafa e associação na mesma transação. Quotas sequenciais passaram: teto global 30 chamadas por usuário/hora, até 5 chamadas de foto e 5 de IA, com isolamento entre contas. A tabela de quotas é invisível para usuários autenticados.

O Playwright usou Chrome instalado em contexto temporário, sem reutilizar ou alterar a sessão autenticada do Neon Console: login da conta de teste, entrada manual do EAN, consulta de associação já confirmada, duas safras exibidas, revisão da ficha, escolha da posição, salvamento, recarga e confirmação visual da posição. Consultas à Data API após o reload confirmaram três garrafas ativas (duas criadas via RPC + uma pela interface) e as duas associações continuaram persistidas. OpenAI, Brave e WineAPI estavam desligadas; a rota retornou somente a fonte `cellar` para o EAN associado e não iniciou a etapa Open Food Facts.

Uma verificação adicional disparou 40 chamadas de quota em paralelo em outra conta: 9 foram aceitas/contabilizadas e 31 recusadas. A quota não ultrapassou o limite, mas recusou antecipadamente sob burst; a causa ainda não foi isolada. Os testes sequenciais de cada subteto passaram. Esse comportamento conservador é uma pendência de concorrência/disponibilidade, não evidência de bypass.

O teste Neon também encontrou um defeito de cliente server-side: `@neon/neon-js/supabase` exige uma sessão configurada e não usa um `Authorization` global como sessão. O servidor validava o JWT, mas o RPC da quota falhava com `AuthRequiredError` (503). Foi corrigido usando `createClient` do `@neon/neon-js` em modo de autenticação externa, com token fornecido por função. O teste real passou após a correção.

Os registros de teste permanecem apenas na branch descartável e expiram junto com ela. O teste não valida chamadas comerciais externas. WineAPI, Brave e OpenAI permanecem desligadas; Open Food Facts foi consultado ao vivo anteriormente e retornou 404 para ambos os EANs.

## Validação da Fase 3 — 23/11/2026

- As migrations `0008_require_bottle_review_rating.sql` e `0009_distinguish_swap_history.sql` foram aplicadas à branch temporária `codex-fase3-validation-20261123` (`br-fancy-mode-be8k6bgd`), criada no projeto Neon `adega-fase1-validacao` a partir da branch isolada anterior. Antes da 0008, havia 0 avaliações legadas sem nota; depois, o histórico continha 0001–0009, `bottle_reviews.rating` estava `NOT NULL` e `swap` estava permitido como tipo de evento. A branch expira em 24/11/2026 às 10:37 BRT. A conexão definida em `web/.env.local` e qualquer branch de produção não foram alteradas.
- Blocos SQL isolados no Neon verificaram JWT/propriedade e os RPCs de movimento, troca e retirada; conflito de posição, dimensões inválidas, posição idêntica, regra de prateleira estruturada e troca incompatível foram rejeitados. Também foram conferidos liberação da posição, data/motivo/responsável da retirada, quatro eventos de histórico, dois eventos explicitamente do tipo `swap`, preservação das garrafas/posições, limite de nota, rejeição de nota nula e médias 4,5 para a safra 2020 e 2,0 para 2021. Os dados temporários foram removidos nos próprios blocos.
- `npm run test:phase3:ui-local` passou em Chromium: movimento, troca identificada como troca no histórico, avaliação com comentário, média, retirada, responsável e histórico após reload; sem chamadas externas. Lint, os sete testes de identificação e `test:ui-identification-local` também passaram. Build de produção passou sob Node 24.22.3.
- O Vercel Preview tem um endpoint público de Neon configurado apenas para esta branch e apenas no alvo Preview. O primeiro deployment iniciou antes dessa configuração e carregou o modo local; um novo deployment é necessário para incorporar a variável pública no build.
- A validação de migrations local (`npm run test:migrations:local`) não pôde ser executada porque o Docker Desktop/daemon não estava disponível. O E2E autenticado via Data API/Preview ainda precisa ser executado após a criação do Preview para a branch desta entrega. Nenhuma alteração foi publicada em produção.

## Resultado inicial da busca textual WineAPI
- Quara Estate Malbec 2016: a busca trouxe Quara Estate, Malbec, Cafayate. A ficha carregou Argentina e Cafayate, mas não informou safra nem uvas; portanto, não confirma que seja a safra 2016.
- Quara Estate Malbec 2016 (revalidação): a WineAPI retornou 10 candidatos. A ficha de “Quara Estate, Malbec, Cafayate” carregou nome, produtor, país e região; a própria API não forneceu safra nem uva para esse registro.
- Bellevue Bordeaux 2020: a busca trouxe vários candidatos, incluindo Chateau Bellevue La Randee e Chateau Bellevue Lugagnac Blanc. Nenhum foi selecionado, pois o nome sozinho não confirma a identidade do rótulo.
- A busca funciona como localizador de candidatos. A ficha permanece editável e a pessoa precisa confirmar a identidade antes de cadastrar. No teste E2E, duas unidades do mesmo vinho foram agrupadas na ficha existente; a adega foi recarregada para confirmar persistência e os dados de teste foram removidos depois.

## Resumo da decisão
- **WineAPI:** começar por busca de nome, ficha de vinho e preços. O plano Free oferece 100 requisições/dia para uso pessoal **não comercial**; identificação por foto é anunciada no Pro (US$ 100/mês). Preços têm cobertura limitada, e um vinho encontrado pode não ter cotação.
- **InVintory Partner:** API especializada com reconhecimento via foto, catálogo divulgado de 1,5M+ rótulos e documentação de `scan-image`; exige acesso de parceiro/contrato, preço mediante consulta.
- **TinEye WineEngine:** sandbox usa biblioteca fixa de rótulos. Seu uso real exige que **você forneça sua própria coleção de imagens de rótulos**; não entrega catálogo de preços pronto. Starter anunciado a US$ 200/mês. Não contratar antes de justificar.
- **OpenAI visão:** extrai campos do rótulo, mas NÃO confirma sozinho que o produto existe, que a mistura de uvas é correta ou que o preço encontrado corresponde à mesma safra.

## As 2 imagens reais do teste
- `amostras/quara_2016.jpeg` — Quara Estate Malbec, 2016, Vale de Cafayate, Argentina, 750ml, 12,5%. Valores visíveis no rótulo.
- `amostras/bellevue_2020.jpeg` — Bellevue Bordeaux, 2020, França, Bordeaux AOC, 750ml, 13,5%; rótulo inferior menciona SARL Dabudyk (engarrafamento). **Uvas não legíveis no rótulo**: exigir validação externa, não assumir.

Essas duas imagens não são benchmark suficiente para alegar qualidade equivalente à de aplicativos consolidados. Acrescentar 30–50 vinhos, especialmente rótulos parecidos, safras antigas e nacionais.

## Passo 1 — Testar WineAPI (sem mandar fotos)
1. Criar conta em https://wineapi.io/ e obter a chave da API; verificar condições do plano para seu teste.
2. Conferir documentação: https://wineapi.io/docs/.
3. Para testar sem programar, executar no terminal (macOS/Linux; substitua a chave localmente):

```bash
curl -G 'https://api.wineapi.io/wines/search' \
  --data-urlencode 'q=Quara Estate Malbec 2016' \
  --data-urlencode 'limit=10' \
  -H 'X-API-Key: SUA_CHAVE_AQUI'

curl -G 'https://api.wineapi.io/wines/search' \
  --data-urlencode 'q=Bellevue Bordeaux 2020' \
  --data-urlencode 'limit=10' \
  -H 'X-API-Key: SUA_CHAVE_AQUI'
```

4. Examinar `results[].id`, nome, `vintage`, região, país. **Não aceitar um resultado errado apenas por compartilhar o nome.**
5. Para cada `id` encontrado, `GET /wines/{id}` e `GET /wines/{id}/prices`; conferindo o ano, a moeda, a loja, `fetchedAt` e o link.
6. Atenção: a documentação aberta lista busca e identificação por texto e a página comercial anuncia `POST /identify/image`; confirme o método/esquema efetivo no seu acesso antes de pagar Pro. Não presumir que a rota de imagem está liberada na chave Free.

## Passo 2 — Solicitar teste à InVintory
- Página: https://invintory.com/api/
- Contato: support@invintory.com
- Perguntar: acesso de avaliação à `scan-image`, limite de testes, preço por scan/mês, cobertura de Brasil/Argentina/França, safra exata, direitos de armazenar/exibir dados em um SaaS comercial e possibilidade de retorno de preços no Brasil.
- A documentação pública mostra este endpoint. Com chave de parceiro válida:

```bash
curl -X POST 'https://api.invintorywines.com/partners/v1/wines/actions/scan-image' \
  -H 'x-api-key: SUA_CHAVE_AQUI' \
  -F 'image=@amostras/quara_2016.jpeg' \
  -F 'scan_id=quara-2016-teste'
```

Repetir com `amostras/bellevue_2020.jpeg` e `scan_id=bellevue-2020-teste`. Verificar lista `results`, `resolution`, `year`, produtor e posição do candidato correto. Não apresentar `score` bruto como probabilidade calibrada de acerto.

## Passo 3 — Testar leitura de foto com OpenAI
- Documentação: https://developers.openai.com/api/docs/guides/images-vision
- Uma IA de visão deve responder com campos extraídos e `null` para o que não aparece. A validação da identidade ocorre **depois**, no catálogo.
- Arquivo `scripts/testar_apis.py` contém comando opcional de extração para as duas fotos via OpenAI API.

## Executar o kit com um comando por vez
**Requisitos:** Python 3.10+; chave correspondente e acesso contratado quando necessário. Sem chaves, o script não envia fotos e informa o que falta.

1. Na pasta do kit, instalar dependências:

```bash
python -m pip install -r requirements.txt
```

2. Copiar `.env.example` para `.env` e preencher somente as chaves que possui. **Nunca envie esse arquivo ao GitHub**.
3. Rodar as buscas:

```bash
python scripts/testar_apis.py wineapi-search --all
```

4. Com chave InVintory:

```bash
python scripts/testar_apis.py invintory-scan --all
```

5. Com chave OpenAI:

```bash
python scripts/testar_apis.py openai-vision --all
```

Saídas em `resultados/` para comparação. Os comandos e caminhos são equivalentes no PowerShell do Windows quando `python` estiver instalado (pode usar `py` no lugar de `python`).

## Métricas a preencher
| Foto | Provedor | Nome+produtor corretos? | Safra correta? | Uvas confirmadas? | País/região? | Preço da safra exata? | Preço BR? | Tempo (s) | Custo | Observações |
|---|---|---|---|---|---|---|---|---|---|---|
| Quara 2016 | | | | | | | | | | |
| Bellevue 2020 | | | | | | | | | | |

### Regra de avaliação
- **Acerto completo** = produtor/linha/safra exatos.
- **Acerto parcial** = nome correto, safra ausente ou outra safra; não conta como identificação exata.
- **Falso positivo** = vinho ou produtor diferente apresentado como confirmado; pior que admitir desconhecido.
- **Preço bom** = oferta verificável com fonte, safra exata, moeda e data recentes. Outra safra entra apenas como referência estimada.
- Monitorar % das garrafas sem preço; não preencher com suposição.

## Links e limites de licença
- WineAPI preços/limitações: https://wineapi.io/ e https://wineapi.io/data-coverage
- WineAPI termos: https://wineapi.io/terms — plano grátis apenas para uso pessoal, não comercial. **Antes de tornar seu app comercial, contratar licença adequada.**
- InVintory: https://invintory.com/api/
- WineEngine: https://services.tineye.com/WineEngine
- OpenAI: https://developers.openai.com/api/docs/guides/images-vision
