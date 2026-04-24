async function test() {
  const urls = [
    'https://api.adsb.lol/v2/all',
    'https://api.adsb.lol/v2/aircraft',
    'https://api.adsb.lol/v2/l',
    'https://api.adsb.lol/v2/aircraft/all'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Success! AC: ${data.ac ? data.ac.length : 'N/A'}`);
        break;
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}
test();
