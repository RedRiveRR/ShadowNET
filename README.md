# 🌐 ShadowNet V11.0 — Global Maritime Recon & Hardened Intelligence

ShadowNet, küresel güvenlik anomalilerini, jeopolitik çatışmaları ve stratejik varlıkları gerçek zamanlı olarak izleyen, hibrit AI ile güçlendirilmiş bir durumsal farkındalık terminalidir.

V11.0 sürümüyle birlikte ShadowNet, mimarisini tamamen **Hardened Singleton Proxy** yapısına taşıyarak veri akışını sabitlemiş ve Azure tabanlı prodüksiyon ortamları için optimize edilmiştir.

---

## 🚀 V11.0 "Hardened Singleton" Yenilikleri

### ⚓ 2D Maritime Radar (High-Fidelity)
Yüzlerce geminin anlık takibi için yeniden optimize edilmiş taktiksel radar katmanı:
- **30 FPS Performance Throttle:** GPU yükünü %50 azaltan sabit FPS kontrolü.
- **Active Signal Counter:** Radardaki canlı gemi sayısını anlık olarak HUD üzerinde gösteren telemetri sayacı.
- **V11 Singleton Relay:** Tüm tarayıcı sekmelerinin tek bir güvenli bağlantıyı paylaştığı, rate-limit (429) korumalı WebSocket mimarisi.

### 🧠 Advanced AI & Intel Engine
- **Quadruple Intel Volume:** GDELT üzerinden çekilen haber hacmi 4 katına çıkarıldı.
- **Local AI Analysis:** Duygu analizi ve kategorizasyon işlemleri ONNX runtime ile tamamen yerel tarayıcıda gerçekleşir.
- **VPN-Aware Connectivity:** Bölgesel kısıtlamaları aşmak için optimize edilmiş proxy katmanı ve VPN uyumlu API entegrasyonu.

---

## 🛠️ Teknik Mimari

1.  **Master Hub Proxy:** OpenSky, ADSB.LOL, AIS Stream ve Tor verilerini tek bir merkezden yöneterek IP bloklama riskini minimize eder.
2.  **Hybrid Visualization:** 3D Globe (Küresel Tehditler) ve 2D Canvas Radar (Yerel Deniz Trafiği) arasında kesintisiz geçiş.
3.  **Neural Memory:** Web Worker tabanlı AI motoru ile ana thread'i yormadan gerçek zamanlı istihbarat analizi.

---

## 🖥️ Kurulum ve Dağıtım

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Üretim sürümü için derle (Azure/Windows/Linux)
npm run build

# Master Control ile Deploy (Opsiyonel)
node master_control.js
```

---

## 🔐 Güvenlik ve Uyumluluk

- **Strategic Data Notice:** Çatışma bölgeleri (Karadeniz, Kızıldeniz) için kısıtlama uyarıları arayüz düzeyinde şeffafça sunulur.
- **Privacy First:** ShadowNet AI hiçbir veriyi dış sunucuya göndermez. Analiz tamamen yereldir.

---

> [!IMPORTANT]
> **V11 Stability**: Bu sürüm, IP-tabanlı kısıtlamaları (429) aşmak için Singleton mimarisini zorunlu kılar. En iyi performans için tek bir sekme kullanılması önerilir.

**ShadowNet V11.0** — *Global Stability, Tactical Precision.*
