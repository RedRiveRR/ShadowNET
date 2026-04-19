/**
 * ShadowNet V9.0 — ML Manager
 * Web Worker yönetimi ve ana thread ile köprü (bridge) oluşturur.
 * Worker'ı başlatır, model yükleme durumunu takip eder ve sentiment analizi ister.
 */

import { useMetricsStore } from '../store/useMetricsStore';
import type { IntelArticle } from '../store/useMetricsStore';

let worker: Worker | null = null;
let pendingCallbacks = new Map<string, (data: any) => void>();
let idCounter = 0;

function generateId(): string {
  return `ml-${++idCounter}-${Date.now()}`;
}

/**
 * Worker'ı başlat ve model yüklenmesini tetikle.
 */
export function initMLWorker(): void {
  if (worker) return;

  try {
    worker = new Worker(
      new URL('../workers/ml.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;

      // Status güncellemeleri
      if (data.type === 'status-update') {
        const statusMap: Record<string, 'idle' | 'loading' | 'ready' | 'processing' | 'error'> = {
          loading: 'loading',
          ready: 'ready',
          processing: 'processing',
          error: 'error',
        };
        const mapped = statusMap[data.status];
        if (mapped) {
          useMetricsStore.getState().setAiStatus(mapped);
        }
        return;
      }

      // Model yükleme ilerleme
      if (data.type === 'model-progress') {
        console.log(`[ML] Model: ${data.progress}%`);
        return;
      }

      // Worker hazır sinyali
      if (data.type === 'worker-ready') {
        console.log('[ML] Neural Hub başlatıldı');
        // Hemen modelleri yüklemeye başla
        const initId = generateId();
        worker?.postMessage({ type: 'init', id: initId });
        return;
      }

      // Callback çözümleme
      if (data.id && pendingCallbacks.has(data.id)) {
        const cb = pendingCallbacks.get(data.id)!;
        pendingCallbacks.delete(data.id);
        cb(data);
      }
    };

    worker.onerror = (error) => {
      console.error('[ML] Worker hatası:', error);
      useMetricsStore.getState().setAiStatus('error');
    };
  } catch (e) {
    console.error('[ML] Worker oluşturulamadı:', e);
    useMetricsStore.getState().setAiStatus('error');
  }
}

/**
 * Verilen makale başlıklarını AI modeline analiz için gönder.
 * Sonuçları store'a yaz ve ThreatAlert oluştur.
 */
export async function analyzeIntelSentiment(articles: IntelArticle[]): Promise<void> {
  if (!worker) {
    console.warn('[ML] Worker henüz başlatılmadı');
    return;
  }

  if (articles.length === 0) return;

  const id = generateId();
  const texts = articles.map((a) => ({ id: a.id, text: a.title }));

  return new Promise((resolve) => {
    pendingCallbacks.set(id, (data) => {
      if (data.type === 'sentiment-result' && Array.isArray(data.results)) {
        const store = useMetricsStore.getState();

        // 🛡️ TRIPLE LOCK: Manager-side Heuristic Redundancy
        const SAFETY_KEYWORDS = [
          'murder', 'killing', 'death', 'violence', 'attack', 'dead', 'killed', 'bloody', 'terror',
          'genocide', 'war', 'conflict', 'bombing', 'bomb', 'victim', 'strike', 'missing', 'slaughter',
          'soykirim', 'soykırım', 'savas', 'savaş', 'katliam', 'sehit', 'şehit'
        ];

        // Mevcut makaleleri güncelle
        const updatedArticles = store.intelEvents.map((article) => {
          const result = data.results.find((r: any) => r.articleId === article.id);
          
          // Keyword bazlı zorunlu kontrol (Worker cache koruması)
          const text = article.title.toLowerCase();
          const isExtreme = SAFETY_KEYWORDS.some(kw => text.includes(kw));

          if (result || isExtreme) {
            return {
              ...article,
              sentimentScore: isExtreme ? 1.0 : result.score,
              sentimentLabel: isExtreme ? 'negative' as const : (result.label as 'positive' | 'negative'),
            };
          }
          return article;
        });
        store.setIntelEvents(updatedArticles);

        // %85+ "Negative" olanlar için ThreatAlert oluştur + Konumlandırma
        const GEO_DICTIONARY: Record<string, [number, number]> = {
          'iran': [32.4279, 53.6880],
          'israel': [31.0461, 34.8516],
          'gaza': [31.3268, 34.3015],
          'palestine': [31.9522, 35.2332],
          'russia': [61.5240, 105.3188],
          'ukraine': [48.3794, 31.1656],
          'moscow': [55.7558, 37.6173],
          'kyiv': [50.4501, 30.5234],
          'taiwan': [23.6978, 120.9605],
          'china': [35.8617, 104.1954],
          'beijing': [39.9042, 116.4074],
          'usa': [37.0902, -95.7129],
          'washington': [38.9072, -77.0369],
          'syria': [34.8021, 38.9968],
          'yemen': [15.5527, 48.5164],
          'lebanon': [33.8547, 35.8623],
          'korea': [37.6650, 127.0264],  // kuzey/güney ikisi de bu bölgede
          'japan': [36.2048, 138.2529]
        };

        for (const result of data.results) {
          if (result.label === 'negative' && result.score >= 0.85) {
            const article = articles.find((a) => a.id === result.articleId);
            if (article) {
              const textLower = article.title.toLowerCase();
              let lat = 0, lng = 0;
              for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
                if (textLower.includes(key)) {
                  [lat, lng] = coords;
                  break;
                }
              }

              store.addThreatAlert({
                id: `threat-${article.id}`,
                title: article.title,
                topicId: article.topicId,
                severity: result.score,
                time: Date.now(),
                ...(lat !== 0 ? { lat, lng } : {})
              });
            }
          }
        }
      }
      resolve();
    });

    worker!.postMessage({ type: 'analyze-intelligence', id, articles: texts });
  });
}

/**
 * Worker'ı temizle
 */
export function terminateMLWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingCallbacks.clear();
    useMetricsStore.getState().setAiStatus('idle');
  }
}
