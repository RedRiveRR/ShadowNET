import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Checking UFW and Firewall...');
  
  const commands = [
    'sudo ufw allow 3000/tcp',
    'sudo ufw allow 22/tcp',
    'sudo ufw --force enable',
    'sudo ufw status',
    'echo "INTERNAL FIREWALL UPDATED"'
  ];

  let currentCommand = 0;
  const runNext = () => {
    if (currentCommand >= commands.length) {
      conn.end();
      return;
    }
    const cmd = commands[currentCommand];
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
