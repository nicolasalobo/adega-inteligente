# Aplicação web

## Desenvolvimento local

```powershell
npm ci
npm run dev
```

Sem configurar Supabase, a aplicação abre uma demonstração com vinhos de exemplo. Cadastros são gravados no `localStorage` deste navegador e não são sincronizados com outros dispositivos.

## Banco e autenticação locais

O projeto inclui migrations do Supabase. Para iniciar a stack local, é necessário ter Docker Desktop instalado e em execução:

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

Copie a URL local da API e a chave publicável local para `web/.env.local`, usando `web/.env.example` como modelo, e reinicie `npm run dev`. A chave publicável pode estar no navegador; não coloque chaves `service_role` ou `sb_secret` neste arquivo.

A aplicação cria uma adega inicial para uma conta autenticada. O cadastro em lote usa uma função transacional; o Postgres valida dimensões, compatibilidade de prateleira e ocupação exclusiva. As tabelas têm RLS por proprietário.

## Rodar em outro computador

Depois de clonar o repositório, entre nesta pasta (`web`) e execute `npm ci` e `npm run dev`. Sem Supabase configurado, a demonstração local funciona sem Docker; os dados ficam apenas no navegador desse computador.

Para rodar também o banco Supabase local, instale e abra Docker Desktop e execute `npx supabase start`, `npx supabase db reset` e `npx supabase status`. Copie a URL local e a chave publicável exibidas pelo último comando para `.env.local`, conforme `.env.example`, e reinicie o app. O banco local de cada computador é independente.
