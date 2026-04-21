import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP :: ready. Uploading shadownet_bundle.zip...');
    sftp.fastPut('shadownet_bundle.zip', '/home/redriverlab/shadownet_bundle.zip', (err) => {
      if (err) {
        console.error('Upload Error:', err);
      } else {
        console.log('Upload Success!');
      }
      conn.end();
    });
  });
}).connect({
  host: '20.199.137.62',
  port: 22,
  username: 'redriverlab',
  password: '778077AdaMert.'
});
