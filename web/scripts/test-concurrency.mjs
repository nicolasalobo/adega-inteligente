import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { getNeonDatabaseUrl } from './neon-env.mjs';

const expected = process.env.TEST_NEON_BRANCH_ID;
const productionBranch = process.env.TEST_NEON_PRODUCTION_BRANCH_ID;
if (!productionBranch || productionBranch === expected) throw new Error('Informe o ID da branch de produção, distinto da branch de teste.');
if (!expected || !/^br-[a-z0-9-]+$/.test(expected)) throw new Error('Defina TEST_NEON_BRANCH_ID com a branch isolada.');
const clients = Array.from({length: 2}, () => new Client({connectionString: getNeonDatabaseUrl()}));
let user;
try {
  for (const client of clients) {
    await client.connect();
    const branch = (await client.query("select current_setting('neon.branch_id', true) id")).rows[0].id;
    if (branch !== expected) throw new Error('Conexão não corresponde à branch de teste.');
  }
  const [a,b] = clients;
  user = (await a.query('insert into neon_auth."user" (name,email,"emailVerified") values ($1,$2,false) returning id',['Concorrência',`concorrencia-${randomUUID()}@example.invalid`])).rows[0].id;
  const cellar = (await a.query("insert into public.cellars(owner_id,name) values ($1,'Concorrência teste') returning id",[user])).rows[0].id;
  const shelf = (await a.query("insert into public.shelves(cellar_id,name,row_count,column_count) values ($1,'Teste',1,1) returning id",[cellar])).rows[0].id;
  const wine = (await a.query("insert into public.wines(cellar_id,name,producer) values ($1,'Teste','Teste') returning id",[cellar])).rows[0].id;
  const sql='insert into public.bottles(cellar_id,wine_id,shelf_id,row_number,column_number) values ($1,$2,$3,1,1)';
  await a.query('begin');
  await b.query('begin');
  await a.query(sql,[cellar,wine,shelf]);
  const contender = b.query(sql,[cellar,wine,shelf]).then(() => null, error => error);
  await a.query('commit');
  const error=await contender;
  assert.equal(error?.code,'23505','a segunda conexão deve receber violação de unicidade');
  await b.query('rollback');
  assert.equal((await a.query('select count(*)::int n from public.bottles where shelf_id=$1 and status=\'active\'',[shelf])).rows[0].n,1);
  console.log('Duas conexões disputaram a mesma posição: uma gravação, outra rejeitada (23505).');
} finally {
  for (const client of clients) { try { await client.query('rollback'); } catch {} }
  if (user) {
    const a=clients[0];
    await a.query('delete from public.bottles where cellar_id in (select id from public.cellars where owner_id=$1)',[user]);
    await a.query('delete from public.wines where cellar_id in (select id from public.cellars where owner_id=$1)',[user]);
    await a.query('delete from public.shelves where cellar_id in (select id from public.cellars where owner_id=$1)',[user]);
    await a.query('delete from public.cellars where owner_id=$1',[user]);
    await a.query('delete from neon_auth."user" where id=$1',[user]);
  }
  for (const client of clients) await client.end();
}
