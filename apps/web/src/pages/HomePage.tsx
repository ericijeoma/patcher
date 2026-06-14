import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, FileText, Terminal } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Hexis — Binary Risk Intelligence</title>
        <meta name="description" content="Static binary analysis powered by WASM. Runs 100% locally. Scan .exe files for vulnerabilities before deployment. Privacy by architecture." />
        <meta property="og:title" content="Hexis — Binary Risk Intelligence" />
        <meta property="og:description" content="Your binary never touches our servers. Ever." />
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

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Know what's inside your binaries before they ship
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            WASM-powered static analysis runs entirely in your browser or CLI.
            Your binary never touches our servers. Ever.
          </p>
          <div className="flex gap-4 justify-center mb-6">
            <Link to="/scan" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Scan your first binary free
            </Link>
            <Link to="/docs" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors">
              View API docs
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            10 free scans daily · No credit card · Binary stays local
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Privacy by architecture</h3>
            <p className="text-gray-600">
              Your binary executes only on your machine.
              Hexis receives 1KB of telemetry. Nothing else.
              This is not a policy. It is the architecture.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Plain English verdicts</h3>
            <p className="text-gray-600">
              Critical, High, Medium, or Low — with an explanation
              any CTO can read and act on in 60 seconds.
              Not assembly output. A verdict.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Terminal className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Built for CI/CD</h3>
            <p className="text-gray-600">
              One line in your GitHub Actions YAML.
              Exit code 2 on critical findings.
              Fails your build before a vulnerable binary ships.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Drop a file or point the CLI at a path</h3>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">WASM engine runs analysis locally — zero upload</h3>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">AI triage returns a risk report: HTML, PDF, or JSON</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Pricing</h2>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Monthly</span>
              <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
              </div>
              <span className="text-gray-500">Annual</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Save 20%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>10 scans per day</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Web UI + CLI</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>HTML risk report</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Shareable report URL</li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                Get started
              </button>
            </div>

            {/* Developer Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-blue-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                Most popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Developer</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Unlimited local scans</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>API access with SDK</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Scan history (90 days)</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Shareable URL + JSON API</li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                Upgrade now
              </button>
            </div>

            {/* Team Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold mb-2">Team</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Everything in Developer</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>5 seats</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>CI/CD badge + webhooks</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>PDF export</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Priority support</li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                Get started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Everything in Team</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Unlimited seats</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Compliance mapping (CWE, NIST, OWASP)</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>Immutable audit log</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>SSO</li>
                <li className="flex items-center"><span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>SLA</li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                Contact sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/scan" className="hover:text-white">Scan</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/docs" className="hover:text-white">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">GitHub</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Changelog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">GDPR</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2026 Hexis. Your binary stays local. Always.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
