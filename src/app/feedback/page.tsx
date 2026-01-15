import FeedbackForm from '@/components/feedback/FeedbackForm';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Feedback - ReAwarding',
  description: 'Share your feedback, report bugs, or suggest new features',
};

export default function FeedbackPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4">
          <MessageCircle className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-unbounded font-semibold text-yellow-400 mb-2">
          Send Us Feedback
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          We're in early beta and your feedback is invaluable. Report bugs, suggest features, 
          or share any thoughts about ReAwarding.
        </p>
      </div>

      {/* Feedback Form */}
      <div className="mb-8">
        <FeedbackForm />
      </div>

      {/* Additional Info */}
      <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-yellow-400 mb-3">
          What happens next?
        </h2>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            <span>
              Your feedback is saved and reviewed by our team regularly
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            <span>
              Bug reports are prioritized and investigated promptly
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            <span>
              Feature requests are considered for our roadmap
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            <span>
              We respect your privacy - only necessary information is collected
            </span>
          </li>
        </ul>
      </div>

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link 
          href="/help"
          className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm"
        >
          ← Back to Help
        </Link>
      </div>
    </div>
  );
}
