/**
 * ShadowNet V9.0 — ML Web Worker
 * Tarayıcı içinde ONNX tabanlı Duygu Analizi (Sentiment Analysis) çalıştırır.
 * Sunucu veya API gerektirmez: tüm model kullanıcının tarayıcı önbelleğinde saklanır.
 */

import { pipeline, env } from '@xenova/transformers';

// Transformers.js Konfigürasyonu
env.allowLocalModels = false;
env.useBrowserCache = true;

// --- Mesaj Tipleri ---
interface InitMessage {
  type: 'init';
  id: string;
}

interface AnalyzeMessage {
  type: 'analyze-sentiment';
  id: string;
  texts: Array<{ articleId: string; text: string }>;
}

interface StatusMessage {
  type: 'status';
  id: string;
}

type MLWorkerMessage = InitMessage | AnalyzeMessage | StatusMessage;

// --- Pipeline State ---
let sentimentPipeline: any = null;
let isLoading = false;
let isReady = false;

/**
 * Model yükleme: İlk çağrıda ~25MB ONNX modeli indirilir,
 * sonraki çağrılarda tarayıcı önbelleğinden yüklenir (~2 saniye).
 */
async function loadSentimentModel(): Promise<void> {
  if (sentimentPipeline || isLoading) return;
  isLoading = true;

  try {
    self.postMessage({ type: 'status-update', status: 'loading', message: 'AI model yükleniyor...' });

    sentimentPipeline = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        progress_callback: (progress: { status: string; progress?: number }) => {
          if (progress.status === 'progress' && progress.progress !== undefined) {
            self.postMessage({
              type: 'model-progress',
              progress: Math.round(progress.progress),
            });
          }
        },
      }
    );

    isReady = true;
    isLoading = false;
    self.postMessage({ type: 'status-update', status: 'ready', message: 'AI hazır.' });
    console.log('[MLWorker] Sentiment model yüklendi ve hazır.');
  } catch (error) {
    isLoading = false;
    console.error('[MLWorker] Model yükleme hatası:', error);
    self.postMessage({ type: 'status-update', status: 'error', message: 'Model yüklenemedi.' });
  }
}

/**
 * Batch Duygu Analizi:
 * Verilen metin dizisindeki her başlığı puanlar ve sonuçları ana thread'e geri gönderir.
 */
async function analyzeSentiment(
  texts: Array<{ articleId: string; text: string }>
): Promise<Array<{ articleId: string; label: string; score: number }>> {
  if (!sentimentPipeline) {
    await loadSentimentModel();
  }
  if (!sentimentPipeline) {
    throw new Error('Model yüklenmedi');
  }

  const results: Array<{ articleId: string; label: string; score: number }> = [];

  for (const item of texts) {
    try {
      // Başlığı 512 karakterle sınırla (model token limiti)
      const truncated = item.text.slice(0, 512);
      const output = await sentimentPipeline(truncated);
      const result = (output as Array<{ label: string; score: number }>)[0];

      if (result) {
        results.push({
          articleId: item.articleId,
          label: result.label.toLowerCase(),
          score: result.score,
        });
      }
    } catch (e) {
      console.warn(`[MLWorker] Analiz hatası (${item.articleId}):`, e);
      results.push({
        articleId: item.articleId,
        label: 'negative',
        score: 0.5,
      });
    }
  }

  return results;
}

// --- Ana Mesaj İşleyici ---
self.onmessage = async (event: MessageEvent<MLWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init': {
        await loadSentimentModel();
        self.postMessage({ type: 'init-result', id: message.id, ready: isReady });
        break;
      }

      case 'analyze-sentiment': {
        self.postMessage({ type: 'status-update', status: 'processing', message: `${message.texts.length} makale analiz ediliyor...` });
        const results = await analyzeSentiment(message.texts);
        self.postMessage({
          type: 'sentiment-result',
          id: message.id,
          results,
        });
        self.postMessage({ type: 'status-update', status: 'ready', message: 'AI hazır.' });
        break;
      }

      case 'status': {
        self.postMessage({
          type: 'status-result',
          id: message.id,
          ready: isReady,
          loading: isLoading,
        });
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: (message as { id?: string }).id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// İlk sinyal
self.postMessage({ type: 'worker-ready' });
