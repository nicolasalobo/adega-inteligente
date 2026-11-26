# Adega Inteligente — Entrevista de descoberta com o Lobo

**Projeto:** alternativa brasileira ao InVintory (app de gestão de adega pessoal)
**Repo:** `nicolasalobo/adega-inteligente`
**Entrevistador:** Lorenzo · **Entrevistado:** Nicolas Lobo (Wolf🐺)
**Preparação:** 24/11/2026 · **Respostas:** 24/11/2026 · **Formato:** entrevista por texto (WhatsApp)

---

## 0. Resumo em 30 segundos

- **Problema:** saber **o que** tem na adega e **onde** cada garrafa está. Saber quanto vale é bônus.
- **Cliente-piloto:** a vó do Lobo, que tem uma adega em casa sem controle nenhum. Ela é quem impõe os requisitos.
- **Objetivo, em ordem:** virar negócio → resolver o problema da família → portfólio.
- **Meta de 3 meses (~fim de fevereiro/2027):** app na App Store, funcionando sem problemas na adega da vó.
- **Plataforma:** App Store é "quase obrigatório" e Android também importa. Não precisa funcionar offline. Ele tem MacBook.
- **Recursos:** ~2h/dia do Lobo, orçamento R$ 0, sem prazo formal.
- **Estado real:** fases 1–3 prontas na web, mas **nunca testadas com garrafas reais**. O Lobo não entende o código, que foi todo feito pelo fluxo ChatGPT → Codex.
- **Como vamos trabalhar:** o Lorenzo organiza e passa as tarefas. O Lobo quer ser cobrado e aprender, principalmente gestão de projeto.

---

## 1. O que já existia antes da entrevista

| Item | Situação |
|---|---|
| Stack | Next.js 16 + React 19 + TypeScript, PWA, Neon Postgres + Neon Auth (com RLS), Vercel |
| Histórico | ~43 commits entre 18/11 e 24/11/2026, todos em branches `codex/*` |
| Docs | `PRD.md` (v1.4), `ROADMAP.md` (v1.8), `PROPOSTA_TECNICA.md`, `TESTES_APIS.md` |
| Fase 1 (pronta) | Conta, adega única, prateleiras em grid, modo livre vs. organizado por critério, posição única por garrafa, cadastro manual |
| Fase 2 (pronta) | Busca na WineAPI, scanner EAN-13, revisão humana da ficha |
| Fase 3 (pronta) | Mover/trocar, retirada, histórico, avaliação de 1 a 5 estrelas |
| Fases 4–7 (pendentes) | Preço pago/mercado em BRL, foto com IA, QR Code, convites, beta familiar |
| Deploy | Produção na Vercel desativada; só previews |

---

## 2. Respostas

### Bloco A — Origem e motivação
1. **De onde veio a ideia?**
   **R:** Da vó dele, que tem uma adega em casa.
2. **Que adega é a de 2 × (10 × 20) do PRD?**
   **R:** É só um exemplo. ⚠️ O tamanho real da adega da vó ainda é desconhecido.
3. **Como a adega é controlada hoje?**
   **R:** Não é controlada.
4. **Dor principal?**
   **R:** Saber o que tem **e onde está**. Saber quanto vale seria um extra.
5. **Objetivo (ordenado)?**
   **R:** 1) virar negócio, 2) resolver o problema da família, 3) portfólio.

### Bloco B — Usuário e mercado
6. **Usuário principal?**
   **R:** Donos de adega em casa, colecionadores de vinho.
7. **Quem mais usa?**
   **R:** Só o dono. Ele imagina o QR Code como forma de **ver adegas de amigos**, adicionar adegas e ter um sistema de amizades.
8. **Já usou o InVintory?**
   **R:** Nunca.
9. **Diferencial brasileiro?**
   **R:** Preço em reais e custar metade do InVintory.
10. **Conhece outras pessoas com adega?**
    **R:** Só a vó.
11. **Modelo de cobrança?**
    **R:** Plano free + premium de R$ 29,90/mês. Também um serviço de **"instalação"**: na cidade dele, ir pessoalmente e cadastrar a coleção do cliente.

### Bloco C — Funcionalidades e prioridade
12. **As 3 coisas que o app precisa fazer:**
    **R:** 1) saber quais vinhos eu tenho, 2) onde eles estão, 3) cadastro fácil de vinho.
13. **O que já testou com garrafas reais?**
    **R:** Nada ainda.
14. **Classificação das funcionalidades planejadas:**

    | Funcionalidade | Resposta |
    |---|---|
    | Preço pago por garrafa | seria legal |
    | Valor de mercado semanal | seria legal |
    | Conversão PTAX | seria legal |
    | Foto do rótulo com IA | seria legal |
    | QR Code para visitante | seria legal |
    | Convidar familiar | seria legal |
    | **Organizar prateleira por regra** | **preciso** |
    | Sugestão automática de posição | seria legal |

    ⚠️ Ele mandou 9 respostas para 8 itens; a 9ª ("seria legal") ficou sem item. Mapeei na ordem. Confirmar se "preciso" é mesmo o item da regra; a resposta 15 indica que sim.
15. **Organizar por critério foi ideia dele?**
    **R:** Sim. A adega da vó é separada por colunas, uma coluna para cada país.
16. **Rapidez ou precisão no cadastro?**
    **R:** Precisão.
17. **Funcionalidade que falta nos docs?**
    **R:** Lembrete da **janela de consumo**.

### Bloco D — Plataforma
18. **Por que React Native?**
    **R:** Instalar um PWA dá trabalho. É muito mais fácil divulgar um link que leva direto à App Store.
19. **App Store é obrigatório?**
    **R:** "Desejo quase obrigatório." Dá para testar com PWA, mas em algum momento tem que ir para nativo.
20. **Android?**
    **R:** Importa também.
21. **Offline?**
    **R:** Não precisa.
22. **Tem Mac?**
    **R:** Tem MacBook.
23. **Apple Developer?**
    **R:** Ainda não tem; vai criar quando o app estiver pronto e com boa qualidade.

### Bloco E — Estado atual e conhecimento técnico
24. **Consegue rodar localmente?**
    **R:** Tem deploy na Vercel com banco Neon, mas "não entendo nada do código, tudo é caixa-preta".
25. **O que entende do código?**
    **R:** Nada.
26. **Como usava a IA?**
    **R:** Uma aba do ChatGPT "orquestra" e gera prompts, que ele cola no Codex.
27. **Contas/serviços:**
    **R:** Vercel, Neon e WineAPI, todos no nome dele.
28. **Algo pago / cartão cadastrado?**
    **R:** Nada pago e nenhum cartão. A WineAPI está no plano free (100 buscas/dia).
29. **Dados reais no banco?**
    **R:** Só dados de teste.

### Bloco F — Recursos, prazo e orçamento
30. **Horas por semana:**
    **R:** ~2h por dia (~10–14h/semana).
31. **Prazo:**
    **R:** Não tem.
32. **Orçamento mensal:**
    **R:** De preferência R$ 0, escalando com poucos clientes.
33. **Critério concreto de "ficou bom":**
    **R:** Não sabe. → proposta na seção 5.

### Bloco G — Como trabalhar juntos
34. **O que quer aprender:**
    **R:** Tudo, principalmente gestão de projeto.
35. **Divisão:**
    **R:** No começo, o Lorenzo organiza e diz o que ele deve fazer.
36. **Ritual semanal + quadro:**
    **R:** Topa.
37. **Nada na `main` sem PR revisado:**
    **R:** Topa.
38. **Desempate:**
    **R:** Decisões a dois; se discordarem, decide quem idealizou a funcionalidade.

### Bloco H — Fechamento
39. **Sucesso em 3 meses:**
    **R:** Na App Store, com tudo funcionando perfeitamente, testado na adega da vó e atendendo tudo o que ela pedir. A vó é a "cliente" que impõe requisitos e representa o público-alvo.
40. **O que faria abandonar:**
    **R:** Só um empecilho grave que não consigam resolver de jeito nenhum.
41. **Algo mais:**
    **R:** "Preciso ser cobrado para fazer as coisas e quero aprender o máximo possível."

---

## 3. Análise: o que as respostas mudam

### 3.1 O núcleo do produto já foi construído, mas nunca foi validado
As 3 coisas essenciais (o que tenho, onde está, cadastro preciso) mais a única funcionalidade marcada como "preciso" (organizar por regra) **já existem nas fases 1–3**. Quase todo o roadmap pendente (fases 4–7: financeiro, PTAX, foto com IA, QR, convites) ficou como "seria legal".
→ **O PRD atual está superdimensionado.** O próximo passo não é construir mais. É colocar o que existe na frente da adega real da vó.

### 3.2 Precisão > rapidez
Scanner e IA de foto servem para acelerar o cadastro, e esse não é o foco. Cadastro manual mais a busca revisável na WineAPI resolvem o MVP. Foto com IA vai para depois.

### 3.3 Funcionalidade nova: janela de consumo
É barata de fazer: campos "beber a partir de / até" por vinho + uma lista "prontos para beber" + aviso. É também um dos destaques do InVintory. Candidata a entrar no MVP logo depois do núcleo.

### 3.4 QR Code virou "rede social de adegas"
O que ele descreveu (ver adegas de amigos, sistema de amizades) é bem maior que o QR Code somente leitura do PRD. **Fica fora do MVP** e vai para o backlog de ideias.

### 3.5 Negócio: hipóteses que precisam de dado
- **Preço da concorrência.** O InVintory oferece um plano grátis que mantém as funções essenciais e cobra premium por localização 3D, análises da adega e notas profissionais ([App Store](https://apps.apple.com/us/app/invintory-wine-cellar-manager/id1434754695)). O Premium aparecia a US$ 14,95/mês em agosto de 2026 ([Sommo](https://sommo.app/alternatives/invintory/)), uns R$ 89 a ~R$ 5,93/US$. R$ 29,90 dá cerca de **1/3**, não metade.
- **Já existe concorrente nessa faixa de preço.** O Sommo cobra US$ 5/mês (~R$ 30) com adega visual multi-rack e scanner de rótulo ([Sommo](https://sommo.app/alternatives/invintory/)). Ou seja, o diferencial não pode ser só preço. Precisa ser: português, vinhos nacionais bem cobertos, preço em BRL e a **instalação presencial**.
- **A instalação presencial já existe lá fora.** O plano Prestige do InVintory, no lançamento, incluía serviço de importação da coleção feito pela empresa ([Wine Industry Advisor](https://wineindustryadvisor.com/2021/10/07/wine-app-invintory-launches/)). Mesmo assim, feito presencialmente no Brasil, pode ser um bom diferencial local.
- **A loja fica com uma parte.** Assinatura vendida dentro do app iOS/Android paga comissão (15% nos programas para pequenos desenvolvedores). Considerar isso no preço.
- **Validação de mercado: N = 1.** Só conhecemos a vó. Antes de pensar em cobrança, falar com pelo menos 5 donos de adega (amigos da vó, lojas de vinho, confrarias).

### 3.6 Plataforma: proposta de decisão (a discutir)
| Opção | Prós | Contras |
|---|---|---|
| A. Continuar PWA e migrar depois | Já funciona e já está no ar | Não entra na App Store; migração depois sai mais cara |
| **B. Expo (React Native) agora, reaproveitando o banco** | iOS + Android com um só código; caminho direto para a loja; build na nuvem (EAS); Lorenzo já usa Expo no app da academia | Reescrever a interface; validar se o Neon Auth/Data API funciona bem no app (spike) |

**Recomendação: B**, usando o PWA atual só como ferramenta de validação com a vó nas próximas 2 semanas. O que vale aproveitar do projeto atual são **o schema do banco, as migrations e as regras de negócio em SQL** (posição única, regra por prateleira, histórico). A interface (`page.tsx`, 1.270 linhas) não vale migrar.

### 3.7 O maior risco é o processo, não a tecnologia
Foram 43 commits em uma semana, e ninguém do time entende o código. A partir de agora:
- **Todo PR precisa ser explicável por quem abriu.** Se o Lobo não consegue explicar o que o PR faz, o PR não entra.
- IA continua liberada, mas como ajudante em tarefas pequenas e revisadas, não como "orquestrador" do projeto.
- Quem orquestra é o quadro de tarefas e a gente.

---

## 4. Decisões registradas

| # | Decisão | Quem | Status |
|---|---|---|---|
| D1 | A vó é a cliente-piloto e a dona dos requisitos | Lobo | ✅ decidido |
| D2 | MVP = saber o que tem + onde está + cadastro preciso + organizar por regra | Lobo | ✅ decidido |
| D3 | Precisão no cadastro tem prioridade sobre velocidade | Lobo | ✅ decidido |
| D4 | Nada entra na `main` sem PR revisado | ambos | ✅ decidido |
| D5 | Desempate: decide quem idealizou a funcionalidade | ambos | ✅ decidido |
| D6 | Ritual semanal + quadro de tarefas | ambos | ✅ decidido |
| D7 | Orçamento inicial R$ 0 (Apple Developer pago pela vó quando estiver bom) | Lobo | ✅ decidido |
| D8 | Plataforma: Expo/React Native reaproveitando o banco | — | 🟡 proposta, decidir na 1ª call |
| D9 | Financeiro, PTAX, foto IA, QR/social, convites ficam fora do MVP | — | 🟡 proposta, decidir na 1ª call |
| D10 | Janela de consumo entra no MVP como P1 | — | 🟡 proposta, decidir na 1ª call |

---

## 5. Proposta de critério de "pronto" (v1) — validar com a vó

O app está pronto para a App Store quando, **na adega real da vó**:
1. 100% das garrafas estão cadastradas, cada uma na posição física certa.
2. Ela (ou o Lobo) encontra qualquer garrafa no app e na adega em **menos de 30 segundos**.
3. Cadastrar uma garrafa nova leva **menos de 2 minutos**, com os dados conferidos.
4. Retirar uma garrafa atualiza a adega na hora, sem erro de posição.
5. A organização por país/coluna é respeitada pelo app.
6. Ela usa sozinha por **2 semanas** sem precisar chamar o neto para resolver bug.
7. Funciona em iPhone e Android (build de teste via TestFlight / teste interno).

---

## 6. Pendências que a entrevista não resolveu

- [ ] Tamanho real da adega da vó: quantas prateleiras, linhas × colunas, quantas garrafas.
- [ ] A vó usa iPhone ou Android? Ela mesma vai usar o app ou o Lobo opera por ela?
- [ ] Confirmar o mapeamento da questão 14 (9 respostas para 8 itens).
- [ ] Validar o critério de pronto (seção 5) com a vó.
- [ ] Encontrar mais 4–5 donos de adega para conversar.

### Perguntas para o Lobo fazer à vó
1. Como a senhora acha um vinho hoje? Quanto tempo leva?
2. Já aconteceu de esquecer um vinho e ele passar do ponto?
3. Quem mais mexe na adega?
4. Quando compra vinho novo, onde guarda e como decide o lugar?
5. O que deixaria a senhora feliz em um app desses?
6. Tem amigas com adega? Elas usariam um app assim?

---

## 7. Plano das próximas 2 semanas

**Rotina de cobrança:** check-in diário por mensagem (*fiz / vou fazer / travei em*) + call semanal de 30 min (dia a combinar).

### Semana 1 — Conhecer a cliente e o código
| # | Tarefa | Dono | Entregável |
|---|---|---|---|
| L1 | Visitar a adega da vó: fotografar cada prateleira, contar linhas × colunas e garrafas, anotar como está organizada | Lobo | Fotos + planilha com o layout |
| L2 | Fazer as 6 perguntas para a vó (seção 6) | Lobo | Respostas neste doc |
| L3 | Fotografar 10 garrafas reais (rótulo da frente + código de barras) | Lobo | Pasta com as fotos |
| L4 | Cadastrar essas 10 garrafas no PWA atual, recriando a adega real, e anotar **tudo** que for chato, confuso ou quebrado | Lobo | Lista de problemas → viram issues |
| L5 | Rodar o projeto localmente no Mac seguindo o README (com ajuda do Lorenzo) | Lobo + Lorenzo | Print do app rodando em `localhost` |
| Z1 | Criar o GitHub Project (quadro), labels, templates de issue/PR e proteção da `main` | Lorenzo | Quadro configurado |
| Z2 | Spike: app Expo mínimo conectando ao Neon (auth + listar garrafas) | Lorenzo | Branch `spike/expo-neon` + nota com conclusão |

### Semana 2 — Decidir e planejar
| # | Tarefa | Dono | Entregável |
|---|---|---|---|
| L6 | Escrever a **visão do produto em 1 página** (problema, cliente, diferencial, meta de 3 meses) | Lobo (Lorenzo revisa) | `docs/VISAO.md` |
| Z3 | Registrar a decisão de plataforma (ADR) com o resultado do spike | Lorenzo | `docs/adr/0001-plataforma.md` |
| J1 | 1ª call: fechar D8–D10 e o critério de pronto | ambos | Decisões atualizadas aqui |
| J2 | Reescrever o PRD enxuto: só o MVP, o resto vai para "Depois" | ambos | `PRD.md` v2 |
| J3 | Quebrar o MVP em issues pequenas, com critério de aceite | Lorenzo conduz, Lobo escreve metade | Backlog priorizado no quadro |

**Aprendizado do Lobo nessas 2 semanas:** entrevista de cliente, critério de aceite, registro de decisão (ADR), escrever issue e revisar PR.

---

## 8. Backlog de ideias (fora do MVP)
- Preço pago e valor de mercado da coleção (com status confirmado/estimado e conversão PTAX)
- Identificação por foto com IA
- QR Code / rede social de adegas (ver adegas de amigos, amizades)
- Convites para familiares editarem
- Sugestão automática de posição
- Serviço de instalação presencial (modelo de negócio)
- Planos free/premium e assinatura in-app

---

## 9. Anotações livres

-
