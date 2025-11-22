// scripts/test-hf-env-and-embeddings.ts
//
// Purpose:
// - Check if HF_API_KEY is visible to this Node/ts-node process
// - Hit the HF embeddings endpoint once and inspect the response

import { loadEnvConfig } from '@next/env';

async function main() {
  // 1) Load .env, .env.local, etc. so scripts see the same env as Next
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  console.log('▶ SBERT / HF environment + embedding test');
  console.log('process.cwd() =', projectDir);
  console.log('----------------------------------------\n');

  const apiKey = process.env.HF_API_KEY;
  const url =
    process.env.HF_EMBEDDINGS_API_URL ||
    'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';

  console.log('HF_API_KEY present:', !!apiKey);
  console.log('HF_EMBEDDINGS_API_URL:', url);
  console.log('');

  if (!apiKey) {
    console.error('❌ HF_API_KEY is NOT visible to this script.');
    console.error('   Make sure it is in your environment or in a .env / .env.local at project root.');
    process.exit(1);
  }

  // 2) Try a simple embeddings request using Node 18+ built-in fetch
  const payload = {
    inputs: ['customer service', 'client support', 'wiring installation'],
  };

  console.log('Calling HF embeddings API...');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('HTTP status:', response.status);
  if (!response.ok) {
    const text = await response.text();
    console.error('❌ HF API call failed. Response body:\n', text);
    process.exit(1);
  }

  const data = await response.json();

  // data is usually an array of arrays of floats
  const dims = Array.isArray(data) && Array.isArray(data[0]) ? data[0].length : null;

  console.log('\nEmbedding dims:');
  console.log('  "customer service":', Array.isArray(data[0]) ? data[0].length : 'unknown');
  console.log('  "client support":', Array.isArray(data[1]) ? data[1].length : 'unknown');
  console.log('  "wiring installation":', Array.isArray(data[2]) ? data[2].length : 'unknown');

  if (dims) {
    console.log('\n✅ HF embeddings API appears to be working (dimension =', dims, ')');
  } else {
    console.log('\n⚠️ Response format was unexpected. Check the raw JSON payload if needed.');
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error in test-hf-env-and-embeddings.ts:', err);
  process.exit(1);
});
