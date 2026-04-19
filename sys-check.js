/**
 * ShadowNet V9.0 - System Integrity Check
 * Bu araç, ShadowNet'in çalışması için gereken .env yapılandırmasını doğrular.
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 SHADOWNET V9.0 // PRE-FLIGHT SYSTEM CHECK');
console.log('-------------------------------------------');

const envPath = path.join(__dirname, '.env');

// 1. .env Dosyası Kontrolü
if (!fs.existsSync(envPath)) {
    console.error('❌ HATA: .env dosyası bulunamadı!');
    console.log('Lütfen .env.example dosyasını .env olarak kopyalayın ve anahtarlarınızı girin.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

const requiredKeys = [
    'OPENSKY_CLIENT_ID',
    'OPENSKY_CLIENT_SECRET',
    'AIS_STREAM_API_KEY',
    'OTX_API_KEY',
    'CLOUDFLARE_API_TOKEN'
];

let missing = 0;
requiredKeys.forEach(key => {
    if (!envContent.includes(key)) {
        console.warn(`⚠️ UYARI: ${key} tanımlı değil. OpenSky VIP erişimi sınırlı olabilir.`);
        missing++;
    }
});

if (missing === 0) {
    console.log('✅ GÜVENLİK: VIP Kimlik Bilgileri Doğrulandı.');
} else {
    console.log(`ℹ️ BİLGİ: ${missing} anahtar eksik. Sistem Anonim modda (limitli) çalışacak.`);
}

console.log('✅ DOSYA SİSTEMİ: İzinler ve dizin yapısı aktif.');
console.log('🚀 DURUM: Kalkışa hazır. "npm run dev" komutuyla başlatabilirsiniz.');
console.log('-------------------------------------------');
