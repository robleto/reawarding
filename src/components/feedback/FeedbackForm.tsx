'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { useUser } from '@supabase/auth-helpers-react';
import { MessageSquare, Lightbulb, Bug, CheckCircle, AlertCircle } from 'lucide-react';

type FeedbackType = 'bug' | 'idea' | 'other';

interface FeedbackFormProps {
  defaultType?: FeedbackType;
  onSubmitSuccess?: () => void;
}

export default function FeedbackForm({ defaultType = 'bug', onSubmitSuccess }: FeedbackFormProps) {
  const user = useUser();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please fill in all fields');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Gather metadata
      const metadata = {
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
                 navigator.userAgent.includes('Firefox') ? 'Firefox' :
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        userAgent: navigator.userAgent,
      };

      // Submit feedback
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          feedback_type: feedbackType,
          title: title.trim(),
          description: description.trim(),
          url: window.location.href,
          metadata,
        });

      if (error) throw error;

      setSubmitStatus('success');
      setTitle('');
      setDescription('');
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        setTimeout(onSubmitSuccess, 1500);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setErrorMessage('Failed to submit feedback. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            What type of feedback do you have?
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFeedbackType('bug')}
              className={`p-4 rounded-lg border transition-all ${
                feedbackType === 'bug'
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Bug className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Bug Report</div>
            </button>
            
            <button
              type="button"
              onClick={() => setFeedbackType('idea')}
              className={`p-4 rounded-lg border transition-all ${
                feedbackType === 'idea'
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Lightbulb className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Feature Idea</div>
            </button>
            
            <button
              type="button"
              onClick={() => setFeedbackType('other')}
              className={`p-4 rounded-lg border transition-all ${
                feedbackType === 'other'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <MessageSquare className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Other</div>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              feedbackType === 'bug' 
                ? 'Brief description of the bug...' 
                : feedbackType === 'idea'
                ? 'What would you like to see?'
                : 'What\'s on your mind?'
            }
            className="w-full px-4 py-3 bg-gray-900/40 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
            maxLength={200}
            required
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              feedbackType === 'bug'
                ? 'What happened? What did you expect to happen? Steps to reproduce...'
                : feedbackType === 'idea'
                ? 'Tell us more about your idea...'
                : 'Share your thoughts...'
            }
            rows={6}
            className="w-full px-4 py-3 bg-gray-900/40 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
            required
          />
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Privacy:</strong> We'll collect your{' '}
            {user ? 'user ID' : 'browser info'} along with this feedback to help us 
            understand and address your concern. No personal data beyond what you provide 
            here will be stored.
          </p>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Thank you! Your feedback has been submitted.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || submitStatus === 'success'}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
            isSubmitting || submitStatus === 'success'
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
          }`}
        >
          {isSubmitting ? 'Submitting...' : submitStatus === 'success' ? 'Submitted!' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
