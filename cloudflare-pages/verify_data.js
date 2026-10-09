const fs = require('fs');

const students = JSON.parse(fs.readFileSync('data/students.json', 'utf8'));
const users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));

console.log('Students count:', students.length);
console.log('Users count:', users.length);

// Verify student uniqueness
const ids = new Set(students.map(s => s.studentId));
console.log('Unique Student IDs:', ids.size);

// Verify schools distribution
const schools = {};
students.forEach(s => {
  const sc = s.school || 'Unknown';
  schools[sc] = (schools[sc] || 0) + 1;
});
console.log('Schools count breakdown:', schools);

// Verify photos presence
const withPhoto = students.filter(s => s.photoPath);
console.log('Students with photo:', withPhoto.length);
console.log('Students without photo:', students.length - withPhoto.length);
