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
        console.log('[ML] Worker başlatıldı');
        // Hemen modeli yüklemeye başla
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
  const texts = articles.map((a) => ({ articleId: a.id, text: a.title }));

  return new Promise((resolve) => {
    pendingCallbacks.set(id, (data) => {
      if (data.type === 'sentiment-result' && Array.isArray(data.results)) {
        const store = useMetricsStore.getState();

        // Mevcut makaleleri güncelle
        const updatedArticles = store.intelEvents.map((article) => {
          const result = data.results.find((r: any) => r.articleId === article.id);
          if (result) {
            return {
              ...article,
              sentimentScore: result.score,
              sentimentLabel: result.label as 'positive' | 'negative',
            };
          }
          return article;
        });
        store.setIntelEvents(updatedArticles);

        // %85+ "Negative" olanlar için ThreatAlert oluştur
        for (const result of data.results) {
          if (result.label === 'negative' && result.score >= 0.85) {
            const article = articles.find((a) => a.id === result.articleId);
            if (article) {
              store.addThreatAlert({
                id: `threat-${article.id}`,
                title: article.title,
                topicId: article.topicId,
                severity: result.score,
                time: Date.now(),
              });
            }
          }
        }
      }
      resolve();
    });

    worker!.postMessage({ type: 'analyze-sentiment', id, texts });
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
