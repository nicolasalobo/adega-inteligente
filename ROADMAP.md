# Roadmap de desenvolvimento — Adega pessoal

**Versão:** 1.1 | **Status:** execução da Fase 1 | **Data:** 13/11/2026

> As fases são sequenciais, mas sem promessa de prazo. Avançar por critérios de aceite; não adicionar funcionalidades paralelas antes de validar o núcleo.

## Fase 0 — Prova de conceito de reconhecimento (ADIADA)
**Status:** adiada por decisão do projeto. Não bloqueia a base manual da Fase 1. Retomar após a Fase 1 e antes de implementar o reconhecimento por foto na Fase 2.
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
**Status:** em implementação. O cadastro é manual e não depende da Fase 0.
- [ ] Criar projeto Next.js + TS + banco relacional e autenticação.
- [ ] Criar uma adega por proprietário no MVP.
- [ ] Criar prateleiras com linhas e colunas; grid visual navegável.
- [ ] Criar modo pequena/livre e modo organizado por um critério/prateleira.
- [ ] Persistir posição única por garrafa; prevenção de dupla ocupação em transação.
- [ ] Pesquisar e cadastrar vinho manualmente, escolher posição e quantidade.

**Saída:** app funcional sem IA que já encontra cada garrafa na posição física.

## Fase 2 — Cadastro inteligente por foto e busca
**Dependências:** Fase 1 concluída; retomar a Fase 0 antes de ativar reconhecimento por foto ou escolher provedores. O fluxo manual segue disponível.
- [ ] Implementar upload seguro de foto e adaptadores de fornecedor.
- [ ] Extrair informações visíveis (com desconhecidos explícitos).
- [ ] Consultar catálogo, ranquear candidatos e separar safra do nome.
- [ ] Permitir revisão/correção manual de tudo.
- [ ] Cadastro em lote, sugestão de posições próximas e bloqueio por compatibilidade.
- [ ] Reusar ficha de vinho sem duplicar unidades físicas.

**Saída:** foto/busca → ficha validada → posições → garrafas cadastradas.

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
**Adega visual e cadastro manual → prova de conceito de reconhecimento → cadastro por foto → histórico/preços → QR/família → beta.**

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
