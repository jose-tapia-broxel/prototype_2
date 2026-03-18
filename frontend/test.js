fetch('http://localhost:3000/api/workflows').then(r => r.text()).then(console.log).catch(console.error);
