import Link from "next/link";

export const metadata = {
  title: "Guest Mode | Help",
  description: "How guest rankings and lists work, and how data migrates when you create an account.",
};

export default function GuestModeHelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-unbounded font-semibold text-yellow-400 mb-3">
        Guest Mode
      </h1>
      <p className="text-gray-300 mb-8">
        You can use ReAwarding without an account. Rank movies, mark what you've seen, and start building your taste — all stored locally on your device. When you decide to sign up, we migrate your guest data into your account automatically.
      </p>

      <div className="space-y-8">
        <section className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">What works in Guest Mode</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li><span className="text-gray-200 font-medium">Rank movies:</span> Set a score and mark as seen — saved locally.</li>
            <li><span className="text-gray-2 00 font-medium">Home sorting:</span> "For Your Consideration" prioritizes new releases and acclaimed films for easy discovery.</li>
            <li><span className="text-gray-200 font-medium">View preferences:</span> We remember filters and layout on this device.</li>
          </ul>
        </section>

        <section className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">Where guest mode is limited</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Guest data lives in your browser only. Clearing site data or switching devices will remove it.</li>
            <li>Creating shared lists and syncing across devices requires an account.</li>
          </ul>
        </section>

        <section className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">How migration works when you sign up</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Your local rankings are read from secure local storage and written to your account.</li>
            <li>We never overwrite existing ratings — your data is merged thoughtfully.</li>
            <li>After a successful migration, your local guest data is cleaned up.</li>
          </ul>
          <p className="text-sm text-gray-400 mt-4">
            Under the hood, the app checks an <code className="text-yellow-300">isGuest</code> flag before calling any database writes, and uses a browser-safe store for guest state. When a session appears, the migration runs automatically.
          </p>
        </section>

        <section className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">Tips for a smooth signup</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Sign up on the same device where you created guest rankings to migrate them.</li>
            <li>Keep this tab open during signup — the migration runs right after authentication.</li>
          </ul>
          <div className="mt-4">
            <Link href="/login" className="inline-block px-4 py-2 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition-colors">
              Create an account
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
