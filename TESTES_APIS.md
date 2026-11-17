# Guia prático para testar APIs de vinhos

**Data das informações:** 13/11/2026. Preços e condições podem mudar.  
**Situação atual (17/11/2026):** fluxo ponta a ponta concluído no app local autenticado: cadastro manual, busca WineAPI, revisão de ficha, cadastro em lote, reuso da ficha existente e persistência após recarregar. Os registros temporários de validação foram removidos. Reconhecimento por foto está fora do escopo das fases 1 e 2 por custo.

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
