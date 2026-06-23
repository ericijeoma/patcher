import * as Sentry from "@sentry/react"; // Use @sentry/browser if not on React SDK
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  Activity,
  ShieldCheck,
  ExternalLink,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { TelemetrySanitizer } from "../utils/sanitizer";

// wasm-pack generated JS wrapper
import init, { analyze_binary_buffer } from "../pkg-web/patcher.js";

// Resolve the wasm binary as a Vite asset URL
import wasmUrl from "../pkg-web/patcher_bg.wasm?url";

export const Route = createFileRoute("/scan")({
  component: ScanDashboard,
});

const BASE_URL = "https://patcher.ericijeoma7767.workers.dev";
const TRIAGE_ROUTE = `${BASE_URL}/v1/analyze/triage`;
const DIAGNOSTICS_ROUTE = `${BASE_URL}/v1/diagnostics/engine-error`;

type EngineState = "loading" | "idle" | "analyzing" | "complete" | "error";

function withPanicCapture<T>(fn: () => T): {
  result?: T;
  panicMessage?: string;
} {
  let captured: string | undefined;
  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    captured = args.map(String).join(" ");
    originalError(...args);
  };

  try {
    return { result: fn() };
  } catch (err: any) {
    return { panicMessage: captured ?? err.message ?? "Unknown WASM panic" };
  } finally {
    console.error = originalError;
  }
}

function ScanDashboard() {
  const [engineState, setEngineState] = useState<EngineState>("loading");
  const [engineError, setEngineError] = useState<string | null>(null);
  const [activePayload, setActivePayload] = useState<File[]>([]);
  const [scanResults, setScanResults] = useState<any[]>([]);

  // 1. Initialize WASM once on mount
  useEffect(() => {
    const bootstrapEngine = async () => {
      try {
        console.log("[ENGINE] Initializing WASM...");
        await init({ module_or_path: wasmUrl });
        console.log("[ENGINE] WASM Ready.");
        setEngineState("idle");
      } catch (e: any) {
        console.error("[ENGINE] Failed to init:", e);
        setEngineError(e.message || "Failed to initialize WASM");
        setEngineState("error");
      }
    };
    bootstrapEngine();
  }, []);

  const handleIngestionComplete = async (files: File[]) => {
    setActivePayload(files);
    setEngineState("analyzing");
    await executeRealAnalysisEngine(files);
  };

  const executeRealAnalysisEngine = async (files: File[]) => {
    const resultsArray: any[] = [];

    for (const file of files) {
      const traceId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `local-${Math.random().toString(36).substring(2, 11)}`;
      const apiKey = import.meta.env.VITE_HEXIS_API_KEY;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const fileHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const { result: rawTelemetryString, panicMessage } = withPanicCapture(
          () => analyze_binary_buffer(uint8Array),
        );

        if (panicMessage) {
          // 1. Send to your internal diagnostics endpoint
          await fetch(DIAGNOSTICS_ROUTE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Hexis-Trace-Id": traceId,
            },
            body: JSON.stringify({
              stage: "wasm_analysis_browser",
              panic_message: panicMessage,
              engine_version: "v1.0.0",
              os: navigator.userAgent,
            }),
          });

          // 2. OPTIMAL FOR SENTRY: Capture engine panic with context tags
          Sentry.captureMessage("WASM Engine Panic", {
            level: "fatal",
            tags: { traceId, fileHash },
            extra: { panicMessage, fileName: file.name },
          });

          throw new Error("Engine Panicked during extraction.");
        }

        const rawTelemetryJson = JSON.parse(rawTelemetryString as string);
        if (rawTelemetryJson.error) throw new Error(rawTelemetryJson.error);

        rawTelemetryJson.file_hash_sha256 = fileHash;
        const safeTelemetry = TelemetrySanitizer.sanitize(rawTelemetryJson);

        const response = await fetch(TRIAGE_ROUTE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Filename": file.name,
            "X-Hexis-Trace-Id": traceId,
          },
          body: JSON.stringify(safeTelemetry),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Worker rejected request: ${response.status} - ${errorText}`,
          );
        }

        const triageResult = await response.json();
        console.log("☁️ CLOUDFLARE PAYLOAD:", triageResult);
        resultsArray.push({ file, status: "success", data: triageResult });
      } catch (error: any) {
        // 3. OPTIMAL FOR SENTRY: Map runtime/API rejections to Sentry tagged with the Trace ID
        Sentry.captureException(error, {
          tags: {
            traceId: traceId,
            errorStage: "execution_pipeline",
          },
          extra: {
            fileName: file.name,
            fileSize: file.size,
          },
        });

        resultsArray.push({
          file,
          status: "error",
          errorMessage: error.message,
        });
      }
    }

    setScanResults(resultsArray);
    setEngineState("complete");
  };

  const resetEngine = () => {
    setEngineState("idle");
    setActivePayload([]);
    setScanResults([]);
  };

  // --- UI Render States ---

  if (engineState === "loading") {
    return (
      <div className="p-10 text-center text-gray-500">
        Initializing Analysis Engine...
      </div>
    );
  }

  if (engineState === "error") {
    return (
      <div className="p-10 text-center text-red-600 max-w-lg mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold">Engine Error</h2>
        <p className="mt-2">{engineError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Static Engine Interpreter
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Upload binary footprints for deep static analysis.
        </p>
      </div>

      {engineState === "idle" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Dropzone onFilesAccepted={handleIngestionComplete} maxFiles={5} />
        </div>
      )}

      {engineState === "analyzing" && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/20 animate-pulse"></div>
            <Activity className="h-16 w-16 text-indigo-500 animate-bounce relative z-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Executing WASM Interpreter
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
              Extracting local execution footprints for {activePayload.length}{" "}
              binary module(s). Processing telemetry...
            </p>
          </div>
        </div>
      )}

      {engineState === "complete" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
              <div>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                  Devstral Triage Report
                </h4>
                <p className="text-sm text-gray-500">
                  Pipeline execution complete.
                </p>
              </div>
              <button
                onClick={resetEngine}
                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Scan New Payload
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {scanResults.map((result, idx) => {
                // 1. SURGICAL FIX: Correctly map the nested Cloudflare Triage Payload
                const payload = result.data?.result || {};
                const triage = payload.triage || {};

                const rawScore = payload.riskScore || 0;
                // Prefer the AI's risk level, fallback to the static WASM verdict
                const riskLevel = (
                  triage.risk_level ||
                  payload.verdict ||
                  "unknown"
                ).toLowerCase();
                const shareUrl = triage.shareUrl || triage.share_url;

                // 2. SURGICAL FIX: Force 'unknown' to be Yellow per your instructions
                const getScoreColor = (level: string) => {
                  if (
                    level === "critical" ||
                    level === "malicious" ||
                    level === "high"
                  )
                    return "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200";
                  if (
                    level === "medium" ||
                    level === "suspicious" ||
                    level === "unknown"
                  )
                    return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200";
                  return "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200";
                };

                const renderIcon = () => {
                  if (result.status !== "success")
                    return (
                      <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                    );
                  if (
                    riskLevel === "critical" ||
                    riskLevel === "malicious" ||
                    riskLevel === "high"
                  )
                    return (
                      <XCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                    );
                  if (
                    riskLevel === "medium" ||
                    riskLevel === "suspicious" ||
                    riskLevel === "unknown"
                  )
                    return (
                      <AlertTriangle className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                    );
                  return (
                    <ShieldCheck className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                  );
                };

                return (
                  <div
                    key={idx}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors space-y-4 sm:space-y-0"
                  >
                    <div className="flex items-start space-x-4 w-full justify-between">
                      <div className="flex items-start space-x-4 w-full">
                        {renderIcon()}

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-md font-bold text-gray-900 dark:text-white">
                              {result.file.name}
                            </p>
                            <span className="text-xs text-gray-500 font-mono">
                              ({(result.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>

                          {result.status === "success" ? (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-3">
                              <p>
                                Threat Vector Triage:{" "}
                                <span className="font-semibold text-gray-900 dark:text-white capitalize">
                                  {riskLevel}
                                </span>
                              </p>

                              {/* NEW: Display the AI's root cause explanation directly in the UI */}
                              {triage.explanation && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                                  <p className="text-sm italic text-gray-700 dark:text-gray-300">
                                    "{triage.explanation}"
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-400">
                                  Threat Metrics:
                                </span>
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(riskLevel)}`}
                                >
                                  {rawScore}/100
                                </span>
                              </div>

                              {/* Render the raw uninitialized memory detections */}
                              {payload.detectionNames &&
                                payload.detectionNames.length > 0 && (
                                  <div className="pt-2">
                                    <p className="text-xs text-gray-500 mb-1">
                                      Raw Detections:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {payload.detectionNames.map(
                                        (det: string, i: number) => (
                                          <span
                                            key={i}
                                            className="text-[10px] bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 text-red-700 dark:text-red-400 px-2 py-1 rounded"
                                          >
                                            {det}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Re-attach the Share URL */}
                              {shareUrl && (
                                <div className="pt-3">
                                  <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium group text-sm bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-md transition-colors"
                                  >
                                    View Full Devstral Report
                                    <ExternalLink className="ml-1.5 h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-red-600 mt-1">
                              {result.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
