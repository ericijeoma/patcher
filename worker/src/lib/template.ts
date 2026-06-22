import { TriageReport } from './triage';
// 1. Import the raw CSS text compilation (adjust the relative path to your output.css if necessary)
import tailwindStyles from '../output.css'; 

export function renderReportPage(report: TriageReport, filename: string, shareId: string): string {
  const badgeColors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-400 text-black',
    low: 'bg-blue-400 text-white',
    safe: 'bg-green-500 text-white',
  };

  const badgeClass = badgeColors[report.risk_level] || 'bg-gray-500 text-white';

  const patchesHtml = report.remediation_patches.map(patch => `
    <div class="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      <div class="flex justify-between items-center mb-2">
        <span class="font-mono text-sm text-blue-600 font-bold">${patch.location}</span>
        <button onclick="navigator.clipboard.writeText('${patch.patch.replace(/'/g, "\\'")}')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">Copy Fix</button>
      </div>
      <p class="text-sm text-gray-700 mb-2"><strong>Issue:</strong> ${patch.issue}</p>
      <pre class="bg-gray-900 text-green-400 p-3 rounded-md text-sm overflow-x-auto"><code>${patch.patch}</code></pre>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hexis Scan: ${filename}</title>
      
      <meta property="og:title" content="Hexis Analysis: ${filename}">
      <meta property="og:description" content="Risk Level: ${report.risk_level.toUpperCase()} - ${report.root_cause_mechanism}">
      <meta property="og:type" content="article">
      
      <style>
        ${tailwindStyles}
      </style>
    </head>
    <body class="bg-gray-100 text-gray-900 font-sans p-6 md:p-12">
      <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        
        <div class="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 class="text-2xl font-bold mb-1">${filename}</h1>
            <p class="text-gray-500 text-sm font-mono">ID: ${shareId}</p>
          </div>
          <span class="px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${badgeClass}">
            ${report.risk_level}
          </span>
        </div>

        <section class="mb-8">
          <h2 class="text-xl font-semibold mb-2">Impact Summary</h2>
          <p class="text-gray-700 leading-relaxed">${report.explanation}</p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold mb-2">Root Cause</h2>
          <p class="text-gray-700 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
            ${report.root_cause_mechanism}
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Actionable Fixes</h2>
          ${patchesHtml}
        </section>

        <div class="mt-12 pt-6 border-t border-gray-200 text-center">
           <p class="text-sm text-gray-500 mb-4">Want to scan your own binaries securely?</p>
           <a href="https://hexis.com" class="inline-block bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors">
             Get Hexis
           </a>
        </div>

      </div>
    </body>
    </html>
  `;
}
