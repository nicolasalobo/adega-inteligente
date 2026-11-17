# Aplicação web

## Desenvolvimento

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

O `.env.example` já aponta para o banco compartilhado do projeto. Use a mesma conta em qualquer computador para ver a mesma adega. Sem `NEXT_PUBLIC_NEON_DATABASE_URL`, a aplicação abre uma demonstração salva apenas neste navegador.

## Busca de vinhos na WineAPI

Para ativar a busca no cadastro, gere uma chave em **API Keys** no dashboard da WineAPI e coloque-a em `WINEAPI_API_KEY` no arquivo local `.env.local`. Não use o prefixo `NEXT_PUBLIC_` nessa variável: a chave é lida somente pelas rotas do servidor. Depois, reinicie `npm run dev`. O arquivo `.env.local` já é ignorado pelo Git.

As rotas de busca exigem uma sessão ativa na adega e chamam a WineAPI pelo servidor. A seleção de um resultado carrega os detalhes da ficha; revise os campos preenchidos antes de salvar. Se não houver resultado ou a API estiver indisponível, o cadastro manual continua disponível.

## Banco e autenticação

O projeto usa Neon Postgres, Neon Auth e a Data API. O cadastro cria a adega e a primeira prateleira; login e consultas usam o endereço público do endpoint, sem senha do banco no navegador. O Postgres aplica RLS para separar os dados por proprietário.

A estrutura já está aplicada no banco compartilhado. Para aplicar migrations novas, copie a connection string direta do botão **Connect** no Neon para `DATABASE_URL` dentro de `.env.local` e execute:

```powershell
npm run db:migrate
```

Mantenha `DATABASE_URL` local e privada. O app normal só precisa de `NEXT_PUBLIC_NEON_DATABASE_URL`.

## Dados de demonstração

Depois de criar uma conta no app, a seed opcional adiciona sete rótulos e 26 garrafas em duas prateleiras. Ela pede o e-mail da conta e usa `DATABASE_URL` local. Uma adega que já tenha garrafas não é alterada.

```powershell
npm run db:seed
```

Como o banco é compartilhado na nuvem, os dados aparecem no notebook e neste PC após entrar na mesma conta. Não é necessário instalar Docker.
