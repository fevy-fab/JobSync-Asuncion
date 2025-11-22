import { NextRequest, NextResponse } from 'next/server';
import {
  getSkillEmbedding,
  semanticSimilarityPercent,
} from '@/lib/semantic/sbertSkills';

export async function GET(_req: NextRequest) {
  const a = 'customer service';
  const b = 'client support';

  const [embA, embB] = await Promise.all([
    getSkillEmbedding(a),
    getSkillEmbedding(b),
  ]);

  let sim: number | null = null;
  if (embA.length && embB.length) {
    sim = semanticSimilarityPercent(embA, embB);
  }

  return NextResponse.json({
    HF_API_KEY_present: !!process.env.HF_API_KEY,
    a,
    b,
    embeddingDims: {
      a: embA.length,
      b: embB.length,
    },
    similarityPercent: sim,
  });
}
