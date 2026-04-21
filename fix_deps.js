import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Installing missing dependencies...');
  
  const commands = [
    'cd /home/redriverlab',
    'rm -rf node_modules package-lock.json',
    'npm install express ws dotenv',
    'pm2 restart shadownet',
    'pm2 logs shadownet --lines 10 --no-daemon'
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
      
      if (cmd.includes('logs')) {
          setTimeout(() => stream.end(), 5000);
      }

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
