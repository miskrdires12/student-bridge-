const { SignJWT } = require('jose');

async function testStudentsPage() {
  const secret = new TextEncoder().encode("student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade");
  const token = await new SignJWT({
    userId: 'test-admin',
    username: 'admin',
    email: 'admin@studentbridge.internal',
    role: 'ADMIN'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);

  console.log('Generated token');
  const res = await fetch('https://my-projects-two-kappa.vercel.app/students', {
    headers: {
      'Cookie': `student_bridge_session=${token}`
    }
  });

  console.log('Students page status:', res.status);
  const html = await res.text();
  console.log('Page length:', html.length);
  console.log('Contains Re-Sync Cloud?', html.includes('Re-Sync Cloud'));
  console.log('Contains Melona Anteneh?', html.includes('Melona Anteneh'));
  console.log('Contains Checking Devices?', html.includes('Checking Devices'));
  console.log('Contains blob:?', html.includes('blob:'));
}

testStudentsPage().catch(console.error);
