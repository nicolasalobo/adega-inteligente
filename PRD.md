# PRD — Adega Inteligente 2.0

> **Fase 1 concluída — 18/11/2026:** em projeto Neon separado `adega-fase1-validacao`, branch `fase1-migracoes` sem expiração (`br-divine-math-bekaxx31`), Neon Auth e Data API provisionaram os esquemas gerenciados necessários. Sem tabelas prévias da aplicação, migrations 0001–0006 foram aplicadas em ordem; duas contas reais e RLS passaram na branch limpa. Dados descartáveis foram preservados em `fase1-snapshot` e restaurados em `fase1-restauracao` após alteração da origem: dados, 7 tabelas, 6 funções, 6 políticas, ACLs/RLS e 6 migrations conferidos. A restauração usa branches do mesmo provedor e não comprova recuperação de desastre independente. Playwright validou criação em lote, recarga, movimento, troca, avaliação, retirada e quatro eventos de histórico persistidos. Testes de iPhone físico permanecem na Fase 3. Nenhuma migration ou escrita ocorreu na produção.
> **Validação da Fase 1 — 18/11/2026:** branch Neon isolada `teste-fase1-adega` (`br-purple-dawn-b6f9zebw`), filha de `production` (`br-small-meadow-b66kpzw6`), com expiração em 19/11. O PostgreSQL confirmou o ID de teste; as migrations 0001–0006 constavam no registro da cópia. A tentativa de recriá-las em uma transação sobre esquema limpo falhou por dependência do esquema gerenciado `auth`; rollback confirmado, sem validação de instalação limpa ou restauração de backup. Três testes passaram: regras/média com dados próprios e rollback; duas contas reais Neon Auth e RLS via Data API, incluindo prateleiras, lote, movimento, troca, retirada, histórico e avaliação; disputa de posição em duas conexões (uma aceita e outra rejeitada). No navegador: cadastro, pesquisa WineAPI, revisão, cadastro em lote e sessão/inventário após recarga passaram; ações de movimento na interface não foram concluídas por bloqueio do diálogo de navegador. Lint, TypeScript, build e npm audit passaram; zero vulnerabilidades após atualização compatível de dependências de desenvolvimento. **Fase 1 não concluída:** faltam validar instalação limpa das migrations no ambiente Neon com seus componentes gerenciados, restauração de backup e completar os fluxos de interface/erros e regressão no celular. Nenhuma migration ou escrita foi executada em produção.
> **Atualização de consolidação — 18/11/2026:** o código antes descrito como local foi preservado no commit `e983c36` e integrado nesta branch junto com o planejamento `2a07fa2`. A descrição abaixo registra o estado na auditoria anterior. `npm ci`, lint e build (incluindo TypeScript) passaram; `node --check` passou para os scripts do teste e de ambiente. O teste transacional do Neon não foi executado: falta identificar inequivocamente um banco de teste isolado. As migrations aplicadas, persistência, concorrência, RLS e fluxos reais continuam sem validação nesta etapa. O npm audit indicou sete vulnerabilidades moderadas em dependências transitivas de desenvolvimento; nenhuma correção foi aplicada. As funcionalidades de movimentação, histórico e avaliações estão implementadas no código, mas continuam parciais até validação ponta a ponta.
**18/11/2026 — proposta para revisão.** Plataforma brasileira mobile-first para gerir garrafas, posições, custo histórico, valor estimado e consumo, com identidade própria e ambição de competir com InVintory. SaaS e implantação presencial são objetivos posteriores; português brasileiro e BRL são padrão. Não há paridade comprovada.

## Estado auditado
Inspeção estática de documentos, código, branches e migrations, sem executar testes, aplicação ou banco. HEAD local `5456cb8`, remoto de trabalho `37e0311` e `origin/main` `00e3d91`; existem alterações locais não commitadas que precisam ser reconciliadas. Esta branch documental parte do remoto de trabalho; não incorpora esse código local. Não foi verificado quais migrations estão aplicadas.

| Funcionalidade | Estado observado |
|---|---|
| Autenticação, prateleiras, modos livre/estruturado, cadastro manual, lote e posições | Existente; histórico local relata validação Neon, não repetida nesta sessão. Requer regressão. |
| Busca WineAPI e revisão | Parcial e dependente de fornecedor; rotas e fluxo locais, licença comercial e robustez pendentes. |
| Movimento, troca, retirada, histórico, avaliações e médias | Parcial local; UI, serviços, migrations 0005–0006 e script presentes, sem verificação atual de banco, RLS ou E2E. |
| Mobile | Parcial; CSS responsivo, sem aceite em iPhone. |
| Finanças, EAN, foto, IA, PWA, 3D, compartilhamento e assinaturas | Ausentes no código inspecionado; integrações podem depender de fornecedor. |

Demo local não comprova persistência Neon. README e TESTES_APIS refletem decisões anteriores e devem ser reconciliados na fase 1.

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
