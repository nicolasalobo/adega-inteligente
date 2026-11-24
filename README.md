# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [PRD](PRD.md): escopo, jornadas, regras de negócio, arquitetura e critérios do beta.
- [Roadmap](ROADMAP.md): fases de entrega, ordem obrigatória e critérios de bloqueio.
- [Testes de APIs](TESTES_APIS.md): notas de avaliação dos provedores externos.
- [Proposta técnica](PROPOSTA_TECNICA.md): arquitetura para EAN/foto e gestão financeira, comparação de APIs e estimativas de custos.

## Plano de execução

As Fases 1–2 estão integradas. A Fase 3 está implementada e validada no PR #9, ainda aguardando integração; veja as evidências e os testes pendentes em [TESTES_APIS.md](TESTES_APIS.md). O roadmap posiciona o gate de integração da Fase 3 antes da descoberta técnica, gestão financeira, reconhecimento por foto, compartilhamento familiar e hardening. Esta revisão atualiza o planejamento; não ativa integrações pagas nem altera produção.

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

Clone a branch atual e conecte ao mesmo banco Neon:

```powershell
git clone --branch codex/phase-1-base https://github.com/nicolasalobo/adega-inteligente.git
cd adega-inteligente\web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

O `.env.example` inclui o endereço público do projeto. Entre com a mesma conta para ver os dados sincronizados. Não é preciso instalar Docker; migrations futuras e a seed opcional precisam da connection string privada no `DATABASE_URL`. Detalhes em [web/README.md](web/README.md).
