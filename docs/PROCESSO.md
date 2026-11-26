# Como trabalhamos

Combinado na [entrevista de descoberta](ENTREVISTA_DESCOBERTA.md) (decisões D4–D6) e no [MVP](MVP.md).

## Regras
- **Nada entra na `main` sem PR revisado.**
- **Todo PR tem a seção "Explicação para o Lobo"**. Se quem abriu não consegue explicar o PR, ele não entra.
- **PRs pequenos**: um assunto por PR. A ordem dos PRs do MVP está no [roadmap](../ROADMAP.md).
- **Na dúvida sobre o produto, pergunte** na issue ou no PR, em vez de inventar.
- **Desempate:** decide quem idealizou a funcionalidade.

## Rotina
- **Check-in diário** por mensagem: *fiz / vou fazer / travei em*.
- **Call semanal** de 30 minutos: revisar o quadro e decidir o que entra na semana.

## Modelos no GitHub
Já estão neste repositório e aparecem sozinhos:
- **Pull request**: `.github/pull_request_template.md`
- **Issues**: "Tarefa" (com critério de aceite) e "Problema" (bug), em `.github/ISSUE_TEMPLATE/`

## Configurar uma vez (manual, no site do GitHub)
Essas configurações não ficam em arquivo; quem tem acesso de admin ao repositório faz pelo site.

### 1. Proteger a `main`
*Settings → Branches → Add branch ruleset* (ou *Add rule*), para a branch `main`:
- [x] Require a pull request before merging
  - [x] Require approvals: **1**
- [x] Require status checks to pass: marcar **verify** (o CI)
- [x] Block force pushes

### 2. Labels
*Issues → Labels → New label*. As duas primeiras já são usadas pelos modelos de issue:

| Label | Para quê |
|---|---|
| `tarefa` | algo para construir ou mudar |
| `bug` | algo quebrado (já existe por padrão) |
| `mvp` | faz parte do MVP |
| `pós-mvp` | ideia para depois do MVP |
| `dúvida de produto` | precisa de decisão antes de começar |
| `bom para aprender` | tarefa pequena, boa para o Lobo pegar |

### 3. Quadro (GitHub Project)
*Projects → New project → Board*, ligado a este repositório, com as colunas:

**A fazer → Fazendo → Em revisão → Pronto**

- Cada PR do MVP (tabela do [roadmap](../ROADMAP.md)) vira uma issue "Tarefa" no quadro.
- Os problemas encontrados no teste com garrafas reais (tarefa L4 da entrevista) viram issues "Problema".
