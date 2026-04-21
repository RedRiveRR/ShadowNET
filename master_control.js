import { Client } from 'ssh2';
import { readFileSync, createReadStream } from 'fs';
import { execSync } from 'child_process';
import archiver from 'archiver';
import fs from 'fs';

const config = {
  host: '20.199.137.62',
  port: 22,
  username: 'redriverlab',
  password: '778077AdaMert.'
};

async function runStep(name, fn) {
  console.log(`\n--- [STEP: ${name}] ---`);
  try {
    await fn();
    console.log(`✅ ${name} completed.`);
  } catch (err) {
    console.error(`❌ ${name} failed:`, err);
    throw err;
  }
}

async function masterControl() {
  // 1. Build
  await runStep('Building Project', async () => {
    execSync('npm run build', { stdio: 'inherit' });
  });

  // 2. Zip
  await runStep('Zipping Bundle', async () => {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream('shadownet_bundle.zip');
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory('dist/', 'dist');
      archive.file('server.js', { name: 'server.js' });
      archive.file('package.json', { name: 'package.json' });
      archive.file('package-lock.json', { name: 'package-lock.json' });
      archive.file('.env', { name: '.env' });
      archive.finalize();
    });
  });

  // 3. Deploy & Setup
  await runStep('Deploying & Setting Up', async () => {
    const conn = new Client();
    return new Promise((resolve, reject) => {
      conn.on('ready', () => {
        console.log('SSH :: Connected.');
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          console.log('SFTP :: Uploading...');
          sftp.fastPut('shadownet_bundle.zip', '/home/redriverlab/shadownet_bundle.zip', (err) => {
            if (err) return reject(err);
            console.log('SFTP :: Upload Success.');
            
            const commands = [
              'sudo apt install -y unzip',
              'unzip -o shadownet_bundle.zip',
              'npm install --production',
              'pm2 delete shadownet || true',
              'pm2 start server.js --name shadownet',
              'pm2 save',
              'pm2 status'
            ];

            let current = 0;
            const runNext = () => {
              if (current >= commands.length) {
                conn.end();
                resolve();
                return;
              }
              const cmd = commands[current];
              console.log(`Running Remote: ${cmd}`);
              conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', runNext)
                      .on('data', (d) => process.stdout.write(d))
                      .stderr.on('data', (d) => process.stderr.write(d));
              });
              current++;
            };
            runNext();
          });
        });
      }).on('error', reject).connect(config);
    });
  });

  console.log('\n🚀 ALL SYSTEMS GO! ShadowNet is deployed and running.');
}

masterControl().catch(console.error);
