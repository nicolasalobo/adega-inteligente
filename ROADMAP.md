# Roadmap de desenvolvimento — Adega pessoal

**Versão:** 1.3 | **Status:** Fases 1 e 2 concluídas e validadas ponta a ponta | **Data:** 17/11/2026

> As fases são sequenciais, mas sem promessa de prazo. Avançar por critérios de aceite; não adicionar funcionalidades paralelas antes de validar o núcleo.

## Fase 0 — Prova de conceito de reconhecimento por imagem (ADIADA)
**Status:** fora do escopo atual por custo da API. Não bloqueia a base manual da Fase 1 nem a busca textual da Fase 2. Só retomar se o projeto decidir voltar a identificar rótulos por foto.
**Atualização (17/11/2026):** a Fase 2 foi redefinida para busca textual; reconhecimento por foto não será implementado nesta etapa.
**Meta:** descobrir se o pipeline encontra vinhos reais e safras com precisão e custo aceitáveis.

- [ ] Criar credencial gratuita WineAPI (busca textual; somente uso pessoal no plano Free).
- [ ] Testar busca por nome para Quara Estate Malbec 2016 e Bellevue Bordeaux 2020.
- [ ] Solicitar chave de avaliação/acesso à InVintory para reconhecimento por imagem.
- [ ] Testar extração visual com OpenAI e comparar com catálogo (sem supor verificação por IA).
- [ ] Montar conjunto de 30–50 fotos próprias de regiões/safras variadas.
- [ ] Registrar em planilha: provedor, top-1/top-3, safra, uva, país, preço, custo, tempo e erros.
- [ ] Decidir quais provedores entram no MVP; se cobertura baixa, foto+IA e correção humana como fallback.

**Saída:** relatório de benchmark + decisão documentada sobre API(s) + custo estimado por 100/1.000 scans.

## Fase 1 — Base do projeto e adega visual mínima
**Status:** concluída e validada ponta a ponta no Neon.
- [x] Criar projeto Next.js + TS + banco relacional e autenticação.
- [x] Criar uma adega por proprietário no MVP.
- [x] Criar prateleiras com linhas e colunas; grid visual navegável e edição de prateleira.
- [x] Criar modo pequena/livre e modo organizado por um critério/prateleira.
- [x] Persistir posição única por garrafa; prevenção de dupla ocupação em transação.
- [x] Pesquisar e cadastrar vinho manualmente, escolher posição e quantidade.
- [x] Confirmar cadastro manual, persistência remota e reabertura dos dados no Neon.

**Saída:** app funcional sem IA que já encontra cada garrafa na posição física.

## Fase 2 — Cadastro inteligente por busca textual (sem foto)
**Escopo:** pesquisar pelo nome/produtor/safra via WineAPI, escolher um candidato, revisar a ficha e salvar as garrafas. O fluxo manual segue disponível.
**Status:** concluída e validada ponta a ponta no Neon, incluindo busca, revisão, lote e reuso de ficha.
- [x] Buscar até 10 candidatos na WineAPI e selecionar um resultado.
- [x] Carregar a ficha disponível, permitir revisão/correção manual e deixar desconhecidos em branco.
- [x] Escolher quantidade e posições; bloquear posições ocupadas ou incompatíveis com a regra da prateleira.
- [x] Reusar a ficha de vinho por nome, produtor e safra, sem criar duplicatas ao cadastrar mais unidades.
- [x] Confirmar a gravação da ficha revisada e das garrafas no Neon; recarregar e validar persistência.

**Fora do escopo desta fase:** upload de foto, OCR/reconhecimento visual e busca de catálogo disparada por imagem.

**Saída:** busca textual → candidato escolhido → ficha revisada → posições → garrafas cadastradas e persistidas.

## Fase 3 — Histórico e valor da coleção
- [ ] Mover/trocar garrafas com histórico de cada movimentação.
- [ ] Retirar com motivo opcional; avaliar por garrafa com média por vinho.
- [ ] Preço pago obrigatório em compra nova, opcional em acervo anterior.
- [ ] Preservar moeda original e taxas históricas; totais sempre em BRL.
- [ ] Catálogo de cotações por safra/fonte; manual ou outras safras devidamente rotuladas.
- [ ] Job semanal de atualização, histórico de cotações e valor confirmado vs estimado.

**Saída:** inventário auditável e dashboard financeiro honesto.

## Fase 4 — Compartilhamento e beta familiar
- [ ] QR Code revogável e URL não listada para leitura sem conta.
- [ ] Duas opções independentes de visibilidade de preço por adega (pagos e mercado).
- [ ] Convite por link somente do proprietário; permissões OWNER/MANAGER/VISITOR.
- [ ] Validar controles no backend (inclusive tentativas de edição via API).
- [ ] Testar com uma adega real de 2×(10×20) posições e outra pequena sem regra.
- [ ] Melhorar UX no iPhone: câmera, busca, posições e carregamento.

**Saída:** beta utilizável pela família sem vazamento de preços ou edição por visitantes.

## Fase 5 — Hardening e expansão orientada por uso
- [ ] Medir reconhecimento, taxa de correção humana, cobertura e preço por requisição.
- [ ] Resolver gargalos, acessibilidade, rate limits, observabilidade e backups.
- [ ] Validar contratos/licenças dos dados antes de monetizar.
- [ ] Só depois avaliar múltiplas adegas, transferências, recomendações e monetização.

## Ordem obrigatória de execução
**Adega visual e cadastro manual → busca textual → histórico/preços → compartilhamento/beta familiar → hardening. Reconhecimento por foto permanece fora do roadmap ativo.**

## Critérios de bloqueio (não avançar sem resolver)
- Identificação de rótulos ambíguos não pode selecionar marca/safra erradas silenciosamente.
- Não conseguir garantir uma garrafa por posição bloqueia fase 2.
- Fornecedor sem direitos para integração comercial não pode ser base única do produto vendável.
- Preços sem fonte/safra/data não podem entrar no total como se fossem exatos.

## Backlog explicitamente adiado
- Múltiplas adegas/transferências/em transporte;
- Marketplace e revenda;
- Funcionalidades sociais públicas;
- IA sommelier e sensores físicos.
