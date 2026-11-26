# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [MVP](docs/MVP.md): escopo do MVP, ordem dos PRs e definição de pronto. **Comece por aqui.** Prevalece sobre os demais documentos em caso de conflito.
- [PRD](PRD.md): requisitos, regras de negócio e telas do MVP.
- [Roadmap](ROADMAP.md): PRs do MVP, fases já concluídas e backlog pós-MVP.
- [Entrevista de descoberta](docs/ENTREVISTA_DESCOBERTA.md): respostas do dono do produto, análise e decisões.
- [Testes de APIs](TESTES_APIS.md): avaliação dos provedores externos e evidências das fases 1–3.
- [Proposta técnica](PROPOSTA_TECNICA.md): arquitetura de EAN/foto e financeiro, comparação de APIs e custos. Referência para o backlog pós-MVP.

## Plano de execução

As Fases 1–3 (adega visual, cadastro com WineAPI/EAN, histórico e avaliações) estão integradas em `main`, mas ainda não foram testadas com garrafas reais. O trabalho atual é o MVP descrito em [docs/MVP.md](docs/MVP.md): consolidar, simplificar e completar esse núcleo para a adega real da cliente-piloto, organizada por colunas, uma por país. Financeiro, foto com IA, QR Code e convites ficaram no backlog pós-MVP do [roadmap](ROADMAP.md). A publicação em produção continua desativada.

## Princípios do MVP

- Saber quais vinhos tenho e onde cada garrafa está (prateleira, linha, coluna).
- Precisão no cadastro vale mais que rapidez; a pessoa sempre revisa a ficha antes de salvar.
- Uma adega por conta; cada garrafa ocupa uma posição física exclusiva.
- Prateleiras podem ter regra (ex.: cada coluna = um país), e o app recusa garrafas incompatíveis.
- Cadastro manual sempre disponível, mesmo quando a WineAPI ou o EAN falham.
- Dado incerto, como uma safra, fica desconhecido; nunca é preenchido automaticamente.
- Orçamento R$ 0: nenhuma API paga habilitada.
- Regras de negócio no banco ou em `web/src/lib/`, para poderem ser reaproveitadas num app nativo.

## Desenvolvimento

A aplicação usa Next.js com TypeScript, Neon Postgres e Neon Auth no plano gratuito. A Data API permite que o app sincronize os dados pela internet, com RLS por proprietário. O plano gratuito tem cotas mensais; consulte [os limites atuais](https://neon.com/pricing).

### Rodar a interface

```powershell
cd web
npm ci
npm run dev
```

Copie `web/.env.example` para `web/.env.local` e rode os comandos acima. Sem `NEXT_PUBLIC_NEON_DATABASE_URL`, a aplicação abre uma demonstração local e salva as alterações neste navegador.

### Rodar no notebook com banco de desenvolvimento

Clone `main` e conecte ao ambiente de desenvolvimento persistente `fase4-dev-persistente-20261124` (branch Neon `br-falling-base-beux9a0a`):

```powershell
git clone https://github.com/nicolasalobo/adega-inteligente.git
cd adega-inteligente\web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

O `.env.example` aponta ao endpoint público desse branch; a autenticação local usa `localhost`. O banco está vazio nas tabelas da aplicação e já tem as migrations 0001–0009. Use apenas contas e dados sintéticos. `DATABASE_URL` e `DATABASE_URL_POOLED` ficam vazios por padrão para impedir que comandos administrativos atinjam o endpoint anterior; ao precisar deles, configure `DATABASE_URL` com a conexão direta copiada do botão **Connect** desse branch, nunca a conexão de produção. Não é preciso instalar Docker. Detalhes em [web/README.md](web/README.md).
