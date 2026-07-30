const { request } = require('playwright');
(async () => {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3001' });
  const r = await ctx.get('/api/exercises?category=chest');
  console.log('status:', r.status());
  const j = await r.json();
  console.log('keys:', Object.keys(j));
  console.log('data type:', typeof j.data, Array.isArray(j.data) ? 'array' : '');
  console.log('data[0]:', j.data?.[0]?.name);
  await ctx.dispose();
})();
