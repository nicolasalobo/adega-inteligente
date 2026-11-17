# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [PRD](PRD.md): escopo, jornadas, regras de negócio, arquitetura e critérios do beta.
- [Roadmap](ROADMAP.md): fases de entrega, ordem obrigatória e critérios de bloqueio.
- [Testes de APIs](TESTES_APIS.md): notas de avaliação dos provedores externos.

## Plano de execução

O trabalho começa pela **Fase 1 — Base do projeto e adega visual mínima**, com cadastro manual e sem depender de serviços externos. A prova de conceito de reconhecimento (Fase 0) está adiada; será retomada depois da base manual e antes de implementar o cadastro por foto.

Ordem atual: adega visual e cadastro manual → prova de conceito de reconhecimento → cadastro por foto → histórico e preços → QR e família → hardening e expansão.

## Princípios do MVP

- Uma adega por conta proprietária na interface inicial.
- Cada garrafa ocupa uma posição física exclusiva.
- Cadastro manual disponível mesmo quando integrações externas falham.
- Identificação por foto sempre pode ser revisada; dados ausentes permanecem desconhecidos.
- Preços e estimativas mostram fonte, safra e incerteza com clareza.

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
