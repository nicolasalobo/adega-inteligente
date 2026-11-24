# Roadmap de desenvolvimento — Adega pessoal

**Versão:** 1.5 | **Status:** Fases 1, 2 e 3 concluídas e validadas; Fase 4 não iniciada | **Data:** 23/11/2026

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

## Fase 2 — Cadastro e identificação assistida
**Escopo:** manter a busca textual, o cadastro manual e o scanner de código de barras já existentes. Toda sugestão deve ser revisada antes de gravar; integrações pagas de reconhecimento visual não fazem parte desta entrega.
**Status:** concluída e validada ponta a ponta no Neon segundo os registros da branch `codex/fase-2-identificacao`.
- [x] Buscar até 10 candidatos na WineAPI e selecionar um resultado.
- [x] Carregar a ficha disponível, permitir revisão/correção manual e deixar desconhecidos em branco.
- [x] Escolher quantidade e posições; bloquear posições ocupadas ou incompatíveis com a regra da prateleira.
- [x] Reusar a ficha de vinho por nome, produtor e safra, sem criar duplicatas ao cadastrar mais unidades.
- [x] Confirmar a gravação da ficha revisada e das garrafas no Neon; recarregar e validar persistência.
- [x] Preservar o scanner EAN-13 e deixar integrações de identificação externa desligadas sem credenciais e autorização.

**Fora do escopo desta fase:** adicionar serviços pagos de reconhecimento por imagem.

**Saída:** busca textual → candidato escolhido → ficha revisada → posições → garrafas cadastradas e persistidas.

## Fase 3 — Histórico e avaliações das garrafas
**Status:** concluída. Fluxos completos verificados na interface do Preview com Neon Auth/Data API em branch descartável; migrations 0008–0009 conferidas no Neon e migrations 0001–0009 reaplicadas em PostgreSQL 16 local descartável.
- [x] Mover garrafas entre posições e trocar ocupantes, respeitando as regras das prateleiras e registrando origem/destino.
- [x] Retirar garrafas, liberar a posição e registrar data, responsável e motivo opcional.
- [x] Consultar movimentações, trocas e retiradas no histórico.
- [x] Avaliar cada garrafa com 1 a 5 estrelas e comentário opcional; calcular a média por vinho e safra.
- [x] Aplicar e verificar as migrations 0008–0009 em uma branch Neon isolada; testar persistência, conflitos, regras e autorização do proprietário.
- [x] Validar os fluxos completos na interface conectada ao Neon e no Preview, incluindo persistência após reload.
- [x] Testar RLS com duas contas Neon Auth e duas movimentações concorrentes disputando a mesma posição.

**Saída:** inventário com histórico de movimentações, retiradas e avaliações.

## Fase 4 — Compartilhamento e beta familiar
- [ ] QR Code revogável e URL não listada para leitura sem conta.
- [ ] Convite por link somente do proprietário; permissões OWNER/MANAGER/VISITOR.
- [ ] Validar controles no backend (inclusive tentativas de edição via API).
- [ ] Testar com uma adega real de 2×(10×20) posições e outra pequena sem regra.
- [ ] Melhorar UX no iPhone: câmera, busca, posições e carregamento.

**Saída:** beta familiar com acesso por convite e controles de leitura/edição.

## Fase 5 — Hardening e expansão orientada por uso
- [ ] Medir qualidade da busca textual, taxa de correção, cobertura e custo por consulta.
- [ ] Resolver gargalos, acessibilidade, rate limits, observabilidade e backups.
- [ ] Validar contratos/licenças dos dados antes de monetizar.
- [ ] Só depois avaliar múltiplas adegas, transferências, recomendações e monetização.

## Ordem obrigatória de execução
**Adega visual e cadastro manual → busca e scanner existentes → histórico e avaliações → compartilhamento/beta familiar → hardening. Não adicionar reconhecimento pago por imagem.**

## Critérios de bloqueio (não avançar sem resolver)
- Identificação de rótulos ambíguos não pode selecionar marca/safra erradas silenciosamente.
- Não conseguir garantir uma garrafa por posição bloqueia fase 2.
- Fornecedor sem direitos para integração comercial não pode ser base única do produto vendável.

## Backlog explicitamente adiado
- Múltiplas adegas/transferências/em transporte;
- Marketplace e revenda;
- Funcionalidades sociais públicas;
- IA sommelier e sensores físicos.

## Decisão de escopo
Preços de compra, cotações de mercado, conversão cambial e valor total da coleção não fazem parte do produto.
