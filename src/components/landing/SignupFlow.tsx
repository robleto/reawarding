'use client';

import { useId, useState } from 'react';
import type { LandingVariant } from '@/lib/landingDb';
import { useLandingTelemetry } from './useLandingTelemetry';

interface SignupFlowProps {
  variant: LandingVariant;
  /** Button label — the only copy that differs between the two variants here. */
  cta: string;
}

type Stage = 'email' | 'tracker' | 'done';

/**
 * The two-step conversion for the landing test. Step 1 (email) is the cheap
 * signal reported against the standard benchmarks; step 2 (send me your actual
 * spreadsheet) is the costly one that actually predicts anything.
 *
 * Step 2 reveals in place rather than on a separate thank-you page: one fewer
 * navigation to lose people to, and the funnel numbers stay directly comparable
 * because both steps happen in one session on one URL.
 */
export default function SignupFlow({ variant, cta }: SignupFlowProps) {
  const { track, attribution } = useLandingTelemetry(variant);

  // LandingFrame mounts this component twice per page (hero and footer), so
  // fixed element ids would ship duplicates and bind both labels to the first
  // input. useId namespaces them per instance.
  const uid = useId();
  const emailId = `email-${uid}`;
  const honeypotId = `company-${uid}`;
  const trackerId = `tracker-${uid}`;

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [trackerLink, setTrackerLink] = useState('');
  const [signupId, setSignupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    track('cta_click');

    try {
      const res = await fetch('/api/landing/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, email, honeypot, attribution }),
      });
      const data = (await res.json()) as { id?: string | null; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      setSignupId(data.id ?? null);
      track('email_submitted');
      setStage('tracker');
    } catch {
      setError('Network hiccup — try that again?');
    } finally {
      setBusy(false);
    }
  }

  async function submitTracker(declined: boolean) {
    if (busy) return;
    if (!declined && !trackerLink.trim()) return;

    setBusy(true);
    try {
      if (signupId) {
        await fetch('/api/landing/signup', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: signupId, trackerLink, declined }),
        });
      }
      track(declined ? 'step2_declined' : 'step2_upload');
      setStage('done');
    } catch {
      // Their email is already saved — this step failing is our problem, not
      // theirs, so close the loop rather than showing an error they can't fix.
      setStage('done');
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'done') {
    return (
      <div className="rounded-lg border border-gold-500/25 bg-gold-500/[0.06] p-6">
        <p className="font-unbounded text-lg text-gold-200">That&apos;s everything.</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          One email in January when nominations are announced. Nothing before then.
        </p>
      </div>
    );
  }

  if (stage === 'tracker') {
    return (
      <div className="rounded-lg border border-gold-500/25 bg-gold-500/[0.06] p-6">
        <p className="font-unbounded text-lg text-gold-200">
          You&apos;re in. One more thing, and this is the part that actually helps me:
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Send me the tracker you used last season. Spreadsheet link, Notion page,
          a screenshot, a photo of a napkin — whatever it really was. Seeing how
          people actually do this is worth more to me than your email address.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor={trackerId}>
            Link to your tracker
          </label>
          <input
            id={trackerId}
            type="text"
            value={trackerLink}
            onChange={(e) => setTrackerLink(e.target.value)}
            placeholder="Paste a link, or describe it"
            className="flex-1 rounded-md border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
          <button
            type="button"
            onClick={() => submitTracker(false)}
            disabled={busy || !trackerLink.trim()}
            className="rounded-md bg-gold-500 px-5 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send it
          </button>
        </div>

        <button
          type="button"
          onClick={() => submitTracker(true)}
          disabled={busy}
          className="mt-4 text-sm text-gray-500 underline decoration-gray-700 underline-offset-4 transition-colors hover:text-gray-300"
        >
          I didn&apos;t have one
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitEmail} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={emailId}>
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-4 py-3.5 text-base text-gray-100 placeholder:text-gray-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
        />

        {/* Honeypot: off-screen rather than display:none, which some bots skip. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor={honeypotId}>Company</label>
          <input
            id={honeypotId}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold-500 px-6 py-3.5 text-base font-semibold text-gray-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'One sec…' : cta}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <p className="mt-3 text-sm text-gray-500">
        One email in January. Nothing else, ever.
      </p>
    </form>
  );
}
