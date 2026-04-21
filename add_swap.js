import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Checking RAM and Swap...');
  
  const commands = [
    'free -h',
    'sudo fallocate -l 2G /swapfile',
    'sudo chmod 600 /swapfile',
    'sudo mkswap /swapfile',
    'sudo swapon /swapfile',
    'echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab',
    'free -h',
    'echo "SWAP CREATED"'
  ];

  let currentCommand = 0;
  const runNext = () => {
    if (currentCommand >= commands.length) {
      conn.end();
      return;
    }
    const cmd = commands[currentCommand];
    console.log(`Running: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', () => { currentCommand++; runNext(); })
            .on('data', (data) => console.log('STDOUT: ' + data))
            .stderr.on('data', (data) => console.log('STDERR: ' + data));
    });
  };
  runNext();
}).connect({
  host: '20.199.137.62',
  port: 22,
  username: 'redriverlab',
  password: '778077AdaMert.'
});
