import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import { generateContent, parseGeminiJSON } from './client';
import type { JobRequirements, ApplicantData } from './scoringAlgorithms';

type NormalizedKey = string;

interface CanonicalDegree {
  key: string;
  canonical: string;
  level?: string;
  fieldGroup?: string;
  aliases: string[];
}

interface CanonicalEligibility {
  key: string;
  canonical: string;
  category?: string;
  aliases: string[];
}

interface NormalizationResult {
  canonicalKey?: string;
  method: 'dictionary' | 'gemini' | 'fallback';
  confidence: number; // 0–1
  raw: string;
}

interface GeminiDegreeClassificationResponse {
  canonical_key: string;
  confidence?: number;
  reasoning?: string;
}

interface GeminiEligibilityClassificationResponse {
  canonical_key: string;
  confidence?: number;
  reasoning?: string;
}

// In-memory caches (loaded once per server process)
let degreesByKey: Map<string, CanonicalDegree> = new Map();
let eligibilitiesByKey: Map<string, CanonicalEligibility> = new Map();

// Alias indexes: normalized alias string → canonical item
let degreeAliasIndex: Map<NormalizedKey, CanonicalDegree> = new Map();
let eligibilityAliasIndex: Map<NormalizedKey, CanonicalEligibility> = new Map();

// Ensure YAML only loaded once and shared
let dictionariesLoaded = false;
let dictionariesLoadingPromise: Promise<void> | null = null;

/**
 * Normalize a string key for dictionary lookup:
 * - lowercase
 * - strip punctuation
 * - collapse whitespace
 */
function normalizeKey(raw: string): NormalizedKey {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' '); // collapse spaces
}

/**
 * Basic token overlap similarity (0–1) for pre-filtering candidates.
 * Not for scoring, just to pick top N candidates to show Gemini.
 */
function basicTokenSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));

  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) intersection++;
  }
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Parse various YAML layouts into a flat canonical degrees array.
 */
function parseDegreesYaml(doc: any): CanonicalDegree[] {
  if (!doc) return [];

  const source = doc.degrees ?? doc; // support { degrees: {...} } or top-level map
  const result: CanonicalDegree[] = [];

  // Format B: degrees is an array
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = item.key || item.id;
      if (!key || !item.canonical) continue;

      result.push({
        key: String(key),
        canonical: String(item.canonical),
        level: item.level,
        fieldGroup: item.field_group || item.fieldGroup,
        aliases: Array.isArray(item.aliases)
          ? item.aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  // Format A/C: object map
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        level: v.level,
        fieldGroup: v.field_group || v.fieldGroup,
        aliases,
      });
    }
    return result;
  }

  return [];
}

/**
 * Parse various YAML layouts into a flat canonical eligibilities array.
 */
function parseEligibilitiesYaml(doc: any): CanonicalEligibility[] {
  if (!doc) return [];

  const source = doc.eligibilities ?? doc;
  const result: CanonicalEligibility[] = [];

  // List format
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = item.key || item.id;
      if (!key || !item.canonical) continue;

      result.push({
        key: String(key),
        canonical: String(item.canonical),
        category: item.category,
        aliases: Array.isArray(item.aliases)
          ? item.aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  // Map format
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        category: v.category,
        aliases,
      });
    }
    return result;
  }

  return [];
}

/**
 * Load YAML dictionaries once and build alias indexes.
 * Designed to handle large YAML files:
 * - single parse per server process
 * - O(1) dictionary lookups afterwards.
 *
 * NEW: degrees.yaml and eligibilities.yaml are loaded independently.
 * If one file is broken, the other can still be used.
 */
async function ensureDictionariesLoaded(): Promise<void> {
  if (dictionariesLoaded) return;
  if (dictionariesLoadingPromise) {
    await dictionariesLoadingPromise;
    return;
  }

  dictionariesLoadingPromise = (async () => {
    const root = process.cwd();

    const degreesPath = path.join(
      root,
      'src',
      'app',
      'config',
      'dictionaries',
      'degrees.yaml'
    );
    const eligibilitiesPath = path.join(
      root,
      'src',
      'app',
      'config',
      'dictionaries',
      'eligibilities.yaml'
    );

    console.log('[JobSync] normalization: process.cwd() =', root);
    console.log('[JobSync] normalization: degreesPath =', degreesPath);
    console.log('[JobSync] normalization: eligibilitiesPath =', eligibilitiesPath);

    let degreesDoc: any = null;
    let eligibilitiesDoc: any = null;

    // Load degrees.yaml independently
    try {
      if (fs.existsSync(degreesPath)) {
        const raw = await fs.promises.readFile(degreesPath, 'utf8');
        degreesDoc = yaml.load(raw);
      } else {
        console.warn(
          '[JobSync] degrees.yaml not found, running without degree dictionary.'
        );
      }
    } catch (err) {
      console.error(
        '[JobSync] Failed to load degrees.yaml, continuing WITHOUT degree dictionary:',
        err
      );
      degreesDoc = null;
    }

    // Load eligibilities.yaml independently
    try {
      if (fs.existsSync(eligibilitiesPath)) {
        const raw = await fs.promises.readFile(eligibilitiesPath, 'utf8');
        eligibilitiesDoc = yaml.load(raw);
      } else {
        console.warn(
          '[JobSync] eligibilities.yaml not found, running without eligibility dictionary.'
        );
      }
    } catch (err) {
      console.error(
        '[JobSync] Failed to load eligibilities.yaml, continuing WITHOUT eligibility dictionary:',
        err
      );
      eligibilitiesDoc = null;
    }

    // Parse documents into flat lists (safe even if docs are null)
    const degreesList = parseDegreesYaml(degreesDoc);
    const eligList = parseEligibilitiesYaml(eligibilitiesDoc);

    console.log('[JobSync] Parsed dictionaries counts:', {
      degrees: degreesList.length,
      eligibilities: eligList.length,
    });

    // Reset maps
    degreesByKey = new Map();
    eligibilitiesByKey = new Map();
    degreeAliasIndex = new Map();
    eligibilityAliasIndex = new Map();

    // Build degree maps (if any)
    for (const d of degreesList) {
      degreesByKey.set(d.key, d);

      const allStrings = new Set<string>();
      allStrings.add(d.canonical);
      d.aliases.forEach(a => allStrings.add(a));

      for (const s of allStrings) {
        const nk = normalizeKey(s);
        if (degreeAliasIndex.has(nk)) {
          // ambiguous alias, keep first
          continue;
        }
        degreeAliasIndex.set(nk, d);
      }
    }

    // Build eligibility maps (if any)
    for (const e of eligList) {
      eligibilitiesByKey.set(e.key, e);

      const allStrings = new Set<string>();
      allStrings.add(e.canonical);
      e.aliases.forEach(a => allStrings.add(a));

      for (const s of allStrings) {
        const nk = normalizeKey(s);
        if (eligibilityAliasIndex.has(nk)) {
          continue;
        }
        eligibilityAliasIndex.set(nk, e);
      }
    }

    dictionariesLoaded = true;

    // 🔍 Extra debug: check the exact alias you care about
    const debugAlias1 = normalizeKey('Career Service Professional');
    const debugAlias2 = normalizeKey('Career Service Professional Eligibility');
    const debugAlias3 = normalizeKey(
      'Career Service Professional Eligibility (Second Level)'
    );

    console.log('[JobSync] DEBUG alias lookup:', {
      key1: debugAlias1,
      has1: eligibilityAliasIndex.has(debugAlias1),
      value1: eligibilityAliasIndex.get(debugAlias1)?.key ?? null,
      key2: debugAlias2,
      has2: eligibilityAliasIndex.has(debugAlias2),
      value2: eligibilityAliasIndex.get(debugAlias2)?.key ?? null,
      key3: debugAlias3,
      has3: eligibilityAliasIndex.has(debugAlias3),
      value3: eligibilityAliasIndex.get(debugAlias3)?.key ?? null,
    });
  })();

  await dictionariesLoadingPromise;
}

/**
 * 🔍 Exported helper so your test script can inspect dictionary state.
 */
export async function debugDumpEligibilityState() {
  await ensureDictionariesLoaded();

  const sampleEligKeys = Array.from(eligibilitiesByKey.keys()).slice(0, 10);
  const sampleAliases = Array.from(eligibilityAliasIndex.entries())
    .slice(0, 10)
    .map(([k, v]) => ({ normalizedAlias: k, key: v.key, canonical: v.canonical }));

  const probeKey1 = normalizeKey('Career Service Professional');
  const probeKey2 = normalizeKey('Career Service Professional Eligibility');
  const probeKey3 = normalizeKey('Career Service Professional Eligibility (Second Level)');

  console.log('===== DEBUG ELIGIBILITY STATE =====');
  console.log('eligibilitiesByKey.size =', eligibilitiesByKey.size);
  console.log('eligibilityAliasIndex.size =', eligibilityAliasIndex.size);
  console.log('sample eligibility keys =', sampleEligKeys);
  console.log('sample alias entries =', sampleAliases);
  console.log('probe alias keys:', {
    probeKey1,
    has1: eligibilityAliasIndex.has(probeKey1),
    value1: eligibilityAliasIndex.get(probeKey1),
    probeKey2,
    has2: eligibilityAliasIndex.has(probeKey2),
    value2: eligibilityAliasIndex.get(probeKey2),
    probeKey3,
    has3: eligibilityAliasIndex.has(probeKey3),
    value3: eligibilityAliasIndex.get(probeKey3),
  });
  console.log('===================================');
}

/**
 * Fast dictionary normalization for degrees (no Gemini).
 */
function normalizeDegreeWithDictionary(raw: string): CanonicalDegree | undefined {
  const key = normalizeKey(raw);
  return degreeAliasIndex.get(key);
}

/**
 * Fast dictionary normalization for eligibilities (no Gemini).
 */
function normalizeEligibilityWithDictionary(raw: string): CanonicalEligibility | undefined {
  const key = normalizeKey(raw);
  return eligibilityAliasIndex.get(key);
}

/**
 * Pick top N canonical degrees using simple token similarity,
 * to avoid sending the entire dictionary to Gemini.
 */
function getTopDegreeCandidates(raw: string, limit: number): CanonicalDegree[] {
  if (!degreesByKey.size) return [];

  const scored: { degree: CanonicalDegree; score: number }[] = [];

  for (const degree of degreesByKey.values()) {
    const score = basicTokenSimilarity(raw, degree.canonical);
    if (score <= 0) continue;
    scored.push({ degree, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.degree);
}

/**
 * Pick top N canonical eligibilities using simple token similarity.
 */
function getTopEligibilityCandidates(raw: string, limit: number): CanonicalEligibility[] {
  if (!eligibilitiesByKey.size) return [];

  const scored: { eligibility: CanonicalEligibility; score: number }[] = [];

  for (const eligibility of eligibilitiesByKey.values()) {
    const score = basicTokenSimilarity(raw, eligibility.canonical);
    if (score <= 0) continue;
    scored.push({ eligibility, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.eligibility);
}

/**
 * Build Gemini prompt for degree classification.
 */
function buildDegreeClassificationPrompt(
  rawDegree: string,
  candidates: CanonicalDegree[]
): string {
  const options = candidates.map(c => ({
    key: c.key,
    canonical: c.canonical,
    level: c.level ?? null,
    field_group: c.fieldGroup ?? null,
  }));

  return `
You are part of an HR system for Philippine government jobs.
Your task is to NORMALIZE an applicant's degree name to one of the canonical degrees provided.

The system has the following canonical degree options (JSON):

${JSON.stringify(options, null, 2)}

Given this raw applicant degree string:

"${rawDegree}"

Choose the SINGLE best canonical degree key from the list above.
If you are not reasonably sure, choose "UNKNOWN".

Respond ONLY in this exact JSON format:

{
  "canonical_key": "<one of the keys from the list OR 'UNKNOWN'>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<short explanation in 1-2 sentences>"
}
`;
}

/**
 * Build Gemini prompt for eligibility classification.
 */
function buildEligibilityClassificationPrompt(
  rawEligibility: string,
  candidates: CanonicalEligibility[]
): string {
  const options = candidates.map(c => ({
    key: c.key,
    canonical: c.canonical,
    category: c.category ?? null,
  }));

  return `
You are part of an HR system for Philippine government jobs.
Your task is to NORMALIZE an applicant's eligibility or license name to one of the canonical eligibilities provided.

The system has the following canonical eligibility options (JSON):

${JSON.stringify(options, null, 2)}

Given this raw applicant eligibility string:

"${rawEligibility}"

Choose the SINGLE best canonical eligibility key from the list above.
If you are not reasonably sure, choose "UNKNOWN".

Respond ONLY in this exact JSON format:

{
  "canonical_key": "<one of the keys from the list OR 'UNKNOWN'>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<short explanation in 1-2 sentences>"
}
`;
}

/**
 * Normalize a degree string using:
 * 1. Fast dictionary/alias check
 * 2. Gemini classifier (if no dictionary hit)
 */
export async function normalizeDegreeValue(rawDegree: string): Promise<NormalizationResult> {
  await ensureDictionariesLoaded();

  if (!rawDegree || !rawDegree.trim()) {
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawDegree,
    };
  }

  // 1) Fast alias/dictionary check
  const dictHit = normalizeDegreeWithDictionary(rawDegree);
  if (dictHit) {
    return {
      canonicalKey: dictHit.key,
      method: 'dictionary',
      confidence: 1,
      raw: rawDegree,
    };
  }

  // 2) Gemini classifier fallback
  const candidates = getTopDegreeCandidates(rawDegree, 20);
  if (!candidates.length) {
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawDegree,
    };
  }

  const prompt = buildDegreeClassificationPrompt(rawDegree, candidates);

  try {
    // Use a fast, free-ish Gemini model for classification
    const text = await generateContent(prompt, 'gemini-2.0-flash-exp');
    const parsed = parseGeminiJSON<GeminiDegreeClassificationResponse>(text);

    const key = parsed.canonical_key;
    if (!key || key === 'UNKNOWN') {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.3,
        raw: rawDegree,
      };
    }

    const degree = degreesByKey.get(key);
    if (!degree) {
      // Gemini returned a key that does not exist in our config; ignore
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.2,
        raw: rawDegree,
      };
    }

    return {
      canonicalKey: key,
      method: 'gemini',
      confidence: parsed.confidence ?? 0.8,
      raw: rawDegree,
    };
  } catch (err) {
    console.error('[JobSync] Gemini degree normalization failed:', err);
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawDegree,
    };
  }
}

/**
 * Normalize an eligibility string using:
 * 1. Fast dictionary/alias check
 * 2. Gemini classifier (if no dictionary hit)
 */
export async function normalizeEligibilityValue(rawEligibility: string): Promise<NormalizationResult> {
  await ensureDictionariesLoaded();

  if (!rawEligibility || !rawEligibility.trim()) {
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawEligibility,
    };
  }

  // 1) Fast alias/dictionary check
  const dictHit = normalizeEligibilityWithDictionary(rawEligibility);
  if (dictHit) {
    return {
      canonicalKey: dictHit.key,
      method: 'dictionary',
      confidence: 1,
      raw: rawEligibility,
    };
  }

  // 2) Gemini classifier fallback
  const candidates = getTopEligibilityCandidates(rawEligibility, 20);
  if (!candidates.length) {
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawEligibility,
    };
  }

  const prompt = buildEligibilityClassificationPrompt(rawEligibility, candidates);

  try {
    const text = await generateContent(prompt, 'gemini-2.0-flash-exp');
    const parsed = parseGeminiJSON<GeminiEligibilityClassificationResponse>(text);

    const key = parsed.canonical_key;
    if (!key || key === 'UNKNOWN') {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.3,
        raw: rawEligibility,
      };
    }

    const eligibility = eligibilitiesByKey.get(key);
    if (!eligibility) {
      return {
        canonicalKey: undefined,
        method: 'gemini',
        confidence: parsed.confidence ?? 0.2,
        raw: rawEligibility,
      };
    }

    return {
      canonicalKey: key,
      method: 'gemini',
      confidence: parsed.confidence ?? 0.8,
      raw: rawEligibility,
    };
  } catch (err) {
    console.error('[JobSync] Gemini eligibility normalization failed:', err);
    return {
      canonicalKey: undefined,
      method: 'fallback',
      confidence: 0,
      raw: rawEligibility,
    };
  }
}

/**
 * Normalize a composite eligibility line (with AND/OR/commas) into
 * canonical tokens while preserving AND/OR semantics.
 *
 * Example:
 *   "Certified Public Accountant and Career Service Professional Eligibility"
 *   → "Certified Public Accountant (CPA) and Career Service Professional Eligibility (Second Level)"
 */
async function normalizeCompositeEligibilityLine(rawLine: string): Promise<string> {
  const trimmed = rawLine.trim();
  if (!trimmed) return rawLine;

  const lower = trimmed.toLowerCase();

  const hasAnd = /\sand\s/.test(lower);
  const hasOr = /\sor\s/.test(lower);
  const hasComma = trimmed.includes(',');

  // If no AND/OR/commas are present, treat as simple line (handled elsewhere)
  if (!hasAnd && !hasOr && !hasComma) {
    return rawLine;
  }

  // Tokenize similar to parseListExpression in scoringAlgorithms.ts:
  // replace " and " / " or " with commas, then split.
  const tokens = trimmed
    .replace(/\s+(or|and)\s+/gi, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return rawLine;
  }

  const normalizedTokens: string[] = [];

  for (const token of tokens) {
    try {
      const result = await normalizeEligibilityValue(token);
      const canonical =
        result.canonicalKey && eligibilitiesByKey.get(result.canonicalKey)
          ? eligibilitiesByKey.get(result.canonicalKey)!.canonical
          : token;

      normalizedTokens.push(canonical);
    } catch (err) {
      console.error('[JobSync] Composite eligibility token normalization failed, using raw token:', {
        token,
        error: err,
      });
      normalizedTokens.push(token);
    }
  }

  if (!normalizedTokens.length) {
    return rawLine;
  }

  // Decide how to join tokens back so detectListMode/parseListExpression still work.
  // We mimic detectListMode: if there's any "and" we treat as AND; else if there's "or", OR.
  let joiner: string;
  if (hasAnd) {
    joiner = ' and ';
  } else if (hasOr) {
    joiner = ' or ';
  } else {
    // Only commas originally: treat as OR by default
    joiner = ' or ';
  }

  return normalizedTokens.join(joiner);
}

/**
 * Normalize a possibly-composite degree string (with AND/OR/commas) into
 * canonical degree names while preserving AND/OR semantics.
 *
 * Example:
 *   "BS Accountancy and BSBA Major in Financial Management"
 *   → "Bachelor of Science in Accountancy and Bachelor of Science in Business Administration major in Financial Management"
 *
 * Returns:
 *   - canonicalText: the reconstructed string that scoringAlgorithms.ts will see
 *   - primaryEntry:  the first canonical degree entry we found (used for level/fieldGroup metadata)
 */
async function normalizeCompositeDegreeString(
  rawDegree: string
): Promise<{ canonicalText: string; primaryEntry?: CanonicalDegree }> {
  const original = rawDegree ?? '';
  const trimmed = original.trim();
  if (!trimmed) {
    return { canonicalText: original, primaryEntry: undefined };
  }

  const lower = trimmed.toLowerCase();
  const hasAnd = /\sand\s/.test(lower);
  const hasOr = /\sor\s/.test(lower);
  const hasComma = trimmed.includes(',');

  // If there are no list markers, fall back to the existing single-degree normalization.
  if (!hasAnd && !hasOr && !hasComma) {
    const result = await normalizeDegreeValue(trimmed);
    const entry =
      result.canonicalKey && degreesByKey.get(result.canonicalKey)
        ? degreesByKey.get(result.canonicalKey)!
        : undefined;

    const canonical = entry ? entry.canonical : trimmed;

    return {
      canonicalText: canonical,
      primaryEntry: entry,
    };
  }

  // Split into tokens similar to parseListExpression in scoringAlgorithms.ts
  const rawTokens = trimmed
    .replace(/\s+(or|and)\s+/gi, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (!rawTokens.length) {
    return { canonicalText: original, primaryEntry: undefined };
  }

  const canonicalTokens: string[] = [];
  let primaryEntry: CanonicalDegree | undefined;

  for (const token of rawTokens) {
    try {
      const result = await normalizeDegreeValue(token);
      const entry =
        result.canonicalKey && degreesByKey.get(result.canonicalKey)
          ? degreesByKey.get(result.canonicalKey)!
          : undefined;

      const canonical = entry ? entry.canonical : token;

      if (!primaryEntry && entry) {
        primaryEntry = entry;
      }

      canonicalTokens.push(canonical);
    } catch (err) {
      console.error('[JobSync] Degree token normalization failed, using raw token:', {
        token,
        error: err,
      });
      canonicalTokens.push(token);
    }
  }

  // Reconstruct the line with the same semantics
  let joiner: string;
  if (hasAnd) {
    joiner = ' and ';
  } else if (hasOr) {
    joiner = ' or ';
  } else {
    // Only commas originally; treat as OR by default
    joiner = ' or ';
  }

  const canonicalText = canonicalTokens.join(joiner);
  return { canonicalText, primaryEntry };
}

/**
 * High-level helper:
 * Given JobRequirements + ApplicantData, return copies with:
 * - degreeRequirement normalized to canonical degree name (if available)
 * - highestEducationalAttainment normalized
 * - eligibilities normalized to canonical names
 */
export async function normalizeJobAndApplicant(
  job: JobRequirements,
  applicant: ApplicantData
): Promise<{ job: JobRequirements; applicant: ApplicantData }> {
  await ensureDictionariesLoaded();

  // 🔹 Degrees (job + applicant)
  //
  // New behavior:
  // - If the string is simple (no "and"/"or"/","), we normalize it as a single degree.
  // - If it is composite, we split into tokens, normalize each token, then
  //   reconstruct a canonical string that still contains "and"/"or".
  //   This allows matchDegreeRequirement() in scoringAlgorithms.ts to
  //   correctly apply SINGLE / AND / OR semantics, while still benefiting
  //   from YAML+Gemini canonicalization.
  const {
    canonicalText: jobDegreeCanonical,
    primaryEntry: jobDegreeEntry,
  } = await normalizeCompositeDegreeString(job.degreeRequirement || '');

  const {
    canonicalText: applicantDegreeCanonical,
    primaryEntry: applicantDegreeEntry,
  } = await normalizeCompositeDegreeString(
    applicant.highestEducationalAttainment || ''
  );

  // 🔹 Job eligibilities (string array)
  //
  // Updated behavior:
  // - SIMPLE lines (no AND/OR/commas) → canonicalized via YAML dictionary
  // - COMPOSITE lines (with "and"/"or"/commas) → each token is canonicalized
  //   but AND/OR semantics are preserved in the reconstructed line.
  const normalizedJobEligibilities: string[] = await Promise.all(
    (job.eligibilities || []).map(async (line) => {
      if (!line) return line;

      const trimmed = line.trim();
      if (!trimmed) return line;

      const lower = trimmed.toLowerCase();

      const hasAnd = /\sand\s/.test(lower);
      const hasOr = /\sor\s/.test(lower);
      const hasComma = trimmed.includes(',');

      // Composite lines → normalize EACH token but keep AND/OR semantics
      if (hasAnd || hasOr || hasComma) {
        try {
          const normalizedLine = await normalizeCompositeEligibilityLine(trimmed);
          return normalizedLine;
        } catch (err) {
          console.error(
            '[JobSync] Composite job eligibility normalization failed, using raw line:',
            { line, error: err }
          );
          return line;
        }
      }

      // Simple single eligibility → dictionary normalization
      try {
        const result = await normalizeEligibilityValue(trimmed);
        const canonical =
          result.canonicalKey && eligibilitiesByKey.get(result.canonicalKey)
            ? eligibilitiesByKey.get(result.canonicalKey)!.canonical
            : trimmed;

        return canonical;
      } catch (err) {
        console.error('[JobSync] Job eligibility normalization failed, using raw text:', {
          line,
          error: err,
        });
        return line;
      }
    })
  );
  

  // 🔹 Applicant eligibilities (unchanged, still canonicalized)
  const normalizedApplicantEligibilities = await Promise.all(
    (applicant.eligibilities || []).map(async (e) => {
      const result = await normalizeEligibilityValue(e.eligibilityTitle);
      const canonical =
        result.canonicalKey && eligibilitiesByKey.get(result.canonicalKey)
          ? eligibilitiesByKey.get(result.canonicalKey)!.canonical
          : e.eligibilityTitle;

      return {
        ...e,
        eligibilityTitle: canonical,
      };
    })
  );

  const normalizedJob: JobRequirements = {
    ...job,
    degreeRequirement: jobDegreeCanonical,
    eligibilities: normalizedJobEligibilities,

    // NEW: attach metadata if available
    degreeLevel: jobDegreeEntry?.level?.toLowerCase().trim(),
    degreeFieldGroup: jobDegreeEntry?.fieldGroup, // already normalized from YAML
  };

  const normalizedApplicant: ApplicantData = {
    ...applicant,
    highestEducationalAttainment: applicantDegreeCanonical,
    eligibilities: normalizedApplicantEligibilities,

    // NEW: attach metadata if available
    degreeLevel: applicantDegreeEntry?.level?.toLowerCase().trim(),
    degreeFieldGroup: applicantDegreeEntry?.fieldGroup,
  };

  return { job: normalizedJob, applicant: normalizedApplicant };
}
