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

A arquitetura proposta no PRD usa Next.js com TypeScript e banco relacional. A escolha de provedores externos fica para quando a Fase 0 for retomada.

### Rodar a interface

```powershell
cd web
npm ci
npm run dev
```

Sem variáveis de Supabase, a aplicação abre uma demonstração local e salva as alterações neste navegador. Para usar login e persistência no Postgres local, consulte [web/README.md](web/README.md).

### Rodar no notebook com banco de desenvolvimento

Clone a branch atual e prepare o ambiente local:

```powershell
git clone --branch codex/phase-1-base https://github.com/nicolasalobo/adega-inteligente.git
cd adega-inteligente\web
npm ci
npm run db:start
npm run db:seed
npm run dev
```

É necessário instalar e abrir Docker Desktop antes de `npm run db:start`. O banco e a seed ficam no notebook e não sincronizam com este PC.
