async function test() {
  const urls = [
    'https://opensky-network.org/api/states/all',
    'https://api.adsb.lol/v2/latest',
    'https://stream.aisstream.io/v0/stream'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(url, { method: 'GET' });
      console.log(`Status: ${res.status}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    console.log('---');
  }
}
test();
