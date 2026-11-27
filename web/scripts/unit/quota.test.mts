import assert from "node:assert/strict";
import test from "node:test";
import { checkIdentificationQuota, quotaDeniedMessage } from "../../src/lib/identification/quota";

test("limite liberado não faz a segunda verificação", async () => {
  let checked = false;
  assert.equal(await checkIdentificationQuota(async () => true, async () => { checked = true; return true; }), "allowed");
  assert.equal(checked, false);
});

test("'não' do banco com a adega visível é limite de verdade", async () => {
  assert.equal(await checkIdentificationQuota(async () => false, async () => true), "limit_reached");
});

test("'não' do banco sem enxergar a própria adega é login não reconhecido, não limite", async () => {
  assert.equal(await checkIdentificationQuota(async () => false, async () => false), "login_not_recognized");
});

test("mensagens deixam claro qual dos dois problemas aconteceu", () => {
  assert.match(quotaDeniedMessage("limit_reached", "barcode"), /30 identificações por hora/);
  assert.match(quotaDeniedMessage("limit_reached", "photo"), /5 análises de foto por hora/);
  const login = quotaDeniedMessage("login_not_recognized", "barcode");
  assert.match(login, /não reconheceu o seu login/);
  assert.doesNotMatch(login, /Limite/);
});
