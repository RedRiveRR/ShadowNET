# 🌐 ShadowNet V8.0: Sovereign Intelligence Platform

[![Version](https://img.shields.io/badge/Version-v8.0.0-blueviolet?style=for-the-badge)](https://github.com/RedRiveRR/ShadowNET)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](docker-compose.yml)
[![Status](https://img.shields.io/badge/Status-Tactical_Active-success?style=for-the-badge)](https://opensky-network.org/)
[![React](https://img.shields.io/badge/Engine-React%20%2B%20Vite-61DAFB?style=for-the-badge)](https://vitejs.dev/)

**ShadowNet**, siber güvenlik istihbaratını (OSINT), küresel kriz olaylarını, uydu yörüngelerini ve canlı hava sahası trafiğini tek bir çatı altında birleştiren, yüksek performanslı ve taktiksel bir komuta-kontrol platformudur. 

V8.0 ile birlikte entegre edilen **Master Data Hub** ve **Otonom Fizik Motoru (Dead Reckoning)** sayesinde ShadowNet, API limitlerinden tamamen bağımsız, 24 saat kesintisiz ve "banlanamaz" bir mimariye kavuşmuştur.

---

## 🚀 Mimarinin Kalbi: Sovereign Master Hub

ShadowNet V8.0, standart "her kullanıcı için ayrı API sorgusu" mantığını tarihe gömer. Bunun yerine sunucu tabanlı, tekil bir **Master Proxy** kullanır.

```mermaid
graph TD
    subgraph Data Sources
        O([OpenSky VIP / OAuth2])
        A([Airplanes.Live])
        B([ADSB.one])
        C([ADSB.lol])
    end

    subgraph Server-Side (Vite Proxy)
        M{Master Data Hub}
        F[Failover & Cooldown Engine]
        C1(Global Cache)
    end

    subgraph Client-Side (Browser)
        U1[User 1: Global View]
        U2[User 2: Regional View]
        P[Autonomous Physics Engine<br>Dead Reckoning]
    end

    O -->|Primary 90s Pulse| F
    A -.->|Backup 1| F
    B -.->|Backup 2| F
    C -.->|Emergency Backup| F
    
    F --> M
    M -->|Updates| C1
    
    C1 -->|On-the-fly Filtering| U1
    C1 -->|On-the-fly Filtering| U2

    U1 --> P
    U2 --> P
```

### 🧠 Teknik Otonomi Seçenekleri
- **Akıllı Kredi Koruma (90s Pulse):** Sunucu, OpenSky'dan tüm dünyanın verisini 90 saniyede bir kez çeker (1 İstek = 4 Kredi). Sitede kaç kullanıcı olursa olsun fazladan kredi harcanmaz. 4000 VIP kredisi 24 saate mükemmel bir şekilde yayılır.
- **Failover / Cooldown (Kendini İyileştirme):** Birinciil sağlayıcı (OpenSky) kesintiye uğrarsa, sistem ping atmaya devam etmek yerine o API'yi 5 dakikalık "Soğuma" (Cooldown) moduna alır. Müşterilere kesinti yansıtılmadan anında Airplanes.Live vb. yedek ağlara geçilir.
- **Otonom İlerleme (Dead Reckoning):** 90 saniyelik veri boşluklarında radar ekranındaki uçaklar donmaz. **ShadowNet Physics Engine**, uçakların son raporlanan lokasyon, hız (kt) ve yön (heading) vektörlerini hesaplayarak otonom olarak uçmaya devam etmelerini sağlar.

---

## 🛠️ Ana Modüller ve Veri Kaynakları

ShadowNet, iki ana görselleştirme arayüzünden oluşur: **3D Global Analytics** ve **2D Tactical Radar**.

### 🌍 3D Global Analytics (Küresel Siber İstihbarat)
Dünyanın 3 boyutlu topolojik yansıması üzerinde eş zamanlı kriz izleme modülü.
- **Siber Tehdit Sensörleri (Threat Intel):** AlienVault OTX üzerinden malware, ransomware ve APT gruplarının aktivite nabzını tutar.
- **BGP Yönlendirme Anomalileri:** Cloudflare Radar kullanılarak okyanus altı kablo kopuklukları veya ulusal düzeyde ağ çöküşlerini algılar.
- **Balina Ağı (Whale Registry):** Blockchain.info WebSocket bağlantısıyla 5+ BTC / 100+ ETH transferlerini yakalar ve dünya haritasında "lazer ışınları" olarak çizer.
- **Sismik ve Afet Ağı:** USGS ve GDACS üzerinden 4.0 ve üzeri depremleri, tsunami risklerini titreşim dalgası (sonar ping) efektiyle gösterir.
- **Yörünge Varlıkları (Orbital Assets):** Uluslararası Uzay İstasyonu (ISS) ve CelesTrak TLE verileri aracılığıyla aktif uydu geçişlerini uzay boşluğunda render eder.

### 📡 2D Tactical Radar (Hava Sahası Tarama)
NATO komuta-kontrol ekranlarından ilham alınmış, yüksek performanslı Canvas-based radar motoru.
- **10.000+ Uçak Kapasitesi:** `requestAnimationFrame` ve Canvas 2D teknolojisiyle devasa hava filoları sıfır kasma ile render edilir.
- **Hayalet İzler (Ghost Tracks):** Sinyali kesilen uçaklar anında silinmez. Radar sistemi 4 tarama döngüsü (6 dakika) boyunca bu uçakların tahmini rotasını *GHOST TRACK* modunda çizmeye devam eder. 10. dakikada veri gelmezse arabuluculuktan kaldırılır.
- **Askeri/Özel Tanımlama:** Özel HEX kodlu hükümet, askeri veya VIP uçuşları farklı renklerde etiketler.

---

## ⚙️ Kurulum ve Dağıtım (Deployment)

Projenizi ayağa kaldırmak için iki seçeneğiniz vardır: Standart NPM Kurulumu veya Docker.

### Yöntem 1: Standart Başlangıç (Bare Metal)

1. Projeyi klonlayın:
```bash
git clone https://github.com/RedRiveRR/ShadowNET.git
cd ShadowNET
```

2. Paketleri yükleyin:
```bash
npm install
```

3. Çevresel değişkenleri hazırlayın:
`.env.example` dosyasını baz alarak kendi `.env` dosyanızı oluşturun (Değişkenler tablosuna bakın).

4. **Sistem Kontrol Aracı (Pre-flight Check)** ile güvenliğinizi teyit edin:
```bash
node sys-check.js
```

5. Ateşleme:
```bash
npm run dev
```

### Yöntem 2: Dockerize Edilmiş Dağıtım (Önerilen)

Sistemi herhangi bir sunucuda Nodejs kurmadan çalıştırmak için:
```bash
cp .env.example .env
docker-compose up -d --build
```
Sistem `http://localhost:5173` üzerinde ayağa kalkacak, volume mapping sayesinde kodda yaptığınız değişiklikler (hot-reload) anında sayfaya yansıyacaktır.

---

## 🔐 Configuration / Çevresel Değişkenler

ShadowNet'in dış dünyayla konuşabilmesi için temel API anahtarları gereklidir. `.env` dosyası kasten `.gitignore` kurallarına tabi tutulmuştur.

| Degişken | Kaynak / Amaç | Zorunlu mu? |
| :--- | :--- | :--- |
| `VITE_OPENSKY_CLIENT_ID` | OpenSky VIP OAuth2 Client ID | Evet (B Planı var) |
| `VITE_OPENSKY_CLIENT_SECRET` | OpenSky VIP OAuth2 Secret Key | Evet (B Planı var) |
| `VITE_OTX_API_KEY` | AlienVault OTX Siber Tehdit Anahtarı | Hayır |
| `VITE_CLOUDFLARE_API_TOKEN` | Yönlendirme (BGP) verisi için Radar Token | Hayır |
| `VITE_MAPBOX_TOKEN` | Gelecekteki harita altlık güncellemeleri için | Hayır |

> **Not:** OpenSky anahtarları verilmezse sistem hata vermez, tamamen otonom bir şekilde `Airplanes.live` gibi doğrulaması olmayan yedek (Backup) sistemlere geçiş yapar. Ancak limitlere ve banlara tabi olabilir.

---

## 📜 Lisans & Yasal Uyarı

Bu proje **MIT License** altında lisanslanmıştır. Kullanım hakları, kopyalama ve değiştirme konusunda özgürsünüz. Ek lisans dosyası için [LICENSE](LICENSE) dizinini inceleyebilirsiniz.

*ShadowNet platformu sadece osint ve durumsal farkındalık deneyleri için yaratılmıştır. Elde edilen verilerin askeri, ticari veya havacılık bağlayıcılığı yoktur.*

---
*Created in the Shadows by RedRiveRR.*
