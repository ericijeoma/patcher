interface ScanResult {
    scanId: string;
    filename: string;
    status: 'critical' | 'high' | 'medium' | 'low';
    finding: {
        rootCause: string;
        compliance: {
            cwe: string;
            nist: string;
            owasp: string;
        };
    };
    mitigation: {
        immediate: string[];
        codeLevel: string[];
        longTerm: string[];
    };
    reportUrl: string;
    usage: {
        tokens: number;
    };
    scanTime: number;
}
declare class Hexis {
    private apiKey;
    private baseUrl;
    private wasmCache;
    constructor(options: {
        apiKey: string;
        baseUrl?: string;
    });
    private ensureWasmCache;
    scan(filePath: string, options?: {
        name?: string;
    }): Promise<ScanResult>;
}

export { Hexis, type ScanResult };
