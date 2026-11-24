# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [PRD](PRD.md): escopo, jornadas, regras de negócio, arquitetura e critérios do beta.
- [Roadmap](ROADMAP.md): fases de entrega, ordem obrigatória e critérios de bloqueio.
- [Testes de APIs](TESTES_APIS.md): notas de avaliação dos provedores externos.
- [Proposta técnica](PROPOSTA_TECNICA.md): arquitetura para EAN/foto e gestão financeira, comparação de APIs e estimativas de custos.

## Plano de execução

As Fases 1–3 estão integradas em `main`. A Fase 3 foi validada antes do merge no Preview e na branch Neon descartável; o merge do PR #9 não publicou em produção. As evidências históricas e os gates de produção estão em [TESTES_APIS.md](TESTES_APIS.md). A Fase 4 começa pela gestão manual do preço pago, sem APIs pagas; cotações automatizadas e reconhecimento por foto continuam planejados.

O escopo de produto inclui preço pago, estimativa de mercado e reconhecimento por foto. O scanner EAN-13 continua sendo o caminho principal; dados sugeridos por EAN, busca web ou IA exigem revisão humana.

## Princípios do MVP

- Uma adega por conta proprietária na interface inicial.
- Cada garrafa ocupa uma posição física exclusiva.
- Cadastro manual disponível mesmo quando integrações externas falham.
- Busca textual sugere candidatos; a pessoa revisa os dados antes de cadastrar.
- Cada nova compra exige preço pago por garrafa na moeda original; todos os totais são apresentados em BRL, com conversão histórica ou equivalente manual identificado.
- Cotações de mercado são atualizadas semanalmente ou manualmente e distinguem valores confirmados, estimados e desconhecidos; todos os totais são em BRL e preço pago/mercado têm controles de privacidade independentes.
- Safra incerta nunca é inventada nem confirmada automaticamente.

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
