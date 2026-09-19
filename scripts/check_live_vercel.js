async function testVercel() {
  try {
    const res = await fetch('https://my-projects-two-kappa.vercel.app/api/students/sync');
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const data = await res.json();
    console.log('Students count returned:', data.students?.length);
    if (data.students) {
      data.students.forEach(s => {
        console.log(`- ${s.studentId}: ${s.fullName} | photoPath: ${s.photoPath}`);
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testVercel();
