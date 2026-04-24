const https = require('https');

function test(url) {
  console.log(`Testing: ${url}`);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
       // console.log(d.toString().substring(0, 100));
    });
  }).on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
}

test('https://opendata.adsb.fi/api/v2/all');
test('https://api.adsb.lol/v2/latest');
