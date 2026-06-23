import { Link } from '@tanstack/react-router'
import { FileText, Shield, AlertTriangle, CheckCircle2, Clock, Scale } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
        <p className="text-gray-600 dark:text-gray-400">Last updated: June 22, 2026</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Introduction</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Welcome to Hexis! These Terms of Service ("Terms") govern your access to and use of our malware analysis platform.
          By accessing or using our services, you agree to be bound by these Terms and our Privacy Policy.
        </p>
      </div>

      <div className="space-y-6">
        {/* Acceptance of Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-500" />
            Acceptance of Terms
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            By accessing or using our platform, you agree to these Terms and all applicable laws and regulations.
            If you do not agree with these Terms, you may not use our services.
          </p>
        </div>

        {/* Use of Services */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Use of Services
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>You agree to use our services only for lawful purposes and in accordance with these Terms.</p>

            <h3 className="font-medium text-gray-900 dark:text-white mt-4 mb-2">Prohibited Activities:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Uploading or analyzing files that contain illegal or malicious content</li>
              <li>Using our services to violate any applicable laws or regulations</li>
              <li>Attempting to interfere with or disrupt our platform</li>
              <li>Using automated means to access our services without permission</li>
              <li>Sharing your account credentials with others</li>
              <li>Using our services for competitive analysis or benchmarking</li>
            </ul>
          </div>
        </div>

        {/* File Uploads and Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-500" />
            File Uploads and Analysis
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              By uploading files to our platform, you represent and warrant that:
            </p>

            <ul className="list-disc list-inside space-y-2">
              <li>You have the legal right to upload and analyze the files</li>
              <li>The files do not contain confidential or proprietary information of third parties</li>
              <li>The files do not violate any intellectual property rights</li>
              <li>The files are not illegal, malicious, or harmful</li>
            </ul>

            <p>
              We reserve the right to refuse analysis of any file at our discretion. Files that violate our policies
              may be reported to appropriate authorities.
            </p>
          </div>
        </div>

        {/* Data Retention and Deletion */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-500" />
            Data Retention and Deletion
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We retain analysis results and uploaded files according to our data retention policy described in our
              Privacy Policy. You can request deletion of your analysis history through the platform settings.
            </p>

            <p>
              Note that shared reports may remain accessible to recipients even after deletion from your account.
            </p>
          </div>
        </div>

        {/* API Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-indigo-500" />
            API Usage
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              If you use our API services, you agree to:
            </p>

            <ul className="list-disc list-inside space-y-2">
              <li>Comply with our API usage limits and rate limits</li>
              <li>Not use the API for automated bulk analysis without prior approval</li>
              <li>Keep your API keys confidential and secure</li>
              <li>Not attempt to reverse engineer or bypass our API protections</li>
            </ul>

            <p>
              We reserve the right to suspend or terminate API access for violations of these Terms.
            </p>
          </div>
        </div>

        {/* Intellectual Property */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Intellectual Property
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              All content, features, and functionality of our platform, including but not limited to text, graphics,
              logos, and software, are the exclusive property of Hexis and are protected by copyright, trademark,
              and other intellectual property laws.
            </p>

            <p>
              You may not reproduce, distribute, modify, or create derivative works of our platform without our
              express written consent.
            </p>
          </div>
        </div>

        {/* Disclaimers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-indigo-500" />
            Disclaimers
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Our services are provided "as is" and "as available" without warranties of any kind, either express or implied.
              We do not warrant that our platform will be error-free, secure, or uninterrupted.
            </p>

            <p>
              The analysis results provided by our platform are for informational purposes only and should not be
              considered as professional advice. You are solely responsible for interpreting and acting on the analysis results.
            </p>
          </div>
        </div>

        {/* Limitation of Liability */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Limitation of Liability
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            To the fullest extent permitted by law, Hexis shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including without limitation, loss of profits, data, or use,
            arising out of or in connection with the use of our platform.
          </p>
        </div>

        {/* Termination */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-indigo-500" />
            Termination
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We may suspend or terminate your access to our platform at any time, with or without cause, and with
              or without notice. Upon termination, your right to use our services will immediately cease.
            </p>

            <p>
              You may terminate your account at any time by contacting us or using the account deletion features
              in our platform.
            </p>
          </div>
        </div>

        {/* Governing Law */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Scale className="h-5 w-5 mr-2 text-indigo-500" />
            Governing Law
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where
            Hexis is incorporated, without regard to its conflict of law principles.
          </p>
        </div>

        {/* Changes to Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-500" />
            Changes to Terms
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any material
            changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use
            of our platform after any such changes constitutes your acceptance of the new Terms.
          </p>
        </div>

        {/* Contact Us */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Contact Us
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have any questions about these Terms, please contact us at:
          </p>

          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>Hexis Security</p>
            <p>Email: legal@hexis.io</p>
            <p>Support: support@hexis.io</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Hexis Security. All rights reserved.</p>
        <p className="mt-2">
          By using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          For more information about how we handle your data, please see our <Link to="/privacy" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
