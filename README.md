# 🌐 ShadowNet V9.0 — Global Intelligence & Autonomous Tactical Radar

ShadowNet, küresel güvenlik anomalilerini, jeopolitik çatışmaları ve stratejik varlıkları gerçek zamanlı olarak izleyen, tarayıcı tabanlı (in-browser) yapay zeka ile güçlendirilmiş hibrit bir durumsal farkındalık terminalidir.

V9.0 sürümü ile birlikte ShadowNet, basit bir uçuş takip sisteminden otonom bir **Küresel İstihbarat Merkezi**'ne (Global Intelligence Hub) evrilmiştir.

---

## 🚀 V9.0 "Global Intelligence" Yenilikleri

### 🧠 Otonom Yapay Zeka Motoru (ONNX & Transformers.js)
ShadowNet, artık kullanıcının tarayıcısında (client-side) çalışan bağımsız bir yapay zeka motoruna sahiptir. 
- **Sıfır Sunucu Maliyeti:** Tüm analizler kullanıcının yerel CPU/GPU donanımı kullanılarak Web Worker üzerinde gerçekleşir.
- **Duygu ve Tehdit Analizi:** GDELT verilerinden gelen binlerce haber başlığı, `distilbert` ONNX modeli ile saniyeler içinde "Risk" ve "Tehdit" puanlamasına tabi tutulur.

### 📍 GDELT Jeopolitik İstihbarat Hattı
Dünyanın en kapsamlı açık veri projesi olan GDELT (Global Database of Events, Language, and Tone) ShadowNet'e entegre edildi.
- **6 Ana İstihbarat Kanalı:** Askeri Hareketlilik, Siber Güvenlik, Nükleer Gelişmeler, Ekonomik Yaptırımlar, İstihbarat Faaliyetleri ve Denizcilik Güvenliği.
- **Düşük Gecikmeli Proxy:** Master Hub üzerinden 15 dakikalık periyotlarla çekilen ham veri, AI motoru tarafından işlenerek haritaya yansıtılır.

### 🔴 İnteraktif 3D İstihbarat Katmanı
3D Küre (Global Analytics) üzerindeki tüm görsel "nabızlar" artık etkileşimlidir:
- **AI Threats:** Yapay zeka tarafından kritik riskli bulunan olaylar.
- **Global Incidents:** Dünya basınından anlık küresel gelişmeler.
- **Seismic Activity:** USGS üzerinden gelen gerçek zamanlı deprem verileri.
- *Halkalara tıklandığında sol tarafta detaylı durum raporu ve kaynak linki görüntülenir.*

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
