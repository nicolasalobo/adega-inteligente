import assert from "node:assert/strict";
import test from "node:test";

test("rota de foto responde 404 com a flag desligada, antes de exigir login ou chamar a IA", async () => {
  delete process.env.NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION;
  const { POST } = await import("../../src/app/api/identification/photo/route");
  const response = await POST(new Request("http://localhost/api/identification/photo", { method: "POST", body: "{}" }));
  assert.equal(response.status, 404);
});
