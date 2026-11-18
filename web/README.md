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

## Histórico e avaliações

A tela Histórico apresenta movimentações e retiradas, incluindo origem, destino, data e motivo. Garrafas retiradas continuam disponíveis para avaliação pelo histórico. A nota (1 a 5) e o comentário são opcionais individualmente; informe ao menos um deles. A média de cada vinho considera todas as notas, inclusive das garrafas retiradas, e desconsidera avaliações somente com comentário.

Para testar as regras no Neon, use exclusivamente uma branch de teste isolada e siga as instruções de regressão abaixo. O teste cria dados temporários em uma transação e os reverte ao terminar.

### Regressão em branch Neon isolada

Os testes escrevem dados temporários. Crie e confirme uma branch de teste separada antes de executar; nunca aponte `DATABASE_URL` para produção. Configure os IDs obtidos no console Neon, não nomes de branches:

```powershell
$env:TEST_NEON_BRANCH_ID = 'br-id-da-branch-de-teste'
$env:TEST_NEON_PRODUCTION_BRANCH_ID = 'br-id-da-branch-de-producao'
npm run test:phase3
npm run test:auth-rls
npm run test:concurrency
```

Os scripts conferem `neon.branch_id` na conexão e exigem IDs distintos; a confirmação da identidade da branch de produção no console continua necessária. Use credenciais e endpoint exclusivos da branch de teste. `test:phase3` usa transação revertida e JWT simulado; `test:auth-rls` cria duas contas reais de teste pela Neon Auth, verifica permissões pela Data API e apaga seus registros; concorrência usa duas conexões e apaga os próprios registros. Interrupções podem deixar registros de teste. Não execute em uma branch que contenha dados de produção não isolados.

### Preparação limpa de uma branch Neon

Em uma branch de teste sem dados da aplicação, inicialize Neon Auth e ative a Data API com Neon Auth **antes** das migrations. A ativação provisiona o esquema gerenciado `auth` e `auth.uid()`, enquanto Neon Auth fornece `neon_auth.user`; as migrations dependem desses componentes. Não apague nem recrie esquemas gerenciados. Confirme o projeto e a branch da connection string antes de executar `npm run db:migrate`. Esta instrução não autoriza migrations em produção.

### Teste de interface

Instale o Chromium com `npx playwright install chromium`, ou configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE` para um Chrome/Chromium compatível. Em terminal separado, inicie a aplicação em `http://localhost:3101` com `NEXT_PUBLIC_NEON_DATABASE_URL` apontando para a mesma branch Neon isolada de `DATABASE_URL`. Em seguida, configure `TEST_NEON_BRANCH_ID` e `TEST_NEON_PRODUCTION_BRANCH_ID` como acima e execute `npm run test:ui-e2e`. O teste cria uma conta descartável, bloqueia requisições a outros endpoints Neon e remove seus registros ao terminar; interrupções podem deixar dados de teste.

### Exercício de recuperação

Um procedimento validado em 18/11/2026 criou uma branch-snapshot contendo dados descartáveis e, depois de alterar a origem, criou uma segunda branch a partir do snapshot. Foram comparados registros, migrations, definições de funções, ACLs, tabelas e políticas/RLS. Branches Neon são cópias do mesmo provedor, sujeitas a cotas e retenção; este exercício não substitui uma política de backup independente e recuperação de desastre.
