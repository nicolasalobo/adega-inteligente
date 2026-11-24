# Guia prático para testar APIs de vinhos

**Data da revisão de provedores:** 24/11/2026. Preços e condições podem mudar.
**Situação:** as Fases 1–2 estão integradas. A Fase 3 foi implementada e validada no PR #9, que aguarda integração; veja abaixo o resultado e os testes/gates pendentes. Gestão financeira e reconhecimento por foto fazem parte do escopo e estão planejados nas Fases 4–5. Esta documentação é pesquisa; não ativa nem implementa integrações pagas. Proposta, limites e estimativas estão em [PROPOSTA_TECNICA.md](PROPOSTA_TECNICA.md).

## Decisão atualizada — 24/11/2026
- O scanner EAN-13 já implementado permanece a primeira opção. Pode usar catálogo e pesquisa web para localizar candidatos, com IA apenas como apoio à ordenação/explicação; EAN sozinho não identifica safra e nenhuma sugestão é salva sem revisão humana.
- Foto do rótulo é uma alternativa complementar quando EAN falha ou é ambíguo. Avaliar produtor, nome, safra, uva e região por proveniência/campo; não inventar campo ilegível nem confirmar safra incerta automaticamente.
- Cada nova compra exige preço pago por garrafa na moeda original. Usar conversão histórica por data da compra e fonte/taxa; se faltar data ou taxa, aceitar equivalente em BRL informado manualmente e marcar como tal. Todos os totais são em BRL.
- Cotações de mercado atualizam semanalmente, com atualização manual. Sem cotação, permitir estimativa manual identificada; substituir o valor atual quando surgir cotação confiável da mesma safra e formato, preservando histórico. Outra safra é sempre estimada e identificada.
- O resumo separa valor confirmado, estimado e sem cotação; preço pago e valor de mercado têm privacidade independente.
- O benchmark de duas fotos e buscas reais existentes não demonstra precisão geral. Não escolher fornecedor até avaliar 30–50 vinhos, custo real e cobertura brasileira.
- Seguem desligados os provedores comerciais e os testes que exigem cobrança. Os preços informados no documento de proposta são estimativas públicas de 23/11/2026, não uma autorização de contratação.

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

## Validação da Fase 3 / PR #9 — atualização 24/11/2026

- As migrations `0008_require_bottle_review_rating.sql` e `0009_distinguish_swap_history.sql` foram verificadas na branch temporária `codex-fase3-validation-20261123` (`br-fancy-mode-be8k6bgd`) do projeto Neon `adega-fase1-validacao`. O SQL Editor confirmou `neon.branch_id` correto, 9 migrations registradas, `bottle_reviews.rating NOT NULL` e o tipo de histórico `swap`. A expiração estava agendada para 24/11/2026 às 10:37 BRT; esse horário já passou e o status atual da branch não pôde ser confirmado nesta revisão. Para qualquer nova validação remota, criar branch Neon isolada nova e conferir `neon.branch_id` antes de escrever. Nenhuma migration ou escrita foi feita em produção, e `.env.local` não foi usado para conexões de teste.
- `npm run test:migrations:local` aplicou em PostgreSQL 16 descartável as migrations 0001–0009 e aprovou EAN, cadastro/RPC atômico, regras e dimensões, unicidade, movimento, troca, retirada, histórico, ratings/médias por safra e RLS simulado. Executado novamente em 24/11; passou e removeu o container temporário. O daemon Docker foi iniciado localmente para esse teste.
- `npm run lint` e `npm run build` passaram em 24/11 no código da Fase 3 do PR #9.
- O head `7c5fdde7ed72c3f4446750a77cafbdd9550112f1` do PR #9 registra como check externo apenas `Vercel Preview Comments`, concluído com sucesso e sem feedback pendente; não há check de CI automatizado para lint, build ou migrations. Os três foram executados localmente nesta revisão.
- `npm run test:phase3:preview` passou na interface publicada (`adega-inteligente-nhsx8wu08…`, deployment `4d2c4ff`) conectada ao Neon descartável. O estado funcional em `web/src` é o mesmo do head atual do PR; os commits posteriores nesse intervalo alteram documentação/testes, não o app.
- O Preview atualizado no commit `ed79638` também ficou `READY`, mas repetir o cadastro de conta nele retornou `INVALID_CALLBACK_URL`/`INVALID_ORIGIN`: o hostname novo ainda não consta na allowlist de Auth da branch Neon. O deployment anterior (`4d2c4ff`) usa a origem já autorizada e passou o E2E integral; `web/src` é idêntico entre os dois. Uma repetição no hostname novo exige acrescentá-lo à allowlist da branch Neon descartável. Os previews dos commits documentais `b88ae77` (`k5bfwwjvz…`) e `a2daef3` (`r7zexnsuj…`) ficaram `READY`; a suíte não foi repetida neles porque esses commits só alteram documentação e a allowlist segue sem o alias estável da branch.
- Resultado por fluxo no Preview: cadastro de seis garrafas em duas safras; movimento válido persistido; movimento para categoria incompatível recusado sem evento; troca com duas posições invertidas e dois eventos `swap`; notas 1–5 com médias 3,0/5 (cinco notas da safra 2022) e 5,0/5 (uma da safra 2021); duas RPCs simultâneas disputando uma posição, com uma aceita e uma recusada; retiradas com e sem motivo, data, responsável e slot livre; reutilização do slot; histórico de seis eventos visível depois de recarregar.
- RLS foi testado com duas contas Neon Auth reais: a segunda conta não leu a adega, prateleiras, vinhos, garrafas, avaliações nem histórico da primeira; tentativa cruzada de movimento e avaliação foi recusada. O Data API confirmou `actor_id`, `removed_at`, motivos opcionais, ratings e posições persistidas. O E2E removeu suas adegas/dados no `finally`; contas e um conjunto de dados de uma execução manual anterior permanecem somente na branch descartável até sua expiração.
- A validação local de UI também cobriu histórico com movimentos, troca, retiradas, responsável, motivo e avaliações. No histórico anterior passaram `npm run test:phase3:ui-local`, `npm run test:identification` (7/7) e `npm run test:ui-identification-local`; cadastro manual, scanner EAN-13/cancelamento de câmera e layout mobile continuaram cobertos sem chamadas externas.
- A validação remota usou a implantação Preview publicada; a única dificuldade foi Deployment Protection e foi resolvida com link de compartilhamento temporário de 23 horas, sem reduzir a proteção do projeto. Nenhuma alteração foi publicada em produção. A Fase 4 (gestão financeira) não foi iniciada.

### Preflight e recuperação para integração em produção

Não executar as migrations diretamente em produção antes de completar todos os passos abaixo:

1. Registrar um ponto de restauração/backup Neon e provar a restauração em uma branch isolada; confirmar projeto, branch e `neon.branch_id` pelo console/SQL, sem confiar apenas em variáveis locais.
2. Comparar `schema_migrations` e o schema do destino com o esperado: migrations 0001–0007 presentes na ordem e constraints/tabelas usadas por 0008–0009 existentes. Antes da 0008, verificar `SELECT count(*) FROM bottle_reviews WHERE rating IS NULL;`; o resultado precisa ser zero, pois a constraint restaura `rating NOT NULL` e bloqueia avaliações antigas apenas com comentário. Resolver dados somente com decisão de produto auditada, nunca atribuir nota arbitrária.
3. Aplicar 0008 e depois 0009 separadamente pelo runner versionado, conferir commit/ledger e constraints após cada uma, e fazer smoke test autenticado de nota, movimento, troca e histórico. Parar imediatamente em qualquer divergência ou erro.
4. Se falhar antes de seguir, usar o ponto de restauração/PITR para recuperar a branch-alvo e validar a recuperação; não improvisar migration reversa, pois 0008 impõe requisito de dados e 0009 altera constraints/tipo de movimento. Repetir em ambiente isolado antes de uma nova janela de produção.

Este procedimento é um gate futuro, não autorização para aplicar migrations. A revisão atual não acessou nem alterou produção.

## Resultado inicial da busca textual WineAPI
- Quara Estate Malbec 2016: a busca trouxe Quara Estate, Malbec, Cafayate. A ficha carregou Argentina e Cafayate, mas não informou safra nem uvas; portanto, não confirma que seja a safra 2016.
- Quara Estate Malbec 2016 (revalidação): a WineAPI retornou 10 candidatos. A ficha de “Quara Estate, Malbec, Cafayate” carregou nome, produtor, país e região; a própria API não forneceu safra nem uva para esse registro.
- Bellevue Bordeaux 2020: a busca trouxe vários candidatos, incluindo Chateau Bellevue La Randee e Chateau Bellevue Lugagnac Blanc. Nenhum foi selecionado, pois o nome sozinho não confirma a identidade do rótulo.
- A busca funciona como localizador de candidatos. A ficha permanece editável e a pessoa precisa confirmar a identidade antes de cadastrar. No teste E2E, duas unidades do mesmo vinho foram agrupadas na ficha existente; a adega foi recarregada para confirmar persistência e os dados de teste foram removidos depois.

## Resumo de alternativas
- **WineAPI:** plano Free (100 req./dia) é somente pessoal/não comercial; Supporter custa US$ 25/mês e declara licença empresarial; Pro custa US$ 100/mês, inclui identificação por foto e histórico de preços limitado. O fornecedor adverte que preços podem faltar ou ser antigos, sem garantia de oferta atual. Veja as estimativas detalhadas na [proposta](PROPOSTA_TECNICA.md).
- **InVintory Partner:** API de reconhecimento por foto com campos de produtor, safra e região e catálogo divulgado de 1,5M+ rótulos; requer parceria e preço sob consulta. `score` não é probabilidade calibrada.
- **TinEye WineEngine:** reconhecimento especializado que anuncia identificação de rótulo, safra e variedade; Starter publicado a US$ 200/mês inclui 1.000 buscas/mês e até 5.000 imagens, com excedentes publicados. Requer uma coleção própria de imagens de referência. Não publica benchmark independente; os detalhes estão na [proposta](PROPOSTA_TECNICA.md).
- **Google Cloud Vision:** OCR de US$ 0 até 1.000 unidades/mês e US$ 1,50/1.000 depois; extrai texto, não identidade do vinho.
- **Gemini/OpenAI visão:** custo por tokens/resolução, baixo em uma imagem pequena, mas não são catálogos de vinhos; podem extrair campos/candidatos e ainda exigem fonte verificável e revisão.
- **Wine-Searcher API:** API de comerciantes/preços; preço e condições de trial atuais precisam de cotação do fornecedor. Um formulário público de 2018 listava US$ 250–260/mês para 500 chamadas/dia, apenas referência histórica, não preço atual. Verificar cobertura brasileira e safra/formato exatos antes de selecionar.
- **Brave Search API:** US$ 5/1.000 buscas e US$ 5 em créditos mensais conforme a página pública; serve para localizar páginas pelo EAN, não confirma preço sozinho. **Barcode Lookup** é API genérica de EAN/UPC; validar preço atual e cobertura de vinhos/safras no Brasil antes de considerar.
- **Precisão:** nenhum destes fornecedores apresenta benchmark independente comparável para o conjunto desta adega. O conjunto atual de duas imagens é insuficiente; nenhum score apresentado deve ser exibido como percentual de acerto.

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
