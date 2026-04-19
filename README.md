# 🌐 ShadowNet V9.5 — Global Intelligence & Tactical Radar

ShadowNet, küresel güvenlik anomalilerini, jeopolitik çatışmaları ve stratejik varlıkları gerçek zamanlı olarak izleyen, tarayıcı tabanlı (in-browser) yapay zeka ile güçlendirilmiş hibrit bir durumsal farkındalık terminalidir.

V9.5 sürümü ile birlikte ShadowNet, basit bir uçuş takip sisteminden otonom bir **Küresel İstihbarat Merkezi**'ne (Global Intelligence Hub) evrilmiştir.

---

## 🚀 V9.5 "Tactical Radar" Yenilikleri

### 🧠 Otonom Yapay Zeka & Geocoding Motoru
ShadowNet, artık kullanıcının tarayıcısında (client-side) çalışan bağımsız bir yapay zeka motoruna sahiptir. 
- **Dinamik Coğrafi Konumlama (Geocoding):** Haber ve istihbarat başlıklarındaki (örneğin; "Israel", "Russia", "USA") jeopolitik veri çekilerek, yapay zeka tarafından otonom olarak enlem ve boylam koordinatlarına dönüştürülür ve haritaya dinamik olarak işlenir.
- **Tehdit Analizi:** GDELT verilerinden gelen haber başlıkları yapay zeka tarafından puanlanır. Aşırı riskli olaylar, 3D küre üzerinde ülkelerin üzerinde kırmızı 'Pulsating (Titreşen)' halkalara dönüşür.

### 📍 GDELT Super-Query İstihbarat Hattı
- **Rate-Limit Çözümü (Super-Query):** Sunucu arka planında GDELT API'nin ip engellemelerini aşan tekil devasa `(military OR cyber OR nuclear...)` birleşik sorgulama mimarisine geçilmiştir.
- **Özel Kategorizasyon:** Askeri, Siber, Nükleer, Denizcilik vb. toplam 10 farklı konu başlığı anında filtre edilip haritaya dağıtılmaktadır.

### 🔴 İnteraktif 3D İstihbarat Katmanı
3D Küre (Global Analytics) üzerindeki tüm görsel "nabızlar" artık tam etkileşimlidir:
- **AI Threats & Intel Points:** Küreye düşen askeri, siber, diplomatik her bir haber noktasına tıklandığında sol altta kaynağa giden detaylı info-panel açılır.
- **Global Incidents & Seismic Activity:** Depremler, küresel haberler ve AIS takip (gemiler) anında detaylarıyla tıklanabilir hale getirilmiştir.

---

## 🛠️ Teknik Mimari

ShadowNet V9.0, performansı maksimize etmek için üç katmanlı bir veri boru hattı (pipeline) kullanır:

1.  **Vite Master Proxy (Server-Side):** GDELT, OpenSky, ADSBLOL ve Tor gibi API'lardan ham veriyi çeker, birleştirir ve rate-limit koruması sağlar.
2.  **ML Web Worker (Client-Side):** Ana thread'i dondurmadan arka planda yapay zeka hesaplamalarını (Tokenization & Inference) yönetir.
3.  **WebGL Engine (Visualization):** 3D Globe ve 2D Tactical Radar arayüzlerine işlenmiş veriyi yüksek FPS ile yansıtır.

---

## 🖥️ Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Üretim sürümü için derle
npm run build
```

---

## 🔐 Güvenlik ve Gizlilik

- **Local Intelligence:** ShadowNet'in AI bileşenleri hiçbir veriyi dış sunucuya göndermez. Analiz tamamen tarayıcı önbelleğinde gerçekleşir.
- **API Integrity:** Tüm API anahtarları sunucu tarafındaki `.env` dosyasında saklanır ve Master Proxy üzerinden güvenli bir şekilde yönetilir.

---

**ShadowNet V9.0** — *Küreseli İzle, Yerelde Analiz Et.*
