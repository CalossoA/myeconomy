
let fetch;
try {
  fetch = global.fetch || require('node-fetch');
} catch (e) {
  fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
}

const BASE = 'http://localhost:3000/api';

async function testAPI() {
  // Test GET movimenti
  let res = await fetch(`${BASE}/movimenti`);
  let data = await res.json();
  console.log('GET /api/movimenti:', data);

  // Test GET riepilogo
  res = await fetch(`${BASE}/riepilogo`);
  data = await res.json();
  console.log('GET /api/riepilogo:', data);

  // Test GET andamento
  const year = new Date().getFullYear();
  res = await fetch(`${BASE}/andamento?year=${year}`);
  data = await res.json();
  console.log('GET /api/andamento:', data);
}

testAPI().catch(console.error);
