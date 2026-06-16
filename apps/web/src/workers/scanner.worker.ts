let wasmInitialized = false;
let analyzeBuffer: ((data: Uint8Array) => string) | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      // Fetch WASM engine from Worker (public route, no auth needed)
      const res = await fetch(`${payload.workerUrl}/v1/engine`);
      if (!res.ok) throw new Error(`Engine fetch failed: ${res.status}`);
      const wasmBytes = await res.arrayBuffer();

      const { default: init, analyze_binary_buffer } =
        await import(/* @vite-ignore */ payload.bindingsUrl);

      await init({ module_or_path: wasmBytes });
      analyzeBuffer = analyze_binary_buffer;
      wasmInitialized = true;
      self.postMessage({ type: 'READY' });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message });
    }
  }

  if (type === 'SCAN') {
    if (!wasmInitialized || !analyzeBuffer) {
      self.postMessage({ type: 'ERROR', message: 'Engine not initialized' });
      return;
    }
    try {
      // payload.fileBuffer is a Transferable — we own it now
      const uint8 = new Uint8Array(payload.fileBuffer);
      const telemetryJson = analyzeBuffer(uint8);
      const parsed = JSON.parse(telemetryJson);
      if (parsed.error) throw new Error(parsed.error);

      // Import and apply telemetry sanitizer
      const { TelemetrySanitizer } = await import('../utils/sanitizer');
      const sanitizedPayload = TelemetrySanitizer.sanitize(parsed);
      const sanitizedTelemetryJson = JSON.stringify(sanitizedPayload);

      self.postMessage({ type: 'RESULT', telemetry: sanitizedTelemetryJson });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', message: err.message });
    }
  }
};
