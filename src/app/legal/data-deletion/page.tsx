export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Deletion Instructions</h1>
            <p className="text-gray-600">How to delete your account and personal data from Oscar Worthy</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Account Deletion</h2>
            <p className="text-gray-700 mb-6">
              You can delete your Oscar Worthy account and all associated data at any time. This action is permanent and cannot be undone.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Gets Deleted</h2>
            <p className="text-gray-700 mb-4">
              When you delete your account, we will permanently remove:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Your profile information (username, full name, bio, avatar)</li>
              <li>All movie ratings and rankings</li>
              <li>All movie lists you've created</li>
              <li>All comments and reviews</li>
              <li>Account credentials and login information</li>
              <li>Usage analytics tied to your account</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What May Be Retained</h2>
            <p className="text-gray-700 mb-4">
              For legal and operational purposes, we may retain some information for a limited time:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Transaction records (if applicable)</li>
              <li>Legal compliance records</li>
              <li>Aggregated, anonymized analytics data</li>
              <li>Backup copies (automatically deleted within 30 days)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Delete Your Account</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Method 1: Through Your Account Settings</h3>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800 font-medium mb-2">Coming Soon:</p>
              <p className="text-blue-700">
                We're currently developing an in-app account deletion feature. This will be available in your account settings page.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Method 2: Email Request</h3>
            <p className="text-gray-700 mb-4">
              You can request account deletion by emailing us directly. Please include the following information:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700 font-medium mb-2">Send an email to:</p>
              <p className="text-gray-700">
                <a href="mailto:delete@oscarworthy.com" className="text-blue-600 hover:text-blue-700">delete@oscarworthy.com</a>
              </p>
              <p className="text-gray-700 mt-3 font-medium">Include in your email:</p>
              <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                <li>Your username</li>
                <li>The email address associated with your account</li>
                <li>Subject line: "Account Deletion Request"</li>
                <li>A brief confirmation that you want to delete your account</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">Method 3: Social Media Account Deletion</h3>
            <p className="text-gray-700 mb-4">
              If you signed up using Facebook, Google, or GitHub, you can also:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Remove Oscar Worthy from your connected apps in your social media settings</li>
              <li>Email us to confirm account deletion (recommended)</li>
              <li>This will prevent future access but may not delete all stored data</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Timeline for Deletion</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <ul className="space-y-2 text-gray-700">
                <li><strong>Immediate:</strong> Account access is disabled</li>
                <li><strong>Within 24 hours:</strong> Profile and public content are removed</li>
                <li><strong>Within 7 days:</strong> All personal data is deleted from active systems</li>
                <li><strong>Within 30 days:</strong> All backup copies are permanently deleted</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Before You Delete</h2>
            <p className="text-gray-700 mb-4">
              Before deleting your account, consider:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Downloading your data (contact us for a data export)</li>
              <li>Saving any important lists or ratings you've created</li>
              <li>This action cannot be reversed</li>
              <li>You'll need to create a new account if you want to use the service again</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Export Request</h2>
            <p className="text-gray-700 mb-6">
              If you'd like a copy of your data before deletion, email us at{' '}
              <a href="mailto:export@oscarworthy.com" className="text-blue-600 hover:text-blue-700">
                export@oscarworthy.com
              </a>{' '}
              with the subject line "Data Export Request". We'll provide your data in a portable format within 30 days.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions or Concerns</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about data deletion or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Email: <a href="mailto:privacy@oscarworthy.com" className="text-blue-600 hover:text-blue-700">privacy@oscarworthy.com</a>
              </p>
              <p className="text-gray-700 mt-2">
                Data Protection Officer: <a href="mailto:dpo@oscarworthy.com" className="text-blue-600 hover:text-blue-700">dpo@oscarworthy.com</a>
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/login"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
