/**
 * ShadowNet V10.0 — ML Web Worker (Neural Memory & Correlation)
 */

import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// --- Mesaj Tipleri ---
interface InitMessage { type: 'init'; id: string; }
interface AnalyzeMessage { type: 'analyze-intelligence'; id: string; articles: Array<{ id: string; text: string }>; }
interface StatusMessage { type: 'status'; id: string; }

type MLWorkerMessage = InitMessage | AnalyzeMessage | StatusMessage;

// --- State ---
let sentimentPipeline: any = null;
let isLoading = false;
let isReady = false;

async function loadModels(): Promise<void> {
  if (isLoading) return;
  isLoading = true;

  try {
    self.postMessage({ type: 'status-update', status: 'loading', message: 'AI Analiz motoru yükleniyor...' });

    // 1. Sentiment Model (~25MB)
    sentimentPipeline = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );

    isReady = true;
    isLoading = false;
    self.postMessage({ type: 'status-update', status: 'ready', message: 'AI Analiz aktif.' });
  } catch (error) {
    isLoading = false;
    self.postMessage({ type: 'status-update', status: 'error', message: 'Modeller yüklenemedi.' });
  }
}

async function processIntelligence(articles: Array<{ id: string; text: string }>) {
  if (!isReady) await loadModels();

  const sentimentResults = [];

  for (const article of articles) {
    try {
      const truncated = article.text.slice(0, 512);

      // 1. ⚠️ Strategic Safety Heuristic (Regex-Based Absolute Negative)
      const NEGATIVE_KEYWORDS = [
        'murder', 'killing', 'death', 'violence', 'attack', 'dead', 'killed', 'bloody', 'terror',
        'genocide', 'war', 'conflict', 'bombing', 'bomb', 'victim', 'strike', 'missing', 'slaughter',
        'cinayet', 'olum', 'ölüm', 'saldiri', 'saldırı', 'katliam', 'taciz', 'istismar', 'suicid',
        'soykirim', 'soykırım', 'savas', 'savaş', 'catisma', 'çatışma', 'patlama', 'sehit', 'şehit'
      ];
      
      // Kelimeleri regex ile ara (Boşluk ve özel karakter toleranslı)
      const regex = new RegExp(`\\b(${NEGATIVE_KEYWORDS.join('|')})\\b`, 'i');
      const containsExtremeNegative = regex.test(truncated);

      if (containsExtremeNegative) {
        console.log(`[AI-Safety] Heuristic trigger for: "${truncated.slice(0, 30)}..."`);
      }

      // 2. Sentiment Analysis
      const sentimentOutput = await sentimentPipeline(truncated);
      let label = sentimentOutput[0].label.toLowerCase();
      let score = sentimentOutput[0].score;

      // Force Absolute Negative for extreme events
      if (containsExtremeNegative) {
        label = 'negative';
        score = 1.0; // Perfect confidence for hard-coded safety triggers
      }

      sentimentResults.push({
        articleId: article.id,
        label: label,
        score: score,
      });

    } catch (e) {
      console.warn(`[AIWorker] Processing error (${article.id}):`, e);
    }
  }

  return { sentimentResults };
}

self.onmessage = async (event: MessageEvent<MLWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init':
        await loadModels();
        self.postMessage({ type: 'init-result', id: message.id, ready: isReady });
        break;

      case 'analyze-intelligence':
        self.postMessage({ type: 'status-update', status: 'processing', message: 'AI İstihbarat taranıyor...' });
        try {
          const { sentimentResults } = await processIntelligence(message.articles);
          self.postMessage({ type: 'sentiment-result', id: message.id, results: sentimentResults });
        } catch (error) {
           console.error('[ML Worker] Analysis failed:', error);
           self.postMessage({ type: 'status-update', status: 'error', message: 'Analiz hatası oluştu.' });
        } finally {
          self.postMessage({ type: 'status-update', status: 'ready', message: 'AI Analiz aktif.' });
        }
        break;

      case 'status':
        self.postMessage({ type: 'status-result', id: message.id, ready: isReady, loading: isLoading });
        break;
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: (message as any).id, error: String(error) });
  }
};

self.postMessage({ type: 'worker-ready' });
