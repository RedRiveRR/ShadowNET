import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready. Debugging Network & PM2...');
  
  const commands = [
    'netstat -tuln | grep 3000',
    'pm2 status',
    'pm2 logs shadownet --lines 20 --no-daemon'
  ];

  let currentCommand = 0;
  const runNext = () => {
    if (currentCommand >= commands.length) {
      conn.end();
      return;
    }
    const cmd = commands[currentCommand];
    console.log(`\n--- Running: ${cmd} ---`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      
      // Log komutu sonsuza kadar gitmesin diye 3 saniye sonra kesiyoruz
      if (cmd.includes('logs')) {
          setTimeout(() => stream.end(), 3000);
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
