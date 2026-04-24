async function test() {
  try {
    console.log(`Testing Google Connectivity...`);
    const res = await fetch('https://www.google.com', { timeout: 5000 });
    console.log(`Google Result: ${res.status} ${res.statusText}`);
    
    console.log(`Testing OpenSky Connectivity...`);
    const res2 = await fetch('https://opensky-network.org/api/states/all', { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000 
    });
    console.log(`OpenSky Result: ${res2.status} ${res2.statusText}`);
  } catch (e) {
    console.log(`Critical Connectivity Error: ${e.message}`);
  }
}

test();
