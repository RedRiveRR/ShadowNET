const https = require('https');
const auth = Buffer.from('redriverr-api-client:3c11o5jks4TTEsffLPn2oikDQjdbpcph').toString('base64');

const options = {
  hostname: 'opensky-network.org',
  path: '/api/states/all',
  headers: {
    'Authorization': `Basic ${auth}`,
    'User-Agent': 'Mozilla/5.0'
  }
};

https.get(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log(`Success! States: ${data.states ? data.states.length : 0}`);
    } catch (e) { console.log('Parse error'); }
  });
}).on('error', (e) => {
  console.error(`Error: ${e.message}`);
});
