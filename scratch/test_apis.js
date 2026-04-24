async function test() {
  const urls = [
    'https://api.theairtraffic.com/v1/all',
    'https://opendata.adsb.fi/api/v2/all'
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShadowNet/11.0' }
      });
      console.log(`Result: ${res.status} ${res.statusText}`);
      if (res.ok) {
          const data = await res.json();
          console.log(`Success! Aircraft count: ${data.ac ? data.ac.length : 'N/A'}`);
      } else {
          const text = await res.text();
          console.log(`Error body: ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`Fetch Error: ${e.message}`);
    }
    console.log('---');
  }
}

test();
