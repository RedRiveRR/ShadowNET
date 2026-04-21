import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Running setup commands...');
  
  // Komut dizisi
  const commands = [
    'sudo apt update',
    'sudo apt install -y unzip',
    'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
    'sudo apt install -y nodejs',
    'sudo npm install -g pm2',
    'unzip -o shadownet_bundle.zip',
    'npm install',
    'pm2 delete shadownet || true',
    'pm2 start server.js --name shadownet',
    'pm2 save',
    'echo "SHADOWNET IS LIVE!"'
  ];

  let currentCommand = 0;

  const runNext = () => {
    if (currentCommand >= commands.length) {
      console.log('All setup commands completed!');
      conn.end();
      return;
    }

    const cmd = commands[currentCommand];
    console.log(`Running: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', (code, signal) => {
        currentCommand++;
        runNext();
      }).on('data', (data) => {
        console.log('STDOUT: ' + data);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  };

  runNext();
}).connect({
  host: '20.199.137.62',
  port: 22,
  username: 'redriverlab',
  password: '778077AdaMert.'
});
