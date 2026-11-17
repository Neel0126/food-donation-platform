const routes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password/sample-token',
  '/donor/dashboard',
  '/ngo/dashboard',
  '/volunteer/dashboard',
  '/admin/dashboard',
  '/profile',
  '/assets/index-DnYMq4hU.js',
  '/assets/index-ocgkt6Md.css',
  '/favicon.svg'
];

async function checkRoutes() {
  console.log('--- Verifying Vercel SPA Routing & Asset Delivery ---');
  let allOk = true;
  for (const r of routes) {
    const url = `https://food-donation-platform-five.vercel.app${r}`;
    try {
      const res = await fetch(url);
      const isOk = res.status === 200;
      console.log(`${isOk ? '✅' : '❌'} Route: ${r.padEnd(30)} HTTP ${res.status} (${res.headers.get('content-type')})`);
      if (!isOk) allOk = false;
    } catch (err) {
      console.log(`❌ Route: ${r.padEnd(30)} Error: ${err.message}`);
      allOk = false;
    }
  }
  console.log(`\nVercel Frontend Health: ${allOk ? '100% HEALTHY ✅' : 'ISSUES FOUND ❌'}`);
}

checkRoutes();
