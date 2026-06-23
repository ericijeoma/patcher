import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import Dropzone from "../components/Dropzone";
import { useWorker } from "../hooks/useWorker";
import { generateTraceId } from "../utils/trace";

// ADD THIS RIGHT BEFORE YOUR MAIN COMPONENT
const getSmartRiskAssessment = (payload: any) => {
  const triage = payload?.triage || {};
  const rawTelemetry = payload?.rawTelemetry || {};

  const rawScore = payload?.riskScore || 0;
  const verdict = (
    triage.risk_level ||
    payload?.verdict ||
    "unknown"
  ).toLowerCase();
  const vulnerabilities = rawTelemetry.vulnerabilities_found || 0;

  // 1. CRITICAL/HIGH: AI says critical, or malicious verdict
  if (["critical", "high", "malicious"].includes(verdict)) {
    return {
      badgeText: verdict,
      badgeStyles:
        "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
      barStyles: "bg-red-500",
      displayScore: rawScore > 0 ? rawScore : 90, // Force visual score if engine returned 0
    };
  }

  // 2. SUSPICIOUS: Score is 0 or unknown, BUT vulnerabilities were found
  if (
    vulnerabilities > 0 ||
    ["suspicious", "medium", "unknown"].includes(verdict)
  ) {
    return {
      badgeText: vulnerabilities > 0 ? "suspicious" : verdict,
      badgeStyles:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
      barStyles: "bg-amber-500",
      displayScore: rawScore > 0 ? rawScore : 50, // Force medium score visually
    };
  }

  // 3. CLEAN: 0 Score and 0 Vulnerabilities
  return {
    badgeText: "clean",
    badgeStyles:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    barStyles: "bg-emerald-500",
    displayScore: rawScore,
  };
};

export default function HomePage() {
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);

  const {
    isReady: workerReady,
    error: workerError,
    progress,
    analyzeFile,
    resetWorker,
  } = useWorker();

  const handleFilesAccepted = useCallback(
    (acceptedFiles: File[]) => {
      console.log("[HOME] Files received", acceptedFiles);
      console.log("[HOME] Worker ready:", workerReady);

      const traceId = generateTraceId();
      setCurrentTraceId(traceId);

      analyzeFilesSequentially(acceptedFiles, traceId);
    },
    [analyzeFile, workerReady],
  );

  const analyzeFilesSequentially = async (
    filesToAnalyze: File[],
    traceId: string,
  ) => {
    const results = [];
    for (const file of filesToAnalyze) {
      try {
        const result = await analyzeFile(file, traceId);
        results.push({ fileName: file.name, result, status: "success" });
      } catch (err) {
        results.push({
          fileName: file.name,
          error: err instanceof Error ? err.message : "Analysis failed",
          status: "error",
        });
      }
    }
    setAnalysisResults(results);
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return "bg-red-500";
    if (riskScore >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getVerdictText = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case "malicious":
        return "Malicious";
      case "suspicious":
        return "Suspicious";
      case "clean":
        return "Clean";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Helmet>
        <title>Hexis — Binary Risk Intelligence</title>
        <meta
          name="description"
          content="Static binary analysis powered by WASM. Runs 100% locally. Scan .exe files for vulnerabilities before deployment. Privacy by architecture."
        />
        <meta property="og:title" content="Hexis — Binary Risk Intelligence" />
        <meta
          property="og:description"
          content="Your binary never touches our servers. Ever."
        />
        <meta property="og:image" content="https://hexis.dev/og.png" />
        <link rel="canonical" href="https://hexis.dev" />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Hexis",
              "applicationCategory": "SecurityApplication",
              "offers": [
                { "@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free" },
                { "@type": "Offer", "price": "19", "priceCurrency": "USD", "name": "Developer" }
              ]
            }
          `}
        </script>
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            Zero-Trust{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              Binary Analysis
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Upload and analyze binaries directly in your browser. Powered by
            WebAssembly, our engine ensures your files never leave your machine.
            Privacy by architecture.
          </p>

          <div className="max-w-2xl mx-auto">
            <Dropzone
              onFilesAccepted={handleFilesAccepted}
              disabled={!workerReady}
            />

            {/* Compliance Notice - Placed below the Dropzone */}
            <div className="mt-4 flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Operational Compliance:
                </span>{" "}
                Uploading live zero-day variants may trigger automated telemetry
                filters. Ensure you possess appropriate containment clearance
                for all target modules before processing.
              </div>
            </div>

            {!workerReady && !workerError && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md flex items-center justify-center">
                <Clock className="w-5 h-5 mr-2 animate-pulse" />
                Initializing analysis engine...
              </div>
            )}

            {workerError && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md flex items-center justify-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Failed to initialize analysis engine: {workerError}
              </div>
            )}
          </div>
        </div>

        {(analysisResults.length > 0 ||
          (progress && progress.progress < 100)) && (
          <div className="max-w-4xl mx-auto mb-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-indigo-500" />
              Analysis Session
            </h2>

            {progress && progress.progress < 100 && (
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-400">
                  <span>{progress.status}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {analysisResults.length > 0 && (
              <div className="space-y-4">
                {analysisResults.map((result, idx) => {
                  // SURGICAL FIX: Extract the nested Cloudflare payload correctly
                  const payload = result.result?.result || {};
                  const triage = payload.triage || {};

                  const rawScore = payload.riskScore ?? 0;
                  const verdict = (
                    triage.risk_level ||
                    payload.verdict ||
                    "unknown"
                  ).toLowerCase();
                  const shareUrl = triage.shareUrl || triage.share_url;
                  const explanation = triage.explanation;
                  const detections = payload.detectionNames || [];

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-500 mr-3" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {result.fileName}
                          </span>
                        </div>

                        {result.error ? (
                          <span className="text-sm text-red-500 dark:text-red-400">
                            Error: {result.error}
                          </span>
                        ) : (
                          (() => {
                            // SURGICAL FIX: Extract payload and run the smart assessment
                            const payload =
                              result.result?.result ||
                              result.data?.result ||
                              {};
                            const assessment = getSmartRiskAssessment(payload);

                            return (
                              <div className="flex items-center space-x-3">
                                {/* The Verdict Badge */}
                                <span
                                  className={`text-sm font-bold px-2 py-1 rounded uppercase tracking-wider ${assessment.badgeStyles}`}
                                >
                                  {assessment.badgeText}
                                </span>

                                {/* The Risk Score */}
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                                    Risk:
                                  </span>
                                  <div
                                    className={`w-16 h-2 rounded-full ${assessment.barStyles}`}
                                  ></div>
                                  <span className="text-sm font-medium ml-2 text-gray-900 dark:text-white">
                                    {assessment.displayScore}/100
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {!result.error && (
                        <div className="space-y-3 mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                          {/* AI Explanation */}
                          {result.result?.result?.triage?.explanation && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-sm italic text-gray-700 dark:text-gray-300">
                                "{result.result.result.triage.explanation}"
                              </p>
                            </div>
                          )}

                          {/* Raw WASM Detections */}
                          {result.result?.result?.detectionNames?.length > 0 ? (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Detected threats:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {result.result.result.detectionNames.map(
                                  (detection: string, detIndex: number) => (
                                    <span
                                      key={detIndex}
                                      className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded"
                                    >
                                      {detection}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : null}

                          {/* Devstral Interactive Report Link */}
                          {result.result?.result?.triage?.shareUrl && (
                            <div className="pt-2">
                              <a
                                href={result.result.result.triage.shareUrl}
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              100% Local
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No cloud uploads. Your proprietary binaries remain entirely on
              your local machine, analyzed in-memory.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <CheckCircle2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              WASM Powered
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Heavy lifting is processed via high-performance WebAssembly inside
              isolated Web Workers, keeping your UI fast.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <AlertTriangle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Safe Sandboxing
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Suspicious files are parsed in strict, isolated memory boundaries
              to protect your system from escape vulnerabilities.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-indigo-500 mr-2" />
                <span className="text-xl font-bold">Hexis</span>
              </div>
              <p className="text-gray-400 text-sm">
                Advanced binary risk intelligence, executed locally.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/hexis"
                    className="hover:text-white transition-colors"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <span className="cursor-not-allowed opacity-50">Blog</span>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-50">
                    Changelog
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <span className="cursor-not-allowed opacity-50">GDPR</span>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-50">
                    Security
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>© 2026 Hexis. Your binary stays local. Always.</p>
            <p className="mt-2 md:mt-0 text-xs text-gray-500">
              v1.2.0 • Engine Ready
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
