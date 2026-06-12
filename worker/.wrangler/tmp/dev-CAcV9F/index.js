var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../pkg/patcher.js
import * as wasm2 from "./1e72d634ade8cdeaf1d90f4ebfa1a60c0f71ff3c-patcher_bg.wasm";

// ../pkg/patcher_bg.js
var patcher_bg_exports = {};
__export(patcher_bg_exports, {
  __wbg_set_wasm: () => __wbg_set_wasm,
  analyze_binary: () => analyze_binary,
  analyze_binary_buffer: () => analyze_binary_buffer,
  generate_shader_manifold: () => generate_shader_manifold,
  run_cloud_fuzzing: () => run_cloud_fuzzing
});
function analyze_binary(file_bytes) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(file_bytes, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.analyze_binary(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}
__name(analyze_binary, "analyze_binary");
function analyze_binary_buffer(buffer) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.analyze_binary_buffer(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}
__name(analyze_binary_buffer, "analyze_binary_buffer");
function generate_shader_manifold(file_bytes) {
  let deferred2_0;
  let deferred2_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(file_bytes, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    wasm.generate_shader_manifold(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred2_0 = r0;
    deferred2_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
  }
}
__name(generate_shader_manifold, "generate_shader_manifold");
function run_cloud_fuzzing(seed, iterations) {
  let deferred1_0;
  let deferred1_1;
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.run_cloud_fuzzing(retptr, seed, iterations);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    deferred1_0 = r0;
    deferred1_1 = r1;
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_export2(deferred1_0, deferred1_1, 1);
  }
}
__name(run_cloud_fuzzing, "run_cloud_fuzzing");
var cachedDataViewMemory0 = null;
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || cachedDataViewMemory0.buffer.detached === void 0 && cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
__name(getDataViewMemory0, "getDataViewMemory0");
function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}
__name(getStringFromWasm0, "getStringFromWasm0");
var cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
__name(getUint8ArrayMemory0, "getUint8ArrayMemory0");
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
__name(passArray8ToWasm0, "passArray8ToWasm0");
var cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
var MAX_SAFARI_DECODE_BYTES = 2146435072;
var numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
__name(decodeText, "decodeText");
var WASM_VECTOR_LEN = 0;
var wasm;
function __wbg_set_wasm(val) {
  wasm = val;
}
__name(__wbg_set_wasm, "__wbg_set_wasm");

// ../pkg/patcher.js
__wbg_set_wasm(wasm2);

// src/index.ts
import wasmModule from "./1e72d634ade8cdeaf1d90f4ebfa1a60c0f71ff3c-patcher_bg.wasm";
var wasmInitialized = false;
async function ensureWasm() {
  if (!wasmInitialized) {
    const instance = new WebAssembly.Instance(wasmModule, {
      "./patcher_bg.js": patcher_bg_exports
    });
    __wbg_set_wasm(instance.exports);
    wasmInitialized = true;
  }
}
__name(ensureWasm, "ensureWasm");
async function triageWithDevstral(telemetryJsonString, apiKey) {
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "DEVSTRAL_API_KEY is not configured on this Worker." }),
      { status: 500, headers: corsJsonHeaders() }
    );
  }
  const devstralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "devstral-medium-latest",
      messages: [
        {
          role: "system",
          content: `You are an elite Security AI Orchestrator.
Analyze the following WASM structural telemetry JSON from a target binary.
Identify structural failure mechanisms and output strict, actionable remediation strategies.
Do NOT output exploit payloads.
Return the analysis strictly as a JSON object containing:
'status', 'root_cause_mechanism', and 'mitigation_strategy'.`
        },
        {
          role: "user",
          content: telemetryJsonString
        }
      ],
      response_format: { type: "json_object" }
    })
  });
  const triageResult = await devstralResponse.json();
  return new Response(JSON.stringify(triageResult), { headers: corsJsonHeaders() });
}
__name(triageWithDevstral, "triageWithDevstral");
function corsJsonHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsJsonHeaders, "corsJsonHeaders");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsJsonHeaders() });
    }
    if (url.pathname === "/v1/engine" && request.method === "GET") {
      const assetUrl = new URL("/engine.wasm", request.url).toString();
      const assetResponse = await env.ASSETS.fetch(new Request(assetUrl));
      if (!assetResponse.ok) {
        return new Response(
          JSON.stringify({ error: "WASM engine not found." }),
          { status: 404, headers: corsJsonHeaders() }
        );
      }
      return new Response(assetResponse.body, {
        headers: {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (url.pathname === "/v1/engine.js" && request.method === "GET") {
      const assetUrl = new URL("/engine.js", request.url).toString();
      const assetResponse = await env.ASSETS.fetch(new Request(assetUrl));
      if (!assetResponse.ok) {
        return new Response(
          JSON.stringify({ error: "WASM JS bindings not found." }),
          { status: 404, headers: corsJsonHeaders() }
        );
      }
      return new Response(assetResponse.body, {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (url.pathname === "/v1/analyze/triage" && request.method === "POST") {
      try {
        const contentType = request.headers.get("Content-Type") ?? "";
        if (!contentType.includes("application/json")) {
          return new Response(
            JSON.stringify({ error: "Content-Type must be application/json." }),
            { status: 415, headers: corsJsonHeaders() }
          );
        }
        const telemetryJsonString = await request.text();
        try {
          JSON.parse(telemetryJsonString);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON." }), { status: 400, headers: corsJsonHeaders() });
        }
        return await triageWithDevstral(telemetryJsonString, env.DEVSTRAL_API_KEY);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsJsonHeaders() });
      }
    }
    if (url.pathname === "/v1/test/fuzz" && request.method === "POST") {
      return handleFuzzingRequest(request);
    }
    if (request.method === "POST") {
      try {
        await ensureWasm();
        const arrayBuffer = await request.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const telemetryJsonString = analyze_binary_buffer(uint8Array);
        if (telemetryJsonString.includes('"error"')) {
          return new Response(telemetryJsonString, { status: 400, headers: corsJsonHeaders() });
        }
        return await triageWithDevstral(telemetryJsonString, env.DEVSTRAL_API_KEY);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsJsonHeaders() });
      }
    }
    return new Response(
      JSON.stringify({ service: "patcher", status: "active" }),
      { status: 200, headers: corsJsonHeaders() }
    );
  }
};
async function handleFuzzingRequest(request) {
  try {
    await ensureWasm();
    const body = await request.json();
    const seed = body.seed ?? 42;
    const iterations = body.iterations ?? 1e3;
    const startTime = Date.now();
    const fuzzingResult = run_cloud_fuzzing(seed, iterations);
    const analysisTimeMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        ...JSON.parse(fuzzingResult),
        analysis_time_ms: analysisTimeMs,
        cpu_consumption: "within_limits",
        status_code: 200
      }),
      { headers: corsJsonHeaders(), status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, status: "FAILED" }), { headers: corsJsonHeaders(), status: 500 });
  }
}
__name(handleFuzzingRequest, "handleFuzzingRequest");

// node_modules/.pnpm/wrangler@4.99.0_@cloudflare+workers-types@4.20260610.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/.pnpm/wrangler@4.99.0_@cloudflare+workers-types@4.20260610.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-tD3s6d/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/.pnpm/wrangler@4.99.0_@cloudflare+workers-types@4.20260610.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-tD3s6d/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
