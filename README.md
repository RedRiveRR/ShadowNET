# 🌐 ShadowNet V10.0 — Global Maritime Recon & Intelligence

ShadowNet, küresel güvenlik anomalilerini, jeopolitik çatışmaları ve stratejik varlıkları gerçek zamanlı olarak izleyen, hibrit AI ile güçlendirilmiş bir durumsal farkındalık terminalidir.

V10.0 sürümüyle birlikte ShadowNet, yüksek hacimli deniz trafiği takibini (AIS) ana terminalden ayırarak özel bir **2D Maritime Radar** mimarisine taşınmış ve tam stabiliteye kavuşmuştur.

---

## 🚀 V10.0 "Maritime Recon" Yenilikleri

### ⚓ 2D Maritime Radar (Beta) - [NEW]
Yüzlerce geminin anlık takibi için optimize edilmiş, yüksek performanslı taktiksel radar katmanı:
- **60 FPS Optimizasyonu:** Gemi verileri React'in render döngüsünden izole edilerek doğrudan Canvas motoru üzerinden işlenir.
- **Smart Persistence (TTL):** AIS yayınındaki kesintilere karşı 10 dakikalık "Görünürlük Ömrü" (TTL) sistemi ile gemiler radarda sabit kalır.
- **Taktiksel Arayüz:** Gemi tipi, MMSI, hız, rota ve bayrak bilgileri için özel durumsal paneller.
- **Harita Sınır Kilidi:** Operasyonel alanın dışına taşmayı engelleyen akıllı koordinat ve zoom kısıtlamaları (1x-100x).

### 🧠 Otonom AI Intelligence
- **Dinamik Coğrafi Konumlama (Geocoding):** Haber ve istihbarat başlıklarındaki jeopolitik veri çekilerek, Tensor-Core destekli yapay zeka tarafından koordinatlara dönüştürülür.
- **Tehdit Analizi (GDELT):** GDELT verilerinden gelen haberler AI tarafından puanlanır ve riskli olaylar 3D küre üzerinde kırmızı halkalarla 'Pulsating (Titreşen)' uyarılara dönüşür.

### 📍 GDELT Super-Query 
- **Veri Tahkimatı:** Askeri, Siber, Nükleer, Diplomasi ve Terörizm başlıklarında 10 farklı kategoride anlık istihbarat hattı.
- **Anti-Flicker:** Veri akışındaki titremeleri engellemek için 1 saniyelik "Buffer (Tampon)" güncelleme döngüsü.

---

## 🛠️ Teknik Mimari

1.  **Vite Master Proxy (Server-Side):** GDELT, AIS Stream, OpenSky ve Tor API'larını güvenli bir şekilde yönetir.
2.  **ML Web Worker (Client-Side):** Yapay zeka hesaplamalarını ana arayüzü yormadan arka planda (Worker Thread) yönetir.
3.  **Hybrid Visualization Engine:** 3D Globe (Jeopolitik) ve 2D Canvas Radar (Maritime) arasında kesintisiz geçiş.

---

## 🖥️ Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Üretim sürümü için derle (Vite + Rolldown)
npm run build
```

---

## 🔐 Güvenlik ve Gizlilik

- **Edge AI:** ShadowNet AI bileşenleri hiçbir veriyi dış sunucuya göndermez. Analiz ve Geocoding tamamen yerel tarayıcıda gerçekleşir.
- **Proxy Integrity:** Tüm API anahtarları sunucu tarafındaki `.env` dosyasında saklanır.

---

> [!WARNING]
> **Beta Status**: Maritime Radar (AIS) modülü şu an Beta aşamasındadır. Veri akışında anlık gecikmeler veya UI pürüzleri yaşanabilir.

**ShadowNet V10.0** — *Küreseli İzle, Taktiksel Odaklan.*
