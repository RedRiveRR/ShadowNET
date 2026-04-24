const https = require('https');
const auth = Buffer.from('redriverr-api-client:3c11o5jks4TTEsffLPn2oikDQjdbpcph').toString('base64');

const options = {
  hostname: 'opensky-network.org',
  path: '/api/states/all',
  headers: {
    'Authorization': `Basic ${auth}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Connection': 'keep-alive',
    'Accept-Encoding': 'gzip'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  res.on('data', (d) => {});
});

req.on('error', (e) => console.error(e));
req.end();
