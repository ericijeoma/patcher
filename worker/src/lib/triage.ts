import type { Env } from '../index';

const PROMPT_VERSION = 'v1';

// 1. The Strict JSON Schema (Forces Mistral to output exactly this shape)
export const TRIAGE_REPORT_SCHEMA = {
  name: 'hexis_triage_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['success', 'insufficient_data', 'error'] },
      risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'safe'] },
      root_cause_mechanism: { type: 'string' },
      explanation: { type: 'string' },
      mitigation_strategy: { type: 'string' },
      remediation_patches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            location: { type: 'string' },
            issue: { type: 'string' },
            patch: { type: 'string' },
          },
          required: ['location', 'issue', 'patch'],
        },
      },
    },
    required: [
      'status', 'risk_level', 'root_cause_mechanism',
      'explanation', 'mitigation_strategy', 'remediation_patches',
    ],
  },
} as const;

export interface TriageReport {
  status: 'success' | 'insufficient_data' | 'error';
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  root_cause_mechanism: string;
  explanation: string;
  mitigation_strategy: string;
  remediation_patches: Array<{ location: string; issue: string; patch: string }>;
}

const SYSTEM_PROMPT = `You are Hexis-Triage, a deterministic senior application security engineer reviewing isolated WASM/Binary structural telemetry.

Evaluate the isolated assembly context, control-flow anomalies, memory-safety signals, and mitigation state. Judge it using ONLY fields present in the telemetry object. If a field needed to assess a category is missing, set status to "insufficient_data" rather than guessing.

Stay strictly defensive:
- Never include exploit payloads, working proof-of-concept triggers, or shellcode.
- "remediation_patches" describes the defensive fix to apply, never the offensive technique that triggers the flaw.
- Use "explanation" for reasoning, written in plain English for a developer who is not a security specialist.`;

export async function runTriage(
  telemetryPayload: unknown,
  env: Env
): Promise<{ report: TriageReport; tokens_used: number; cached: boolean }> {
  // 1. Generate canonical hash cache key
  const cacheKey = await buildCacheKey(telemetryPayload);

  // 2. Check Edge Cache
  const cached = await env.AUTH_KV.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as TriageReport;
    return { report: parsed, tokens_used: 0, cached: true };
  }

  if (!env.DEVSTRAL_API_KEY) {
    throw new Error('DEVSTRAL_API_KEY is not configured.');
  }

  // 3. Call LLM with Strict Formatting & Zero Temperature
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEVSTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'devstral-medium-latest',
      temperature: 0,
      random_seed: 7367,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(telemetryPayload) },
      ],
      response_format: { type: 'json_schema', json_schema: TRIAGE_REPORT_SCHEMA },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Gateway Error: HTTP ${response.status}`);
  }

  const raw = await response.json() as any;
  const report: TriageReport = JSON.parse(raw.choices[0].message.content);
  const tokens_used = raw.usage?.completion_tokens ?? 0;

  // 4. Save to Cache (30 days)
  await env.AUTH_KV.put(cacheKey, JSON.stringify(report), { expirationTtl: 2592000 });

  return { report, tokens_used, cached: false };
}

// --- Cryptographic & Canonicalization Helpers ---

async function buildCacheKey(payload: unknown): Promise<string> {
  const canonical = canonicalize(payload);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `hexis:triage:${PROMPT_VERSION}:${hex}`;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
