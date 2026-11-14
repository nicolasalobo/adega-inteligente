# Aplicação web

## Desenvolvimento local

```powershell
npm ci
npm run dev
```

Sem configurar Supabase, a aplicação abre uma demonstração com vinhos de exemplo. Cadastros são gravados no `localStorage` deste navegador e não são sincronizados com outros dispositivos.

## Banco e autenticação locais

O projeto inclui migrations do Supabase e uma seed local com um usuário de desenvolvimento, sete rótulos e 26 garrafas. Instale e abra Docker Desktop antes destes comandos:

```powershell
npm run db:start
npm run db:seed
npm run dev
```

`db:seed` cria `.env.local` com a URL e a chave publicável locais, cria a conta de desenvolvimento e exibe o e-mail e a senha no terminal. A chave secreta só é usada pelo script e não é gravada em arquivo.

Essas credenciais são exclusivas do Supabase local; não as use em um projeto hospedado.

Cada computador tem seu próprio banco local; os dados não sincronizam entre máquinas. Para limpar e reconstruir o banco, execute `npm run db:reset` e depois `npm run db:seed`; o reset apaga os dados desse banco local.

O cadastro em lote usa uma função transacional; o Postgres valida dimensões, compatibilidade da prateleira e ocupação exclusiva. As tabelas têm RLS por proprietário.
