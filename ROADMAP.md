# Roadmap — Adega Inteligente 2.0

> **Fase 1 concluída — 18/11/2026:** em projeto Neon separado `adega-fase1-validacao`, branch `fase1-migracoes` sem expiração (`br-divine-math-bekaxx31`), Neon Auth e Data API provisionaram os esquemas gerenciados necessários. Sem tabelas prévias da aplicação, migrations 0001–0006 foram aplicadas em ordem; duas contas reais e RLS passaram na branch limpa. Dados descartáveis foram preservados em `fase1-snapshot` e restaurados em `fase1-restauracao` após alteração da origem: dados, 7 tabelas, 6 funções, 6 políticas, ACLs/RLS e 6 migrations conferidos. A restauração usa branches do mesmo provedor e não comprova recuperação de desastre independente. Playwright validou criação em lote, recarga, movimento, troca, avaliação, retirada e quatro eventos de histórico persistidos. Testes de iPhone físico permanecem na Fase 3. Nenhuma migration ou escrita ocorreu na produção.
> **Núcleo da Fase 2 validado em Neon real — 18/11/2026:** branch `codex/fase-2-identificacao`, baseada em `617ca90`. No projeto `adega-fase1-validacao` (`soft-mode-37622581`), a branch `fase2-identificacao-validacao-20261118` (`br-round-thunder-be945fsj`) foi criada a partir de `fase1-migracoes` (`br-divine-math-bekaxx31`); sua expiração foi removida e o console Neon mostra `Never`. A migration 0007 foi aplicada em transação guardada após verificar `auth`/`neon_auth` e as migrations 0001–0006; o histórico 0001–0007 e objetos RLS/RPC foram conferidos. Neon Auth e Data API reais com duas contas testaram isolamento RLS, EAN associado a duas safras, leitura antes do Open Food Facts, escrita direta negada, quota, falhas/rollback e cadastro na interface após reload. O teste real encontrou e corrigiu o cliente servidor que autenticava o token, mas não o repassava ao Data API em modo compatível. 7 testes de identificação, Playwright local, lint, TypeScript e build passaram. Limite: 30 chamadas combinadas/hora por usuário e subtetos de 5 fotos/5 chamadas IA; um burst de 40 RPCs paralelas aceitou 9 e recusou 31, sem sobrepassar o limite, mas a recusa conservadora sob concorrência permanece em investigação. Open Food Facts ao vivo retornou 404 para ambos os códigos. WineAPI/Brave/OpenAI não foram chamados e seguem sem credenciais/licenças/custos autorizados. Nenhuma escrita ocorreu em produção. iPhone/Safari físico permanece pendente.
> **Preview antecipado para uso mobile — 18/11/2026:** publicado na Vercel em `codex/fase-2-identificacao`, branch alias `adega-inteligente-git-codex-fase-5e93b5-nicolas-lobos-projects.vercel.app`, como Preview protegido (projeto `adega-inteligente`, root `web`, Next.js). O primeiro build revelou que `@zxing/library@0.23.0` requer Node `>=24`, enquanto o projeto estava em Node 22; `web/package.json` agora fixa Node `24.x`. O deployment do código `89e203d` ficou `READY`, os logs confirmam Node 24 e não mostram `EBADENGINE` nem erro de build. O Preview usa exclusivamente a branch Neon de validação persistente acima; as variáveis de conexão e flags de provedores estão somente no alvo Preview, com OpenAI, Brave e WineAPI desativados. Neon Auth recebeu o domínio exato do alias da branch. Cadastro/login descartável, gravação manual de garrafa e persistência de sessão/dados após recarga passaram pelo site publicado. A consulta online ao EAN `7892500022445` retornou “não encontramos uma ficha confirmada”; Open Food Facts ao vivo já havia retornado 404 e o cadastro manual não criou associação sem confirmação. O painel de runtime logs da Vercel não encontrou registros de erro para o deployment no período consultado. Uma tentativa de validar movimentação online foi interrompida quando a automação do Chrome deixou de acessar o diálogo nativo; esse fluxo já passou nos testes locais/Neon anteriores, mas não foi confirmado nesta sessão Preview. Um deployment automático classificado como `production` foi cancelado e nunca ficou `Live`; os deployments publicados e ativos são Preview (`target: null`). O link temporário de acesso é entregue fora do repositório e expira. Câmera física/Safari no iPhone continua pendente para validação manual.
> **Tentativa inicial de validação da Fase 1 — 18/11/2026 (supersedida pela conclusão acima):** a primeira tentativa de replay das migrations em branch Neon encontrou dependência do esquema gerenciado `auth`; o rollback foi confirmado. A validação inicial da interface também encontrou um bloqueio de diálogo. Os dois pontos foram resolvidos nas validações posteriores da Fase 1 registradas acima. Nenhuma migration ou escrita ocorreu em produção.
> **Registro da consolidação da Fase 1 — 18/11/2026 (histórico):** o código foi preservado no commit `e983c36` e integrado ao planejamento `2a07fa2`. O diagnóstico daquela etapa foi superado pela validação de conclusão registrada acima.
**18/11/2026 — estado atual.** P0: MVP; P1: premium; P2: expansão. Fases sequenciais dependem do aceite anterior. Fase 1 concluída em `617ca90`; núcleo da Fase 2 implementado e validado no Neon isolado. Foi publicado um Preview antecipado para uso mobile, antes do aceite das fases restantes. Integrações externas, comportamento de rajadas de quota e validação física em Safari/iPhone seguem pendentes.

## Progresso
- **Fase 1 concluída:** base Neon, autenticação, uma adega, prateleiras, cadastro manual, lote, WineAPI textual, movimentações, avaliações, histórico e persistência validados em branch Neon isolada, conforme commit `617ca90`.
- **Núcleo da Fase 2 validado:** migration 0007, Neon Auth/Data API, RLS com duas contas, associações de safras, quota sequencial, RPC atômico/rollback e fluxo E2E de EAN até reload passaram na branch temporária `br-round-thunder-be945fsj`. O cadastro manual e a busca textual foram preservados. Um teste burst de quota recusou conservadoramente 31 de 40 chamadas em paralelo; investigar esse comportamento antes de depender de requisições em rajada.
- **Estado das funcionalidades anteriores:** cadastro textual/manual, lote, movimentações, histórico e avaliações estão preservados no commit-base `617ca90`; a Fase 1 foi validada e não foi repetida sem necessidade de regressão.
- **Pendências da Fase 2:** WineAPI/Brave/OpenAI continuam desativados até credenciais, autorização de custos e licenças; nenhuma integração foi validada ao vivo. Investigar a recusa conservadora observada em chamadas concorrentes de quota. Essas pendências não invalidaram o isolamento, a integridade transacional nem o caminho EAN já confirmado no Neon.
- **Custos e licenças:** Open Food Facts não foi armazenado em cache. WineAPI permanece desligada porque o plano gratuito publicado é pessoal/não comercial. Brave custa US$ 5/1.000 consultas após créditos elegíveis; nenhum pedido foi feito. OpenAI não foi chamada; custo depende do modelo e do volume. Nenhuma chave de Brave/OpenAI foi encontrada nem gasto autorizado.
- **Testes desta entrega:** 7 testes de identificação, Neon Auth/Data API real com duas contas e Playwright de UI contra branch Neon isolada, Playwright local, lint, TypeScript e build passaram. No Preview publicado, login/cadastro descartável, gravação manual e persistência após recarga foram confirmados. A consulta ao EAN sem associação retornou sem ficha confirmada; o modo manual continuou disponível. PostgreSQL 16 descartável segue como regressão complementar com Auth simulado. Consulta real Open Food Facts retornou 404 para os dois EANs. Nenhuma operação de escrita em produção; apenas Preview protegido foi publicado.

## Primeira entrega — MVP (P0)

### Fase 1 — Consolidação e regressão — CONCLUÍDA (18/11/2026)
**Dependência:** reconciliar branches e alterações locais. **Trabalho:** verificar login/sessão, prateleiras, modos, manual, WineAPI, lote, unicidade concorrente, movimento, troca, retirada, histórico, avaliações e média; revisar migrations 0001–0006, RLS, recuperação e isolamento entre contas; criar regressões. **Aceite:** fluxos reais em Neon de teste persistem após recarga, concorrência e permissões verificadas e nenhuma falha crítica; migration perigosa exige backup e alvo validados.

### Fase 2 — Identificação inteligente — NÚCLEO VALIDADO EM NEON
**Dependência:** Fase 1. EAN-13/checksum, entrada manual, scanner ZXing, associações RLS, pipeline, contratos estruturados, revisão, limites e consentimento estão implementados em `codex/fase-2-identificacao`. **Evidência real:** branch Neon isolada `br-round-thunder-be945fsj`, filha de `fase1-migracoes`; migration 0007 aplicada depois de 0001–0006; duas contas Neon Auth reais testaram isolamento e permissões pela Data API; EAN confirmado foi lido antes de qualquer catálogo externo; duas safras e rollback atômico validados; E2E Playwright salvou uma garrafa na interface e confirmou a posição após recarga. **Limites:** 30 solicitações combinadas por usuário/hora, até 5 fotos e 5 resoluções IA; 40 RPCs paralelas resultaram em 9 aceitas e 31 recusadas, sem excesso, comportamento conservador ainda não explicado. **Fontes:** Open Food Facts vivo retorna 404 para os dois códigos; WineAPI/Brave/OpenAI permanecem desligados e não foram validados ao vivo. Para ativá-los, exigem credenciais, autorização de custos, consentimento e licença compatível. **Câmera física Safari/iPhone fica na Fase 3.**

### Fase 3 — Mobile-first e PWA
**Dependência:** fase 2. **Trabalho:** navegação, cadastro progressivo, dashboard, toque, teclado, safe areas, acessibilidade, responsividade, prateleiras grandes, manifest e ícones. **Aceite:** operações essenciais confortáveis em iPhone e Android, desktop funcional, instalação compatível e erros tratados; sem offline complexo.

### Fase 4 — Finanças iniciais
**Dependência:** fase 3 e inventário íntegro. **Trabalho:** aquisição por garrafa/lote, moeda original e NUMERIC; câmbio histórico BRL e entrada manual; avaliação manual, histórico, adaptador de preços, safra alternativa revisável, preferência manual, dashboard com cobertura e privacidade backend/RLS. Preparar job semanal com lock, cache, deduplicação, limites e histórico; automático desligado sem licença/orçamento. **Aceite:** compra multimoeda, conversão verificável ou manual, avaliação manual, totais parciais explícitos, custo/mercado separados, comparação apenas nas unidades comparáveis e permissões testadas. Sem dependência obrigatória de API paga.

### Fase 5 — Preview e MVP
**Dependência:** fases 1–4 aceitas. **Trabalho:** testes, lint/build, dependências, backup/restauração, migrations e RLS; termos, variáveis privadas e custos; Vercel root `web`, redirects Neon Auth e preview HTTPS; testar persistência, finanças, câmera e iPhone sem dados destrutivos e revisar logs. **Aceite:** fluxo completo pela internet sem computador local; solicitar autorização explícita para produção após preview e validar novamente. Um Preview antecipado foi autorizado e publicado em 18/11/2026 para testar o app no iPhone; isso não conclui a Fase 5. Produção continua sem deploy e exige autorização explícita posterior.

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
