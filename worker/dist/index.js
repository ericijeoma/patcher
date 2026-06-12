// ─── Bundler-target WASM imports (for server-side backward-compat) ───────────
import { analyze_binary_buffer, run_cloud_fuzzing, } from '../../pkg/patcher.js';
import wasmModule from '../../pkg/patcher_bg.wasm';
import { __wbg_set_wasm } from '../../pkg/patcher_bg.js';
let wasmInitialized = false;
async function ensureWasm() {
    if (!wasmInitialized) {
        __wbg_set_wasm(wasmModule);
        wasmInitialized = true;
    }
}
async function triageWithDevstral(telemetryJsonString, apiKey) {
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'DEVSTRAL_API_KEY is not configured on this Worker.' }), { status: 500, headers: corsJsonHeaders() });
    }
    const devstralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'devstral-medium-latest',
            messages: [
                {
                    role: 'system',
                    content: `You are an elite Security AI Orchestrator.
Analyze the following WASM structural telemetry JSON from a target binary.
Identify structural failure mechanisms and output strict, actionable remediation strategies.
Do NOT output exploit payloads.
Return the analysis strictly as a JSON object containing:
'status', 'root_cause_mechanism', and 'mitigation_strategy'.`,
                },
                {
                    role: 'user',
                    content: telemetryJsonString,
                },
            ],
            response_format: { type: 'json_object' },
        }),
    });
    const triageResult = await devstralResponse.json();
    return new Response(JSON.stringify(triageResult), { headers: corsJsonHeaders() });
}
function corsJsonHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsJsonHeaders() });
        }
        if (url.pathname === '/v1/engine' && request.method === 'GET') {
            const assetUrl = new URL('/engine.wasm', request.url).toString();
            const assetResponse = await env.ASSETS.fetch(new Request(assetUrl));
            if (!assetResponse.ok) {
                return new Response(JSON.stringify({ error: 'WASM engine not found.' }), { status: 404, headers: corsJsonHeaders() });
            }
            return new Response(assetResponse.body, {
                headers: {
                    'Content-Type': 'application/wasm',
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }
        if (url.pathname === '/v1/engine.js' && request.method === 'GET') {
            const assetUrl = new URL('/engine.js', request.url).toString();
            const assetResponse = await env.ASSETS.fetch(new Request(assetUrl));
            if (!assetResponse.ok) {
                return new Response(JSON.stringify({ error: 'WASM JS bindings not found.' }), { status: 404, headers: corsJsonHeaders() });
            }
            return new Response(assetResponse.body, {
                headers: {
                    'Content-Type': 'application/javascript',
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }
        if (url.pathname === '/v1/analyze/triage' && request.method === 'POST') {
            try {
                const contentType = request.headers.get('Content-Type') ?? '';
                if (!contentType.includes('application/json')) {
                    return new Response(JSON.stringify({ error: 'Content-Type must be application/json.' }), { status: 415, headers: corsJsonHeaders() });
                }
                const telemetryJsonString = await request.text();
                try {
                    JSON.parse(telemetryJsonString);
                }
                catch {
                    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400, headers: corsJsonHeaders() });
                }
                return await triageWithDevstral(telemetryJsonString, env.DEVSTRAL_API_KEY);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsJsonHeaders() });
            }
        }
        if (url.pathname === '/v1/test/fuzz' && request.method === 'POST') {
            return handleFuzzingRequest(request);
        }
        if (request.method === 'POST') {
            try {
                await ensureWasm();
                const arrayBuffer = await request.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const telemetryJsonString = analyze_binary_buffer(uint8Array);
                if (telemetryJsonString.includes('"error"')) {
                    return new Response(telemetryJsonString, { status: 400, headers: corsJsonHeaders() });
                }
                return await triageWithDevstral(telemetryJsonString, env.DEVSTRAL_API_KEY);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsJsonHeaders() });
            }
        }
        return new Response(JSON.stringify({ service: 'patcher', status: 'active' }), { status: 200, headers: corsJsonHeaders() });
    },
};
async function handleFuzzingRequest(request) {
    try {
        await ensureWasm();
        const body = await request.json();
        const seed = body.seed ?? 42;
        const iterations = body.iterations ?? 1000;
        const startTime = Date.now();
        const fuzzingResult = run_cloud_fuzzing(seed, iterations);
        const analysisTimeMs = Date.now() - startTime;
        return new Response(JSON.stringify({
            ...JSON.parse(fuzzingResult),
            analysis_time_ms: analysisTimeMs,
            cpu_consumption: 'within_limits',
            status_code: 200,
        }), { headers: corsJsonHeaders(), status: 200 });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: msg, status: 'FAILED' }), { headers: corsJsonHeaders(), status: 500 });
    }
}
