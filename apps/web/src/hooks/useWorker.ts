import { useState, useEffect, useRef, useCallback } from 'react'
import ScannerWorker from '../workers/scanner.worker.ts?worker'

type ProgressState = { status: string; progress: number }

type WorkerMessage =
  | { type: 'READY' }
  | { type: 'ERROR'; message: string }
  | { type: 'PROGRESS'; status: string; progress: number }
  | { type: 'RESULT'; telemetry: any }

export function useWorker() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState | null>(null)

  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new ScannerWorker()
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data
      console.log('[MAIN THREAD]', e.data)

      if (msg.type === 'READY') {
        setIsReady(true)
        setError(null)
        return
      }

      if (msg.type === 'ERROR') {
        setError(msg.message)
        setIsReady(false)
        return
      }

      if (msg.type === 'PROGRESS') {
        setProgress({ status: msg.status, progress: msg.progress })
        return
      }
    }

    worker.onerror = (e) => {
      setError(e.message || 'Worker failed to start')
      setIsReady(false)
    }

    worker.postMessage({ type: 'INIT' })

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const analyzeFile = useCallback(
    (file: File, traceId: string) => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current

        if (!worker) {
          reject(new Error('Engine is not initialized yet.'))
          return
        }

        ;(async () => {
          try {
            setProgress({ status: 'Reading local file...', progress: 10 })

            const fileBuffer = await file.arrayBuffer()
            const apiKey = import.meta.env.VITE_HEXIS_API_KEY || 'fallback_key'

            setProgress({ status: 'Executing static analysis...', progress: 40 })

            const messageHandler = (e: MessageEvent<WorkerMessage>) => {
              const msg = e.data

              if (msg.type === 'RESULT') {
                worker.removeEventListener('message', messageHandler)
                setProgress({ status: 'Complete', progress: 100 })
                resolve(msg.telemetry)
                return
              }

              if (msg.type === 'ERROR') {
                worker.removeEventListener('message', messageHandler)
                setProgress(null)
                reject(new Error(msg.message))
              }
            }

            worker.addEventListener('message', messageHandler)

            worker.postMessage(
              {
                type: 'SCAN',
                payload: {
                  fileBuffer,
                  fileName: file.name,
                  traceId,
                  apiKey,
                },
              },
              [fileBuffer]
            )
          } catch (err) {
            setProgress(null)
            reject(err instanceof Error ? err : new Error('Unknown error reading file'))
          }
        })()
      })
    },
    [isReady]
  )

  const resetWorker = useCallback(() => {
    setError(null)
    setProgress(null)
  }, [])

  return {
    isReady,
    error,
    progress,
    analyzeFile,
    resetWorker,
  }
}
