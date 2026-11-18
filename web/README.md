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

Para testar as regras no Neon, configure DATABASE_URL e execute `npm run test:phase3`. O teste cria dados temporários em uma transação e os reverte ao terminar.

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
