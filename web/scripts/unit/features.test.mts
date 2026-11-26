import assert from "node:assert/strict";
import test from "node:test";
import { isFlagOn, readFeatures } from "../../src/lib/features";

test("flags ficam desligadas por padrão e com qualquer valor diferente de true/1", () => {
  assert.deepEqual(readFeatures({}), { photoIdentification: false });
  for (const value of ["", "false", "0", "no", "yes", "on", "ture"]) assert.equal(isFlagOn(value), false, value);
});

test("flag liga com true ou 1, ignorando espaços e maiúsculas", () => {
  for (const value of ["true", "TRUE", " true ", "1"]) assert.equal(isFlagOn(value), true, value);
  assert.deepEqual(readFeatures({ NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION: "true" }), { photoIdentification: true });
});
