# Roadmap — Adega Inteligente 2.0

> **Fase 1 concluída — 18/11/2026:** em projeto Neon separado `adega-fase1-validacao`, branch `fase1-migracoes` sem expiração (`br-divine-math-bekaxx31`), Neon Auth e Data API provisionaram os esquemas gerenciados necessários. Sem tabelas prévias da aplicação, migrations 0001–0006 foram aplicadas em ordem; duas contas reais e RLS passaram na branch limpa. Dados descartáveis foram preservados em `fase1-snapshot` e restaurados em `fase1-restauracao` após alteração da origem: dados, 7 tabelas, 6 funções, 6 políticas, ACLs/RLS e 6 migrations conferidos. A restauração usa branches do mesmo provedor e não comprova recuperação de desastre independente. Playwright validou criação em lote, recarga, movimento, troca, avaliação, retirada e quatro eventos de histórico persistidos. Testes de iPhone físico permanecem na Fase 3. Nenhuma migration ou escrita ocorreu na produção.
> **Fase 2 — implementação sob revisão, não aceita (18/11/2026):** branch `codex/fase-2-identificacao`, baseada em `617ca90`. Scanner EAN-13, checksum, consulta autenticada por ordem, candidatos com fontes/revisão, análise opt-in de foto/IA, migration incremental com RLS/associações por adega e quotas, gravação atômica no cadastro e testes locais foram implementados. Passaram 7 testes determinísticos, lint, TypeScript e build. Playwright local validou EAN inválido, scanner cancelável e liberação de uma track, cadastro manual e persistência sem Neon nem chamadas externas. Um PostgreSQL 16 descartável aplicou migrations 0001–0007 e passou testes de checksum, RPC atômico, RLS entre duas contas simuladas, múltiplas safras por EAN, retry, erros e quotas 30/5/5; Neon Auth foi simulado, portanto isso não substitui Neon real. Open Food Facts real respondeu 404 para ambos os EANs. WineAPI/Brave/OpenAI não receberam chamadas reais por flags, credenciais, licença e custo. Falta validar migration 0007, quotas/RLS e registro atômico em branch Neon isolada: não há credenciais/branch ID de teste verificáveis nesta cópia. iPhone físico segue Fase 3. Não avançar a fase até concluir a validação isolada.
> **Tentativa inicial de validação da Fase 1 — 18/11/2026 (supersedida pela conclusão acima):** a primeira tentativa de replay das migrations em branch Neon encontrou dependência do esquema gerenciado `auth`; o rollback foi confirmado. A validação inicial da interface também encontrou um bloqueio de diálogo. Os dois pontos foram resolvidos nas validações posteriores da Fase 1 registradas acima. Nenhuma migration ou escrita ocorreu em produção.
> **Registro da consolidação da Fase 1 — 18/11/2026 (histórico):** o código foi preservado no commit `e983c36` e integrado ao planejamento `2a07fa2`. O diagnóstico daquela etapa foi superado pela validação de conclusão registrada acima.
**18/11/2026 — estado atual.** P0: MVP; P1: premium; P2: expansão. Fases sequenciais dependem do aceite anterior. Fase 1 concluída em `617ca90`; Fase 2 implementada em `codex/fase-2-identificacao`, em revisão até a validação Neon isolada.

## Progresso
- **Fase 1 concluída:** base Neon, autenticação, uma adega, prateleiras, cadastro manual, lote, WineAPI textual, movimentações, avaliações, histórico e persistência validados em branch Neon isolada, conforme commit `617ca90`.
- **Fase 2 em revisão:** implementação disponível na branch `codex/fase-2-identificacao`. Código e testes locais passaram; aceite de segurança/integridade aguarda migration 0007, RLS/quotas e RPC atômico testados em Neon isolado. Confirmar live tests dos provedores somente após configuração compatível e orçamento. O cadastro manual e busca textual foram preservados.
- **Estado das funcionalidades anteriores:** cadastro textual/manual, lote, movimentações, histórico e avaliações estão preservados no commit-base `617ca90`; a Fase 1 foi validada e não foi repetida sem necessidade de regressão.
- **Bloqueio da Fase 2:** validar 0007, quotas, RLS e gravação atômica em branch Neon com Neon Auth/Data API; esta worktree não tem credencial/ID verificável para uma branch de teste. Provedores opcionais também dependem de autorização, credenciais e validação de licença.
- **Custos e licenças:** Open Food Facts não foi armazenado em cache. WineAPI permanece desligada porque o plano gratuito publicado é pessoal/não comercial. Brave custa US$ 5/1.000 consultas após créditos elegíveis; nenhum pedido foi feito. OpenAI não foi chamada; custo depende do modelo e do volume. Nenhuma chave de Brave/OpenAI foi encontrada nem gasto autorizado.
- **Testes desta entrega:** 7 testes de identificação, suíte de migration em PostgreSQL 16 descartável (com Neon Auth simulado), Playwright local, lint, TypeScript e build passaram. Consulta real Open Food Facts retornou 404 para os dois EANs. Nenhuma operação de escrita no Neon configurado e nenhum deploy foram feitos.

## Primeira entrega — MVP (P0)

### Fase 1 — Consolidação e regressão — CONCLUÍDA (18/11/2026)
**Dependência:** reconciliar branches e alterações locais. **Trabalho:** verificar login/sessão, prateleiras, modos, manual, WineAPI, lote, unicidade concorrente, movimento, troca, retirada, histórico, avaliações e média; revisar migrations 0001–0006, RLS, recuperação e isolamento entre contas; criar regressões. **Aceite:** fluxos reais em Neon de teste persistem após recarga, concorrência e permissões verificadas e nenhuma falha crítica; migration perigosa exige backup e alvo validados.

### Fase 2 — Identificação inteligente — IMPLEMENTADA, ACEITE PENDENTE
**Dependência:** Fase 1. EAN-13/checksum, entrada manual, scanner ZXing, associações RLS, pipeline, contratos estruturados, revisão, limites e consentimento implementados na branch `codex/fase-2-identificacao`. **Evidência local:** 7 testes, lint, TypeScript, build, PostgreSQL 16 descartável replayando 0001–0007 com autenticação Neon simulada, e E2E Chromium local de scanner cancelável/cadastro manual/persistência. **Fontes:** Open Food Facts vivo retorna 404 para os dois códigos; fontes públicas associam `7892500022445` ao Panul Carménère 750 ml e associam provisoriamente `8436559528924` ao Montecruz Cabernet Sauvignon, sem EAN no catálogo oficial do produtor. **Aceite restante:** migration 0007 e integração/RLS/quotas/RPC em Neon de teste com Neon Auth/Data API; provedores opcionais exigem credenciais, consentimento, orçamento e licença compatível antes de chamadas reais. **Câmera física Safari/iPhone fica na Fase 3.** Não iniciar Fase 3 antes do aceite da Fase 2.

### Fase 3 — Mobile-first e PWA
**Dependência:** fase 2. **Trabalho:** navegação, cadastro progressivo, dashboard, toque, teclado, safe areas, acessibilidade, responsividade, prateleiras grandes, manifest e ícones. **Aceite:** operações essenciais confortáveis em iPhone e Android, desktop funcional, instalação compatível e erros tratados; sem offline complexo.

### Fase 4 — Finanças iniciais
**Dependência:** fase 3 e inventário íntegro. **Trabalho:** aquisição por garrafa/lote, moeda original e NUMERIC; câmbio histórico BRL e entrada manual; avaliação manual, histórico, adaptador de preços, safra alternativa revisável, preferência manual, dashboard com cobertura e privacidade backend/RLS. Preparar job semanal com lock, cache, deduplicação, limites e histórico; automático desligado sem licença/orçamento. **Aceite:** compra multimoeda, conversão verificável ou manual, avaliação manual, totais parciais explícitos, custo/mercado separados, comparação apenas nas unidades comparáveis e permissões testadas. Sem dependência obrigatória de API paga.

### Fase 5 — Preview e MVP
**Dependência:** fases 1–4 aceitas. **Trabalho:** testes, lint/build, dependências, backup/restauração, migrations e RLS; termos, variáveis privadas e custos; Vercel root `web`, redirects Neon Auth e preview HTTPS; testar persistência, finanças, câmera e iPhone sem dados destrutivos e revisar logs. **Aceite:** fluxo completo pela internet sem computador local; solicitar autorização explícita para produção após preview e validar novamente. Nenhum deploy autorizado nesta entrega.

## Segunda entrega — Premium (P1)
### Fase 6 — Localização 3D
**Dependência:** MVP e mapa 2D preciso. **Trabalho:** avaliar Three.js/React Three Fiber, associar IDs, renderização leve sob demanda, toque/zoom, busca e fallback 2D. **Aceite:** busca localiza posição correta em 3D sem bloquear inventário em caso de falha.

### Fase 7 — Sommelier com IA
**Dependência:** MVP, permissões e limites. **Trabalho:** ferramentas de consulta a inventário, posições, histórico, preços autorizados e janelas; recomendações com fontes e contexto mínimo, inicialmente leitura. **Aceite:** respostas usam dados reais permitidos, posições corretas e não inventam dados; escrita futura exige confirmação.

## Terceira entrega — Plataforma (P2)
### Fase 8 — Consumo, colaboração e múltiplas adegas
**Dependência:** MVP e controles de acesso. **Trabalho:** janelas com fontes, notificações opt-in; owner/manager/visitor, QR/links revogáveis e privacidade; migração segura para várias adegas; transferências separadas. **Aceite:** isolamento e revogação testados, sem vazamento financeiro ou associação errada.

### Fase 9 — Ferramentas avançadas
**Dependência:** fase 8. **Trabalho:** CSV com mapeamento, prévia, validação, duplicatas e relatório; exportação autorizada, relatórios e filtros. **Aceite:** importação segura sem sobrescrita silenciosa e exportação respeita acesso.

### Fase 10 — Monetização
**Dependência:** validação, custos e licenças. **Trabalho:** entrevistas e preços; planos gratuito/premium e concierge separado; após demanda, gateway, assinatura, acesso, webhooks assinados e cancelamento. **Aceite:** viabilidade e custos conhecidos, permissões e pagamentos verificados, nenhum cartão no banco.

## Portões transversais
Cada fase exige código e documentação versionados, migrations validadas, testes apropriados e fluxo completo, erros tratados, segurança, mobile e ausência de falhas críticas. Licença e cobertura são dependências explícitas; mocks não demonstram integração real. Produção exige aprovação após preview. Atualizar progresso, testes, custos, bloqueios e decisões a cada fase.

## Registro preservado do planejamento anterior
O texto abaixo reproduz o roadmap local de 17/11. Status e prioridades são históricos e não sobrepõem o plano 2.0.

<details>
<summary>Roadmap anterior integral</summary>
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

## Fase 3 - Histórico e avaliações das garrafas
- [ ] Mover e trocar garrafas, registrando data, posição de origem e destino.
- [ ] Retirar garrafa com motivo opcional e registrar a movimentação no histórico.
- [ ] Avaliar cada garrafa com nota/comentário opcionais e calcular a média por vinho.

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
**Adega visual e cadastro manual → busca textual → histórico e avaliações → compartilhamento/beta familiar → hardening. Reconhecimento por foto permanece fora do roadmap ativo.**

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

</details>
