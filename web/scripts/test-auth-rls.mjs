import assert from 'node:assert/strict';
import {randomUUID, randomBytes} from 'node:crypto';
import {Client} from 'pg';
import {getNeonDatabaseUrl} from './neon-env.mjs';
const expected=process.env.TEST_NEON_BRANCH_ID;
const productionBranch=process.env.TEST_NEON_PRODUCTION_BRANCH_ID;
if(!productionBranch || productionBranch===expected) throw new Error('Informe o ID da branch de produção, distinto da branch de teste.');
if(!expected || !/^br-[a-z0-9-]+$/.test(expected)) throw new Error('Defina TEST_NEON_BRANCH_ID para a branch de teste isolada.');
const connection=getNeonDatabaseUrl(), parsed=new URL(connection), host=parsed.hostname.split('.')[0];
const rest=`https://${host}.apirest.${parsed.hostname.split('.').slice(1).join('.')}/${parsed.pathname.slice(1)}/rest/v1`;
const auth=`https://${host}.neonauth.${parsed.hostname.split('.').slice(1).join('.')}/${parsed.pathname.slice(1)}/auth`;
const db=new Client({connectionString:connection});await db.connect();const users=[];
const headers={origin:'http://localhost:3000','content-type':'application/json'};
async function request(url, options={}){const r=await fetch(url,options);let body=await r.text();try{body=JSON.parse(body)}catch{}return {r,body};}
try {
 const actual=(await db.query("select current_setting('neon.branch_id',true) id")).rows[0].id;
 if(actual!==expected)throw new Error('Conexão não corresponde à branch de teste.');
 async function setup(){
  const email=`fase1-${randomUUID()}@example.invalid`,password=randomBytes(18).toString('hex');
  let signup=await request(auth+'/sign-up/email',{method:'POST',headers,body:JSON.stringify({email,password,name:'Teste fase 1',callbackURL:'http://localhost:3000'})});
  assert.equal(signup.r.status,200,`cadastro: ${JSON.stringify(signup.body)}`);
  const id=signup.body.user.id;users.push(id);
  let login=await request(auth+'/sign-in/email',{method:'POST',headers,body:JSON.stringify({email,password})});
  assert.equal(login.r.status,200,`login: ${JSON.stringify(login.body)}`);
  let cookie=login.r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(cookie);
  const session=await request(auth+'/get-session',{headers:{...headers,cookie}});assert.equal(session.r.status,200);assert.equal(session.body.user.id,id);
  const jwt=await request(auth+'/token',{headers:{...headers,cookie}});assert.equal(jwt.r.status,200);assert.ok(jwt.body.token);
  const access={authorization:`Bearer ${jwt.body.token}`,'content-type':'application/json',prefer:'return=representation'};
  const cellar=await request(rest+'/cellars',{method:'POST',headers:access,body:JSON.stringify({owner_id:id,name:'Adega teste fase 1'})});
  assert.ok(cellar.r.ok,`criação adega: ${JSON.stringify(cellar.body)}`);
  return {id,cellar:cellar.body[0].id,access};
 }
 const a=await setup(),b=await setup();
 const shelf=await request(rest+'/shelves',{method:'POST',headers:a.access,body:JSON.stringify({cellar_id:a.cellar,name:'Prateleira teste',row_count:2,column_count:3,organization:'free'})});
 assert.ok(shelf.r.ok,`criação de prateleira: ${JSON.stringify(shelf.body)}`);const shelfId=shelf.body[0].id;
 const edit=await request(`${rest}/shelves?id=eq.${shelfId}`,{method:'PATCH',headers:a.access,body:JSON.stringify({name:'Prateleira editada'})});assert.ok(edit.r.ok);assert.equal(edit.body[0].name,'Prateleira editada');
 const register={p_cellar_id:a.cellar,p_shelf_id:shelfId,p_wine:{name:'Vinho teste',producer:'Produtor teste',vintage:'2020'},p_positions:[{row:1,column:1},{row:1,column:2}]};
 const batch=await request(rest+'/rpc/register_wine_bottles',{method:'POST',headers:a.access,body:JSON.stringify(register)});assert.ok(batch.r.ok,`cadastro: ${JSON.stringify(batch.body)}`);assert.equal(batch.body[0].bottle_ids.length,2);
 const duplicate=await request(rest+'/rpc/register_wine_bottles',{method:'POST',headers:a.access,body:JSON.stringify({...register,p_positions:[{row:2,column:1},{row:2,column:1}]})});assert.ok(!duplicate.r.ok,'posições repetidas devem ser rejeitadas');
 const again=await request(rest+'/rpc/register_wine_bottles',{method:'POST',headers:a.access,body:JSON.stringify({...register,p_positions:[{row:2,column:1}]})});assert.ok(again.r.ok);assert.equal(again.body[0].wine_id,batch.body[0].wine_id);
 const bottles=await request(`${rest}/bottles?cellar_id=eq.${a.cellar}`,{headers:a.access});assert.equal(bottles.body.length,3);
 const [first,second]=batch.body[0].bottle_ids;
 const rpc=async (name,body)=>request(`${rest}/rpc/${name}`,{method:'POST',headers:a.access,body:JSON.stringify(body)});
 const moved=await rpc('move_bottle',{p_cellar_id:a.cellar,p_bottle_id:first,p_shelf_id:shelfId,p_row:1,p_column:3});assert.ok(moved.r.ok,`movimento: ${JSON.stringify(moved.body)}`);
 const swapped=await rpc('swap_bottles',{p_cellar_id:a.cellar,p_first:first,p_second:second});assert.ok(swapped.r.ok,`troca: ${JSON.stringify(swapped.body)}`);
 const removed=await rpc('remove_bottle',{p_cellar_id:a.cellar,p_bottle_id:first,p_reason:'consumida'});assert.ok(removed.r.ok,`retirada: ${JSON.stringify(removed.body)}`);
 const review=await request(rest+'/bottle_reviews',{method:'POST',headers:a.access,body:JSON.stringify({cellar_id:a.cellar,bottle_id:first,rating:4,comment:'Teste'})});assert.ok(review.r.ok,`avaliação: ${JSON.stringify(review.body)}`);
 const history=await request(`${rest}/bottle_movements?cellar_id=eq.${a.cellar}`,{headers:a.access});assert.equal(history.body.length,4);
 const ratings=await request(`${rest}/bottle_reviews?cellar_id=eq.${a.cellar}`,{headers:a.access});assert.equal(ratings.body[0].rating,4);
 let own=await request(`${rest}/cellars?id=eq.${a.cellar}`,{headers:a.access});assert.equal(own.r.status,200);assert.equal(own.body.length,1);
 let other=await request(`${rest}/cellars?id=eq.${b.cellar}`,{headers:a.access});assert.equal(other.r.status,200);assert.equal(other.body.length,0);
 let denied=await request(rest+'/shelves',{method:'POST',headers:a.access,body:JSON.stringify({cellar_id:b.cellar,name:'Não autorizado',row_count:1,column_count:1,organization:'free'})});assert.ok(!denied.r.ok,'gravação cruzada deve ser bloqueada');
 let reciprocal=await request(`${rest}/cellars?id=eq.${a.cellar}`,{headers:b.access});assert.equal(reciprocal.r.status,200);assert.equal(reciprocal.body.length,0);
 for(const table of ['shelves','wines','bottles','bottle_movements','bottle_reviews']){
  const hidden=await request(`${rest}/${table}?cellar_id=eq.${a.cellar}`,{headers:b.access});assert.equal(hidden.r.status,200,`leitura ${table}`);assert.equal(hidden.body.length,0,`RLS de ${table}`);
 }
 const forbiddenMove=await request(rest+'/rpc/move_bottle',{method:'POST',headers:b.access,body:JSON.stringify({p_cellar_id:a.cellar,p_bottle_id:second,p_shelf_id:shelfId,p_row:2,p_column:2})});assert.ok(!forbiddenMove.r.ok,'RPC de outra conta deve ser bloqueada');
 const forbiddenReview=await request(rest+'/bottle_reviews',{method:'POST',headers:b.access,body:JSON.stringify({cellar_id:a.cellar,bottle_id:second,rating:5})});assert.ok(!forbiddenReview.r.ok,'avaliação de outra conta deve ser bloqueada');
 console.log('Duas contas reais: autenticação, prateleiras, lote, movimento, troca, retirada, histórico, avaliação e RLS cruzada aprovados.');
} finally {
 for(const id of users){await db.query('delete from public.bottles where cellar_id in (select id from public.cellars where owner_id=$1)',[id]);await db.query('delete from public.wines where cellar_id in (select id from public.cellars where owner_id=$1)',[id]);await db.query('delete from public.shelves where cellar_id in (select id from public.cellars where owner_id=$1)',[id]);await db.query('delete from public.cellars where owner_id=$1',[id]);await db.query('delete from neon_auth."user" where id=$1',[id]);}
 await db.end();
}
