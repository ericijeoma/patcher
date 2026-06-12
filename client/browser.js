const CACHE_NAME = 'patcher-wasm-v1';
let _analyzeBufferFn = null;
let _initialized = false;

async function loadEngine(workerUrl) {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    const [cachedWasm, cachedJs] = await Promise.all([
      cache.match(`${workerUrl}/v1/engine`),
      cache.match(`${workerUrl}/v1/engine.js`),
    ]);
    if (cachedWasm && cachedJs) {
      console.log('[patcher] Loaded engine from browser cache');
      return {
        wasmBuffer: await cachedWasm.arrayBuffer(),
        jsUrl: `${workerUrl}/v1/engine.js`,
      };
    }
  }

  console.log('[patcher] Downloading WASM engine...');
  const [wasmRes, jsRes] = await Promise.all([
    fetch(`${workerUrl}/v1/engine`),
    fetch(`${workerUrl}/v1/engine.js`),
  ]);

  if (!wasmRes.ok) throw new Error(`Failed to fetch WASM: ${wasmRes.status}`);
  if (!jsRes.ok)   throw new Error(`Failed to fetch JS bindings: ${jsRes.status}`);

  const wasmBuffer = await wasmRes.arrayBuffer();

  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([
      cache.put(`${workerUrl}/v1/engine`, new Response(wasmBuffer.slice(0), { headers: { 'Content-Type': 'application/wasm' } })),
      cache.put(`${workerUrl}/v1/engine.js`, jsRes.clone()),
    ]);
  }

  return { wasmBuffer, jsUrl: `${workerUrl}/v1/engine.js` };
}

async function ensureInitialized(workerUrl) {
  if (_initialized) return;
  const { wasmBuffer, jsUrl } = await loadEngine(workerUrl);
  const { default: init, analyze_binary_buffer } = await import(/* webpackIgnore: true */ jsUrl);
  const wasmModule = await WebAssembly.compile(wasmBuffer);
  await init(wasmModule);
  _analyzeBufferFn = analyze_binary_buffer;
  _initialized = true;
}

export async function analyzeFile(file, workerUrl) {
  if (!file)      throw new Error('No file provided');
  if (!workerUrl) throw new Error('Worker URL is required');

  await ensureInitialized(workerUrl);
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array  = new Uint8Array(arrayBuffer);

  const telemetryJson = _analyzeBufferFn(uint8Array);
  const telemetry = JSON.parse(telemetryJson);
  if (telemetry.error) throw new Error(`Analysis error: ${telemetry.error}`);

  const res = await fetch(`${workerUrl}/v1/analyze/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: telemetryJson,
  });

  if (!res.ok) throw new Error(`Triage failed (${res.status})`);
  return res.json();
}

export async function clearEngineCache(workerUrl) {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([
      cache.delete(`${workerUrl}/v1/engine`),
      cache.delete(`${workerUrl}/v1/engine.js`),
    ]);
    _initialized = false;
    _analyzeBufferFn = null;
  }
}
