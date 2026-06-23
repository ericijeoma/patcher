export function generateTraceId(): string {
  return 'trace-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
}

export function extractTraceIdFromError(error: unknown): string | null {
  if (error instanceof Error) {
    const match = error.message.match(/Trace ID: ([a-f0-9-]+)/i)
    if (match) {
      return match[1]
    }
  }
  return null
}
