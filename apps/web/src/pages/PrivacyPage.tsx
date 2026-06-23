import { Link } from "@tanstack/react-router";
import { Shield, Lock, Eye, Database, Clock, AlertCircle } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Last updated: June 22, 2026
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Introduction
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Hexis ("we", "our", "us") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our malware analysis platform.
        </p>
      </div>

      <div className="space-y-6">
        {/* Information We Collect */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-indigo-500" />
            Information We Collect
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Personal Information
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                When you create an account, we may collect personal information
                such as your name, email address, and other contact information.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                File Uploads
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                When you upload files for analysis, we temporarily store and
                process these files to generate analysis reports. Files are
                retained according to our data retention policy.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Usage Data
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                We collect information about how you interact with our platform,
                including IP addresses, browser type, operating system, and
                usage patterns.
              </p>
            </div>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-indigo-500" />
            How We Use Your Information
          </h2>

          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>To provide and maintain our malware analysis services</li>
            <li>To improve our platform and develop new features</li>
            <li>To communicate with you about your account and our services</li>
            <li>To monitor and analyze usage trends and performance</li>
            <li>To detect, prevent, and address technical issues</li>
            <li>To comply with legal obligations</li>
          </ul>
        </div>

        {/* Data Security */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Data Security
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We implement appropriate technical and organizational measures to
            protect your personal information from unauthorized access, use, or
            disclosure. These include:
          </p>

          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure file handling and disposal procedures</li>
            <li>Compliance with industry security standards</li>
          </ul>
        </div>

        {/* File Analysis and Retention */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-500" />
            File Analysis and Retention
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Files uploaded for analysis are processed in our secure
              environment. We retain analysis results according to the following
              policy:
            </p>

            <ul className="list-disc list-inside space-y-2">
              <li>
                Analysis reports are retained for 30 days from the date of
                analysis
              </li>
              <li>
                Original uploaded files are retained for 7 days from the date of
                upload
              </li>
              <li>
                You can request deletion of your analysis history at any time
              </li>
              <li>
                Shared reports remain accessible until their expiration date
              </li>
            </ul>

            <p>
              All files and analysis data are permanently deleted from our
              systems after the retention period expires.
            </p>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-indigo-500" />
            Data Sharing and Disclosure
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              We do not sell or rent your personal information to third parties.
              We may share your information in the following limited
              circumstances:
            </p>

            <ul className="list-disc list-inside space-y-2">
              <li>
                With service providers who assist us in operating our platform
              </li>
              <li>When required by law or to respond to legal process</li>
              <li>
                To protect our rights, property, or safety, or that of our users
              </li>
              <li>With your explicit consent</li>
            </ul>

            <p>
              When you share analysis reports using our platform, the shared
              content becomes accessible to anyone with the share link. Exercise
              caution when sharing sensitive information.
            </p>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Your Rights and Choices
          </h2>

          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              You have the following rights regarding your personal information:
            </p>

            <ul className="list-disc list-inside space-y-2">
              <li>Access and review your personal information</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Delete your analysis history through the settings page</li>
            </ul>

            <p>
              To exercise these rights, please contact us at privacy@hexis.io or
              use the account management features in our platform.
            </p>
          </div>
        </div>

        {/* Children's Privacy */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-indigo-500" />
            Children's Privacy
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            Our platform is not intended for use by children under the age of
            13. We do not knowingly collect personal information from children
            under 13. If we become aware that we have collected personal
            information from a child under 13, we will take steps to delete such
            information.
          </p>
        </div>

        {/* International Data Transfers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-indigo-500" />
            International Data Transfers
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            Your information may be transferred to and processed in countries
            other than your own. These countries may have data protection laws
            that are different from those in your country. We take appropriate
            measures to ensure that your information remains protected in
            accordance with this Privacy Policy.
          </p>
        </div>

        {/* Changes to This Policy */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-indigo-500" />
            Changes to This Privacy Policy
          </h2>

          <p className="text-gray-700 dark:text-gray-300">
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new Privacy Policy on
            this page and updating the "Last updated" date at the top. We
            encourage you to review this Privacy Policy periodically.
          </p>
        </div>

        {/* Contact Us */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Contact Us
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have any questions about this Privacy Policy or our privacy
            practices, please contact us at:
          </p>

          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>Hexis Security</p>
            <p>Email: privacy@hexis.io</p>
            <p>Support: support@hexis.io</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Hexis Security. All rights reserved.</p>
        <p className="mt-2">
          By using our platform, you acknowledge that you have read and
          understood this Privacy Policy. For more information about our terms
          of service, please see our{" "}
          <Link
            to="/terms"
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
