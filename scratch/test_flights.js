// Using global fetch

async function test() {
  const urls = [
    'https://api.adsb.lol/v2/all',
    'https://opendata.adsb.fi/api/v2/all',
    'https://api.theairtraffic.com/v1/all'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(url, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        }
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Success! Aircraft count: ${data.ac ? data.ac.length : (data.aircraft ? data.aircraft.length : 'N/A')}`);
      } else {
        const text = await res.text();
        console.log(`Error body: ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    console.log('---');
  }
}

test();
