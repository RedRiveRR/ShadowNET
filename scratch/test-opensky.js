import 'dotenv/config';

async function testOpenSky() {
    console.log('Testing OpenSky Auth...');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.OPENSKY_CLIENT_ID || '');
    params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET || '');
    
    try {
        const response = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (ShadowNet/11.0)'
            },
            body: params
        });
        
        console.log('Auth Response Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Auth Success! Token received.');
            
            console.log('Testing OpenSky Data Fetch...');
            const dataRes = await fetch('https://opensky-network.org/api/states/all', {
                headers: { 
                    'Authorization': `Bearer ${data.access_token}`,
                    'User-Agent': 'ShadowNet/11.0'
                }
            });
            console.log('Data Response Status:', dataRes.status);
            if (dataRes.ok) {
                const states = await dataRes.json();
                console.log('Data Success! Found', states.states ? states.states.length : 0, 'aircraft.');
            } else {
                console.error('Data Fetch Failed:', await dataRes.text());
            }
        } else {
            console.error('Auth Failed:', await response.text());
        }
    } catch (e) {
        console.error('Connection Error:', e.message);
    }
}

testOpenSky();
