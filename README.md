# 🌐 ShadowNET V12.0 — Küresel Havacılık, Denizcilik ve Taktiksel İstihbarat Terminali

ShadowNET; küresel güvenlik anomalilerini, jeopolitik çatışmaları ve stratejik varlıkları gerçek zamanlı olarak izleyen yüksek hassasiyetli bir durumsal farkındalık terminalidir.

V12.0 sürümü ile ShadowNET, **Ultra-Global Izgara Mimarisi**'ne geçiş yaparak, Cloudflare Worker Relay katmanı üzerinden sistem kısıtlamalarını aşmış ve eşsiz bir veri yoğunluğuna ulaşmıştır.

---

## 🚀 V12.0 Öne Çıkan Özellikler

### ✈️ Ultra-Global Havacılık Takibi
- **12-Bölge Izgara Sistemi:** Kuzey Amerika, Avrupa, Asya, Ortadoğu ve Okyanus rotaları dahil 12 stratejik merkezde eş zamanlı tarama.
- **11.000+ Aktif Hava Aracı:** 15.000 uçak kapasiteli gerçek zamanlı küresel telemetri.
- **WAF & DPI Bypass:** Azure IP bloklarını ve JA3 parmak izi kısıtlamalarını aşmak için Cloudflare Worker Relay üzerinden tünellenmiş veri akışı.

### ⚓ Gerçek Zamanlı Denizcilik Keşfi
- **Küresel AIS Akışı:** AISStream.io üzerinden sağlanan canlı gemi takip verileri.
- **7.000+ Mesaj/Senkronizasyon:** Yüksek hacimli denizcilik telemetri işleme kapasitesi.
- **Tam Kapsama:** Kutuptan kutuba tüm dünya deniz trafiği.

### 🛰️ Yörünge Gözlemi (Orbital Surveillance)
- **Celestrak & AMSAT Hibrit:** 500'den fazla stratejik uydu varlığı için gerçek zamanlı takip.
- **Kesintisiz Erişim:** Servis sağlayıcı kısıtlamalarına karşı yedekli ve tünellenmiş yörünge verisi.

### 🧠 Taktiksel İstihbarat Motoru
- **Gelişmiş Haber Akışı:** 300+ taktiksel haber düğümü (Askeri, Siber, Nükleer, Uzay).
- **Otomatik Kategorizasyon:** Jeopolitik olaylar için gelişmiş NLP sınıflandırması.
- **Tor Altyapısı:** 200'den fazla küresel Tor relay düğümünün gerçek zamanlı durum izlemesi.

---

## 🛠️ Teknik Mimari

1.  **Cloudflare Worker Relay:** İstekleri sanitize eden ve yüksek hacimli veri paketlerini yöneten uç nokta (Edge) proxy katmanı.
2.  **Çoklu Bölge Birleştirme (Multi-Region Merge):** Bölgesel telemetri verilerini tekilleştiren (deduplication) ve global bir duruma dönüştüren backend mantığı.
3.  **Hibrit Görselleştirici:** 15.000+ dinamik varlık için optimize edilmiş React + Globe.gl + Canvas tabanlı görselleştirme motoru.

---

## 🖥️ Kurulum ve Başlatma

```bash
# Bağımlılıkları yükle
npm install

# Shadow Engine'ı başlat
node server.js
```

---

## 🔐 Güvenlik ve Gizlilik

- **Gizlenmiş Kaynak:** Sunucu IP adresleri ve dahili manifestolar `.gitignore` ve Cloudflare maskeleme ile korunmaktadır.
- **Yerel Analiz:** Tüm istihbarat analizi yerel olarak gerçekleştirilir; verileriniz sunucu dışına çıkmaz.

---

> [!NOTE]
> **V12 Performansı**: Bu sürüm yüksek yoğunluklu veri ekranları için tasarlanmıştır. En iyi deneyim için donanımınızın WebGL hızlandırmasını desteklediğinden emin olun.

**ShadowNET V12.0** — *Küresel Varlık, Taktiksel Üstünlük.*
