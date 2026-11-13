# Adega inteligente

Aplicativo para organizar uma adega pessoal, registrar cada garrafa em uma posição física e consultar a coleção com segurança.

## Documentos

- [PRD](PRD.md): escopo, jornadas, regras de negócio, arquitetura e critérios do beta.
- [Roadmap](ROADMAP.md): fases de entrega, ordem obrigatória e critérios de bloqueio.
- [Testes de APIs](TESTES_APIS.md): notas de avaliação dos provedores externos.

## Plano de execução

O trabalho começa pela **Fase 0 — Prova de conceito de reconhecimento**. O resultado do benchmark orientará a escolha de provedores antes da implementação do cadastro por foto. A aplicação deve continuar permitindo cadastro manual sem depender de serviços externos.

Ordem prevista: prova de conceito → adega visual → cadastro por foto → histórico e preços → QR e família → hardening e expansão.

## Princípios do MVP

- Uma adega por conta proprietária na interface inicial.
- Cada garrafa ocupa uma posição física exclusiva.
- Cadastro manual disponível mesmo quando integrações externas falham.
- Identificação por foto sempre pode ser revisada; dados ausentes permanecem desconhecidos.
- Preços e estimativas mostram fonte, safra e incerteza com clareza.

## Desenvolvimento

A arquitetura proposta no PRD usa Next.js com TypeScript e banco relacional. As decisões de provedores externos serão tomadas após o benchmark da Fase 0.
