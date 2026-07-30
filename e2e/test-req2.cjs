const { request } = require('playwright');
(async () => {
  // No baseURL
  const ctx = await request.newContext();
  const r = await ctx.get('http://localhost:3001/api/exercises?category=chest');
  console.log('status:', r.status());
  const j = await r.json();
  console.log('keys:', Object.keys(j));
  console.log('data[0]:', j.data?.[0]?.name);
  await ctx.dispose();
})();
