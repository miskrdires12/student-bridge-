async function checkVercelPage() {
  const res = await fetch('https://my-projects-two-kappa.vercel.app/login');
  console.log('Login status:', res.status);
  const text = await res.text();
  console.log('Vercel headers:', Object.fromEntries(res.headers.entries()));
  
  // Extract script chunks
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+)"/g;
  let match;
  const chunks = [];
  while ((match = scriptRegex.exec(text)) !== null) {
    chunks.push(match[1]);
  }
  console.log('Chunks on live site:', chunks);
}

checkVercelPage();
