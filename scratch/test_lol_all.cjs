const https = require('https');

function test(url) {
  console.log(`Testing: ${url}`);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
       try {
         const data = JSON.parse(body);
         console.log(`Aircraft: ${data.ac ? data.ac.length : 0}`);
       } catch (e) { console.log('JSON Parse Error'); }
    });
  }).on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
}

test('https://api.adsb.lol/v2/all');
