import WebSocket from 'ws';
import 'dotenv/config';

const apiKey = process.env.AIS_STREAM_API_KEY;
console.log('Testing AIS with Key:', apiKey);

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

ws.on('open', () => {
    console.log('Connected. Sending sub in 2s...');
    setTimeout(() => {
        const msg = {
            APIKey: apiKey,
            BoundingBoxes: [[[-90, -180], [90, 180]]]
        };
        ws.send(JSON.stringify(msg));
        console.log('Sent:', JSON.stringify(msg));
    }, 2000);
});

ws.on('message', (data) => {
    console.log('Message Received:', data.toString());
});

ws.on('error', (err) => {
    console.error('Error:', err.message);
});

ws.on('close', (code, reason) => {
    console.log('Closed:', code, reason.toString());
});

setTimeout(() => {
    console.log('Timeout. Closing.');
    ws.close();
    process.exit(0);
}, 10000);
