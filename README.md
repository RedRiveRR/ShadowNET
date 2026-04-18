# 🌐 ShadowNet

![ShadowNet](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-v3.0.0-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![ThreeJS](https://img.shields.io/badge/3D%20Engine-Three.js-black)

**ShadowNet**, 3D destekli ve karanlık uzay (Hacker Mode) temalı bir Açık Kaynak İstihbarat (OSINT) ve Siber Tehdit Monitörüdür. Gerçek zamanlı API'lerden veri çeker, dünya üzerinde anlık tehlikeleri ve siber atak/anomali hareketliliklerini üç boyutlu topolojik bir küre üzerinde görüntüler.

## 🚀 Özellikler (Features)

*   **⚡ Gerçek Zamanlı Siber Tehdit Sensörleri:** BGP yönlendirme anormallikleri (Cloudflare Radar) ve güncel saldırı/zafiyet pulse'ları (AlienVault OTX & NVD CVE).
*   **🌍 3D Topolojik Visualizer:** `react-globe.gl` ve `Three.js` ile güçlendirilmiş, Hacker/Neon temalı etkileşimli dünya.
*   **🪙 Kripto Balinası Takibi (Whale Net):** WebSocket ile Blockchain ağına bağlanır ve anlık yüksek değerli (5+ BTC) Bitcoin transfer rotalarını haritaya altın lazerler ile çizer.
*   **🌋 Doğal Afetler & Sismik Faaliyetler:** Birleşmiş Milletler (GDACS) ve Amerikan Jeoloji Kurumu (USGS) altyapılarından anlık afet verilerini çeker.
*   **💻 SYS.TERMINAL Konsolu:** "Camgöbeği & Neon" temalı CSS Glassmorphism yapısı, aşağıdan kayan detaylı log akordiyon paneli ile NSA konsolu hissi verir.

## ⚙️ Kurulum (Installation)

ShadowNet, modern web standartlarında Vite ile yapılandırılmıştır.

```bash
# Repoyu Klonlayın
git clone https://github.com/KULLANICI_ADINIZ/ShadowNet.git
cd ShadowNet

# Bağımlılıkları Kurun
npm install

# .env Dosyasını Oluşturun ve Anahtarlarınızı Ekleyin
# (.env.example dosyasının ismini .env yaparak başlayabilirsiniz)
echo VITE_OTX_API_KEY=YOUR_ALIENVAULT_KEY > .env
echo VITE_CLOUDFLARE_API_TOKEN=YOUR_CLOUDFLARE_TOKEN >> .env

# Geliştirici Sunucusunu Başlatın
npm run dev
```

## 🔌 API Entegrasyonları
Sistem aşağıdaki köklerden tamamen ücretsiz ve gerçek zamanlı (%100 Legit) veri çeker:
*   [AlienVault OTX](https://otx.alienvault.com/)
*   [Cloudflare Radar API](https://developers.cloudflare.com/radar/)
*   [USGS Earthquake Feed](https://earthquake.usgs.gov/)
*   [GDACS Disaster Alert](https://www.gdacs.org/)
*   [NVD (National Vulnerability Database)](https://nvd.nist.gov/)
*   [Blockchain.info WebSocket](https://www.blockchain.com/explorer/api/api_websocket)
*   [OpenSky Network](https://opensky-network.org/)
*   [WhereTheISS.at](https://wheretheiss.at/)

## 🛡️ Güvenlik Notu
ShadowNet'in dış API bağlantıları için kullanılan `VITE_OTX_API_KEY` ve `VITE_CLOUDFLARE_API_TOKEN` değişkenleri hiçbir zaman repo'da paylaşılmamalıdır. Bu nedenle `.env` dosyası kasten `.gitignore` kurallarına eklenmiş ve izole edilmiştir.

---
*Created in the Shadows.*
