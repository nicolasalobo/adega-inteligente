const eans = ["7892500022445", "8436559528924"];
const fields = "code,product_name,brands,categories,product_type,quantity,origins,manufacturing_places";

for (const ean13 of eans) {
  const url = new URL(`https://world.openfoodfacts.org/api/v3/product/${ean13}.json`);
  url.searchParams.set("fields", fields);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AdegaInteligente/2.0 (+https://github.com/nicolasalobo/adega-inteligente)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (response.status !== 404 && !response.ok) throw new Error(`Open Food Facts ${ean13}: HTTP ${response.status}`);
  const payload = await response.json();
  const product = payload.product;
  console.log(JSON.stringify({
    ean13,
    httpStatus: response.status,
    found: payload.status === 1 && Boolean(product),
    product: product ? {
      name: product.product_name ?? null,
      brands: product.brands ?? null,
      quantity: product.quantity ?? null,
      origin: product.origins ?? product.manufacturing_places ?? null,
    } : null,
    source: `https://world.openfoodfacts.org/product/${ean13}`,
  }));
}
