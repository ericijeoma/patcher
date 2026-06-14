import { useState, useCallback, useRef } from 'react';
import { useSession } from '../lib/auth';

type ScanState =
  | 'idle'
  | 'loading-engine'
  | 'engine-ready'
  | 'scanning'
  | 'triaging'
  | 'complete'
  | 'error';

interface ScanResult {
  scanId: string;
  filename: string;
  status: 'critical' | 'high' | 'medium' | 'low';
  finding: {
    rootCause: string;
    compliance: { cwe: string; nist: string; owasp: string; };
  };
  mitigation: { immediate: string[]; codeLevel: string[]; longTerm: string[]; };
  reportUrl: string;
  usage: { tokens: number; };
  scanTime: number;
}

export function useScanner() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const { data: session } = useSession();

  // 1. Create a ref to store the Promise resolver
  const engineReadyResolver = useRef<(() => void) | null>(null);

  const triageWithAI = async (telemetry: string) => {
    try {
      if (!session?.session?.token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_WORKER_URL}/v1/analyze/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.token}`,
          'X-Filename': 'browser-upload',
        },
        body: telemetry,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Triage failed');
      }

      const resultData = await response.json();
      setResult(resultData);
      setState('complete');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const initializeWorker = useCallback(() => {
    if (worker) return worker; // Already initialized

    const scannerWorker = new Worker(new URL('../workers/scanner.worker.ts', import.meta.url), {
      type: 'module'
    });

    scannerWorker.onmessage = (e) => {
      const { type, message, telemetry } = e.data;

      if (type === 'READY') {
        setState('engine-ready');
        setProgress(100);
        
        // 2. If a scan is waiting for the engine, resolve its Promise!
        if (engineReadyResolver.current) {
          engineReadyResolver.current();
          engineReadyResolver.current = null;
        }
      } else if (type === 'RESULT') {
        setState('triaging');
        triageWithAI(telemetry);
      } else if (type === 'ERROR') {
        setState('error');
        setError(message);
        
        // Failsafe: if initialization crashes, release the lock
        if (engineReadyResolver.current) {
          engineReadyResolver.current();
          engineReadyResolver.current = null;
        }
      }
    };

    setWorker(scannerWorker);
    
    // 3. Return the instance synchronously so scan() can use it immediately
    return scannerWorker; 
  }, [worker, session]); // Note: added session to deps so triageWithAI gets the latest token

  const scan = useCallback(async (file: File) => {
    if (!file) {
      setError('No file selected');
      return;
    }

    setState('loading-engine');
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const fileBuffer = await file.arrayBuffer();
      const workerUrl = import.meta.env.VITE_WORKER_URL;
      const bindingsUrl = `${workerUrl}/v1/engine.js`;

      // 4. Get the worker instance immediately (creates it if it doesn't exist)
      const activeWorker = worker || initializeWorker();

      // 5. Create the Promise and await it without checking React state
      if (state !== 'engine-ready') {
        const waitForReady = new Promise<void>((resolve) => {
          engineReadyResolver.current = resolve;
        });

        activeWorker.postMessage({
          type: 'INIT',
          payload: { workerUrl, bindingsUrl }
        });

        await waitForReady; // Execution halts here until 'READY' is received
      }

      setState('scanning');

      // 6. Safe to send the file
      activeWorker.postMessage(
        { type: 'SCAN', payload: { fileBuffer } },
        [fileBuffer] 
      );

    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [worker, state, initializeWorker]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  return {
    state,
    scan,
    result,
    error,
    progress,
    reset,
  };
}
