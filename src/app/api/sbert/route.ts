import { NextResponse } from 'next/server';
import {
  getSkillEmbedding,
  semanticSimilarityPercent,
} from '@/lib/semantic/sbertSkills';

export async function GET() {
  const hasKey = !!process.env.HF_API_KEY;
  const apiUrl =
    process.env.HF_EMBEDDINGS_API_URL ??
    'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';

  const skillA = 'customer service';
  const skillB = 'client support';

  const [embA, embB] = await Promise.all([
    getSkillEmbedding(skillA),
    getSkillEmbedding(skillB),
  ]);

  const dims = {
    [skillA]: embA.length,
    [skillB]: embB.length,
  };

  const similarity =
    embA.length && embB.length
      ? semanticSimilarityPercent(embA, embB)
      : null;

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? 'unknown',
    HF_API_KEY_present: hasKey,
    HF_EMBEDDINGS_API_URL: apiUrl,
    embeddingDims: dims,
    similarityPercent: similarity,
  });
}
