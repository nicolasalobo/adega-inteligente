# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [PRD](PRD.md): escopo, jornadas, regras de negócio, arquitetura e critérios do beta.
- [Roadmap](ROADMAP.md): fases de entrega, ordem obrigatória e critérios de bloqueio.
- [Testes de APIs](TESTES_APIS.md): notas de avaliação dos provedores externos.

## Beta pessoal protegido

O [beta da Adega Inteligente](https://adega-inteligente-git-codex-fase-5e93b5-nicolas-lobos-projects.vercel.app/) usa o alias estável da branch `codex/fase-2-identificacao`; o endereço não contém `_vercel_share` e continua igual quando essa branch recebe novos deployments. A Vercel exige login da conta autorizada da equipe antes de abrir o aplicativo. A branch Neon vinculada (`fase2-identificacao-validacao-20261118`, `br-round-thunder-be945fsj`) é isolada, não expira e não contém a coleção de produção. Use somente dados de teste.

O projeto Vercel tem Node.js `24.x` e as integrações pagas (OpenAI, Brave e WineAPI) permanecem desligadas. O domínio de produção anexado `adega-inteligente-liard.vercel.app` ainda não tem deployment Production ativo; ele não é o endereço deste beta. Nenhuma versão foi publicada em Production.

### Adicionar à Tela de Início no iPhone

1. Abra o endereço do beta acima no Safari e entre na Vercel com a conta autorizada.
2. Toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
3. Mantenha o nome “Adega Inteligente” e toque em **Adicionar**.

O site inclui manifest, ícones próprios, `display: standalone` e metadados de web app para iPhone. A instalação física, login no modo standalone e permissão real da câmera ainda precisam ser confirmados no iPhone; o scanner depende de HTTPS e de autorização da câmera.

## Plano de execução

Fase 1 concluída. O núcleo da Fase 2 de identificação por EAN e foto está implementado e validado no Neon isolado; OpenAI, Brave e WineAPI permanecem desativados sem credenciais, autorização de custos e licenças. O beta protegido está publicado como Preview na branch estável `codex/fase-2-identificacao`; nenhum deploy Production foi realizado.

Veja no [roadmap](ROADMAP.md) as pendências verificadas e os critérios para as próximas fases.

## Princípios do MVP

- Uma adega por conta proprietária na interface inicial.
- Cada garrafa ocupa uma posição física exclusiva.
- Cadastro manual disponível mesmo quando integrações externas falham.
- Busca textual sugere candidatos; a pessoa revisa os dados antes de cadastrar.

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

Clone a branch atual e conecte ao mesmo banco Neon:

```powershell
git clone --branch codex/phase-1-base https://github.com/nicolasalobo/adega-inteligente.git
cd adega-inteligente\web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

O `.env.example` inclui o endereço público do projeto. Entre com a mesma conta para ver os dados sincronizados. Não é preciso instalar Docker; migrations futuras e a seed opcional precisam da connection string privada no `DATABASE_URL`. Detalhes em [web/README.md](web/README.md).
