# PRD — Adega Inteligente 2.0

> **Fase 1 concluída — 18/11/2026:** em projeto Neon separado `adega-fase1-validacao`, branch `fase1-migracoes` sem expiração (`br-divine-math-bekaxx31`), Neon Auth e Data API provisionaram os esquemas gerenciados necessários. Sem tabelas prévias da aplicação, migrations 0001–0006 foram aplicadas em ordem; duas contas reais e RLS passaram na branch limpa. Dados descartáveis foram preservados em `fase1-snapshot` e restaurados em `fase1-restauracao` após alteração da origem: dados, 7 tabelas, 6 funções, 6 políticas, ACLs/RLS e 6 migrations conferidos. A restauração usa branches do mesmo provedor e não comprova recuperação de desastre independente. Playwright validou criação em lote, recarga, movimento, troca, avaliação, retirada e quatro eventos de histórico persistidos. Testes de iPhone físico permanecem na Fase 3. Nenhuma migration ou escrita ocorreu na produção.
> **Implementação da Fase 2 — 18/11/2026, branch `codex/fase-2-identificacao`:** EAN-13/checksum, scanner ZXing com câmera traseira/permissões/cancelamento/liberação, pipeline autenticado e estruturado, associações RLS por adega/safra, quotas persistentes, consentimento para IA/foto/pesquisa e integração progressiva ao cadastro foram implementados. 7 testes determinísticos, lint, TypeScript e build passaram. Playwright local confirmou EAN inválido, scanner cancelável com 1 track de mídia encerrado, cadastro manual e persistência sem tráfego Neon/externo. Um PostgreSQL 16 descartável instalou migrations 0001–0007 e passou validação de checksum, RPC atômico, RLS entre duas contas, compartilhamento do EAN por safras, retry e quotas 30/5/5; Neon Auth foi simulado e isso não substitui Neon real. Open Food Facts real retornou 404 para `7892500022445` e `8436559528924`; portanto a API foi exercitada, mas não forneceu ficha. Fontes públicas identificam o primeiro como Panul Carménère 750 ml; o segundo tem correspondência provisória a Montecruz Cabernet Sauvignon sustentada por diretório de códigos e catálogo oficial do produtor, sem associação EAN no catálogo do produtor. WineAPI, Brave e OpenAI não foram chamados: a flag WineAPI permanece desligada (termos do plano gratuito só permitem uso pessoal), não há chave Brave/OpenAI e nenhuma autorização de custo foi configurada. **Fase 2 ainda não aceita:** faltam validar migrations, RLS/quotas e gravação atômica na branch Neon isolada, indisponível nesta cópia por falta de branch ID/credenciais verificáveis. Não executar em banco de identidade incerta. Teste físico de iPhone segue para Fase 3.
> **Tentativa anterior de validação da Fase 1 — 18/11/2026 (supersedida pela conclusão registrada acima):** branch Neon isolada `teste-fase1-adega` (`br-purple-dawn-b6f9zebw`), filha de `production` (`br-small-meadow-b66kpzw6`), com expiração em 19/11. A tentativa inicial de recriar migrations em esquema limpo falhou pela dependência do esquema gerenciado `auth`; houve rollback confirmado. A validação posterior inicial também encontrou bloqueio de diálogo na interface. Esses bloqueios foram resolvidos no trabalho que concluiu a Fase 1 conforme o registro mais recente acima. Nenhuma migration ou escrita ocorreu em produção.
> **Registro da consolidação da Fase 1 — 18/11/2026 (histórico):** o código foi preservado no commit `e983c36` e integrado ao planejamento `2a07fa2`. O diagnóstico daquela etapa foi superado pela validação de conclusão registrada acima.
**18/11/2026 — proposta para revisão.** Plataforma brasileira mobile-first para gerir garrafas, posições, custo histórico, valor estimado e consumo, com identidade própria e ambição de competir com InVintory. SaaS e implantação presencial são objetivos posteriores; português brasileiro e BRL são padrão. Não há paridade comprovada.

## Estado inicial auditado (histórico; atualizado pelas validações registradas acima e na seção de Fase 2)
Inspeção estática de documentos, código, branches e migrations antes da consolidação, sem executar testes, aplicação ou banco. HEAD local `5456cb8`, remoto de trabalho `37e0311` e `origin/main` `00e3d91`; havia alterações locais ainda não commitadas. Esse diagnóstico foi supersedido pela consolidação da Fase 1 no commit `617ca90` e sua validação posterior.

| Funcionalidade | Estado observado |
|---|---|
| Autenticação, prateleiras, modos livre/estruturado, cadastro manual, lote e posições | Existente; histórico local relata validação Neon, não repetida nesta sessão. Requer regressão. |
| Busca WineAPI e revisão | Parcial e dependente de fornecedor; rotas e fluxo locais, licença comercial e robustez pendentes. |
| Movimento, troca, retirada, histórico, avaliações e médias | Parcial local; UI, serviços, migrations 0005–0006 e script presentes, sem verificação atual de banco, RLS ou E2E. |
| Mobile | Parcial; CSS responsivo, sem aceite em iPhone. |
| Finanças, EAN, foto, IA, PWA, 3D, compartilhamento e assinaturas | Ausentes no código inspecionado; integrações podem depender de fornecedor. |

O registro acima é uma fotografia do diagnóstico inicial, não o status atual do projeto.

## Matriz comparativa — consulta de 18/11/2026
Legenda da Adega: existente, parcial, ausente e dependente de fornecedor. Referências públicas não comprovam paridade.

| Recurso | Referência InVintory | Adega: situação e objetivo |
|---|---|---|
| Inventário | Ilimitado [1,2] | Parcial; completo no MVP. |
| Catálogo | Dados de vinho [1,2] | Parcial e fornecedor; busca e revisão. |
| Código de barras | Confirmar no help [3] | Ausente; completo no MVP. |
| Foto | Confirmar no help [3] | Ausente e fornecedor; foto/IA quando configurada. |
| Lote | Edição em lote [2] | Parcial; validar cadastro. |
| Localização física | Mapa e locais [1,2] | Parcial; completar 2D. |
| 3D | Planos pagos [1,2,4] | Ausente; premium. |
| Histórico e avaliações | Garrafas anteriores e avaliações [2] | Parcial local; validar. |
| Preço de compra | Registro individual [2] | Ausente; MVP por unidade/lote. |
| Valor de mercado | Por plano [2,5] | Ausente e fornecedor; manual no MVP, cobertura explícita. |
| Histórico financeiro | Histórico de preços por plano [2] | Ausente; compras e avaliações auditáveis. |
| Câmbio | Confirmar por mercado [3] | Ausente e fornecedor; histórico com fallback manual. |
| Assistente IA | Por plano [1,2] | Ausente e fornecedor; premium. |
| Janela de consumo | Dados de consumo [3] | Ausente e fornecedor; posterior, com fontes. |
| Compartilhamento | Colaboradores [2] | Ausente; posterior. |
| Importação CSV | Anunciada [1] | Ausente; posterior. |
| Exportação CSV | Anunciada [1,2] | Ausente; posterior. |
| Múltiplas adegas | Vários locais [1,2] | Parcial no modelo; interface posterior. |
| Assinaturas | Planos grátis e pagos [1,2] | Ausente; posterior após validação. |
| Implantação | Elite sob consulta [4] | Ausente; processo operacional posterior. |

[1] https://invintory.com/pricing/ · [2] https://invintory.com/help/account-plans-billing/understanding-invintory-plans/ · [3] https://invintory.com/help/ · [4] https://invintory.com/elite/ · [5] https://invintory.com/help/wine-data-pricing/understanding-your-total-collection-value/ . Condições podem mudar; gratuito anunciado permite garrafas ilimitadas.

## Jornadas e inventário
Criar conta, adega e prateleiras livres ou estruturadas; identificar por EAN, foto, nome ou manualmente; revisar fontes e desconhecidos; informar aquisição e quantidade; escolher posição livre e compatível por garrafa. Buscar, localizar, mover, trocar e retirar com histórico; avaliação opcional por garrafa e média somente de notas existentes. Uma garrafa ativa por posição, garantida por transação, restrição e autorização no servidor/banco; troca valida ambos os lados; retirada preserva histórico. EAN pode ser compartilhado por safras e não é chave primária.

## Identificação
Pipeline planejado: associação confirmada → Open Food Facts autorizado → candidatos WineAPI → pesquisa web autorizada → IA estruturada → foto quando necessário → revisão e confirmação. Falhas e campos desconhecidos são explícitos; cadastro manual sempre disponível. Guardar quando conhecidos nome, produtor, safra, país, região, uvas, tipo, volume, álcool, EAN, fonte e campos pendentes.

Avaliar `@zxing/browser`, EAN-13 e dígito verificador, entrada manual, câmera traseira, permissões, HTTPS, liberação e Safari/iPhone. IA não inventa fonte ou safra, não confunde aproximação com exatidão e não escreve no inventário. Validar uploads; chamadas pagas autenticadas no backend com limites, orçamento, cache permitido e logs sem dados sensíveis. Benchmark com 30–50 rótulos mede identidade, safra, falsos positivos, cobertura, custo e latência.

### Fase 2 — implementação e validação observada

- EAN-13 é validado com checksum no cliente e servidor; `0007_intelligent_wine_identification.sql` também protege o banco. O EAN identifica a embalagem, não uma safra. Vínculos são por `cellar_id` + `wine_id`, permitindo várias safras/adegas sem revelar associações de outras contas.
- Scanner usa `@zxing/browser@0.2.1`, solicita `facingMode: environment`, lida com câmera negada/ausente/ocupada e encerra `controls` e tracks ao cancelar ou ler. Foi testado o fluxo Chromium local de permissão/abertura/cancelamento; iPhone/Safari físico fica para Fase 3.
- O pipeline autenticado é associação própria/RLS → Open Food Facts v3 → WineAPI opt-in → Brave Search opt-in em caso sem resultado/ambiguidade → seleção de candidato por OpenAI estruturada e opt-in. Foto passa por endpoint separado, exige consentimento, chave e flag de servidor. Provedores não alteram o inventário; o usuário escolhe, revisa e confirma. A migration liga a associação confirmada e as garrafas na mesma transação.
- Open Food Facts retorna campos como candidatos com origem e sem cache local. A base usa ODbL, conteúdo individual Database Contents License, e seus dados comunitários não têm garantia de precisão; consulte [termos e atribuição oficiais](https://world.openfoodfacts.org/terms-of-use). A adequação de redistribuição/uso comercial precisa de revisão jurídica. A WineAPI publica restrição de uso pessoal e não comercial no plano gratuito; desabilitada até licença compatível. A [Brave Search API](https://api-dashboard.search.brave.com/app/plans?tab=normal) custa atualmente US$ 5/1.000 buscas depois dos créditos elegíveis. Chamadas OpenAI dependem de modelo e volume; preço deve ser conferido na [tabela vigente](https://openai.com/api/pricing/) antes de ativar. Integrações opcionais ficam desligadas por padrão; IA/web também exigem consentimento por operação; quotas são 30 códigos, 5 fotos e 5 resoluções IA por usuário por hora.
- `npm run test:identification` cobre checksum, associação/ambiguidade, ordem dos provedores, dados ausentes/falhas e bloqueio de IDs inventados pela IA. `npm run test:identification:live` exerceu Open Food Facts real e recebeu 404 (sem ficha) nos dois EANs. Fontes externas públicas: [Atacadão — Panul Carménère 750 ml/EAN 7892500022445](https://www.atacadao.com.br/vinho-chileno-panul-carmenere-garrafa-com-750ml-82045/p), [Diário Oficial MS — mesma correspondência](https://assets.imprensaoficial.ms.gov.br/public/prd/Diario%20Oficial/2026/04/06/DO12118_06_04_2026_SUP_1.pdf); para `8436559528924`, [diretório de códigos — Montecruz Cabernet Sauvignon](https://barcode-list.ru/barcode/RU/%D0%9F%D0%BE%D0%B8%D1%81%D0%BA.htm?barcode=SAUVIGNON) e [página oficial do produtor sobre o rótulo](https://bodegasfernandocastro.com/en/wines/montecruz-cabernet-sauvignon/). O produtor confirma o vinho e a uva, mas não lista EAN; confirmar código no rótulo físico antes de tratar como associação exata.
- **Validação pendente:** obter branch Neon de teste verificável com Neon Auth/Data API e aplicar nela a migration 0007. Em PostgreSQL 16 descartável, as migrations 0001–0007 foram instaladas em ordem e passaram testes locais de checksum, RPC atômico, RLS com dois usuários simulados, quotas, múltiplas safras e erros; esse teste não valida Neon Auth/Data API. Nenhuma conexão, migration ou escrita foi feita no banco Neon configurado, e nenhum deploy ocorreu. WineAPI/Brave/OpenAI exigem habilitação, licença/credenciais/consentimento e teste real; mocks não contam como integração externa validada. Até a validação Neon, Fase 2 segue implementação em revisão, não aceita.

## Finanças — P0 do MVP
**Aquisição:** preço, moeda ISO, data, quantidade, fornecedor e observações por garrafa/lote. Compra nova exige preço; acervo antigo, presente e herança admitem desconhecido. Aceitar preço unitário ou total de lote com distribuição correta e custos distintos por compra. Usar NUMERIC/DECIMAL e arredondamento definido.

**Câmbio:** BRL, USD, EUR, GBP, ARS e CLP extensíveis. Preservar valores originais. BRL dispensa conversão; com data, usar taxa histórica até a data, nunca futura, registrando taxa, data efetiva e fonte. Sem data ou taxa, permitir equivalente BRL manual identificado. Valores confirmados não mudam silenciosamente. Avaliar https://frankfurter.dev/ e https://frankfurter.dev/currencies/; moeda listada não garante cobertura do par, data ou termos.

**Mercado:** avaliação manual identificada e datada, não cotação real. Adaptador registra vinho, safra, volume, valor/moeda originais, BRL, data, provedor, fonte, tipo, correspondência e aproximação. Não equiparar varejo, oferta, transação e leilão. Outra safra só se a exata faltar, vinho base coincidir e usuário revisar ou rejeitar. Cotação licenciada exata pode substituir avaliação manual, preservando histórico e preferência. Investigar WineAPI, Wine Labs, Liv-ex e Wine-Searcher; nenhum fornecedor aprovado.

**Job:** preparar atualização semanal com deduplicação, cache, incrementos, limites, lock, histórico e falhas; consultas automáticas desligadas até licença e orçamento. Não fabricar pontos de gráfico.

**Painel:** custo histórico das garrafas ativas, valor estimado, diferença somente para garrafas com ambos, contagens com/sem preço, valores confirmados e aproximados, última atualização e totais parciais. Diferença não é lucro realizado. Preparar evolução real, distribuições por país, uva, região e safra, participação e comparação de custo/valor. Preservar compras, câmbio, avaliações, atualizações e retiradas.

**Privacidade:** preço pago privado por padrão; proprietário sempre vê, gerente somente autorizado e visitante não vê valores privados. Aplicar configuração por adega no backend, RLS e exportações; testar isolamento entre contas.

## UX e arquitetura
Navegação Início, Minha adega, Vinhos, Finanças e Perfil; adicionar destacado. Início mostra garrafas, rótulos, capacidade, valor autorizado, recentes e prateleiras. Cadastro progressivo: identificar → revisar → quantidade/aquisição → localização → confirmar. Exigir toque, teclado, safe areas, acessibilidade, erros, carregamento e prateleiras grandes; PWA com manifest e ícones, sem offline complexo.

Manter Next.js/TypeScript, Neon PostgreSQL/Auth/Data API com RLS e Vercel prevista. Separar interface e regras; adaptadores de catálogo, câmbio, preços e IA. Módulos: autenticação, adegas, vinhos, identificação, histórico, avaliações, finanças, mercado, assistente, 3D, compartilhamento e assinaturas. Nenhuma migration autorizada neste plano.

3D mantém IDs e fallback 2D. Sommelier consulta dados autorizados, inicialmente somente leitura; escrita futura exige confirmação. Janela de consumo exige fonte. Compartilhamento exige papéis e links revogáveis; múltiplas adegas exigem migração segura; transferências são separadas. CSV exige prévia e validação. Assinaturas dependem de demanda e webhooks assinados; nunca armazenar cartões.

Cada fase exige implementação, migrations validadas quando cabíveis, testes, persistência real, segurança/RLS, UX mobile, erros, documentação e versionamento. Mocks não provam integração real. Antes do preview: testes, lint/build, backup/restauração, RLS, licenças, variáveis e custos. Produção exige aprovação específica após preview HTTPS, iPhone e testes não destrutivos.

## Histórico de decisões
13/11: proposta original previa foto e finanças; prova de imagem adiada por custo. 17/11: roadmap local registrou fases anteriores 1 e 2 como validadas no Neon, restringiu identificação à busca textual e excluiu finanças. 18/11: finanças retornam ao MVP, foto volta ao escopo e compartilhamento passa para depois. Roadmap preserva texto anterior integralmente; relatos históricos não são testes desta auditoria.
