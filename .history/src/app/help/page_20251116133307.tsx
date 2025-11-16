import Link from "next/link";
import { RefreshCw, Plus, HelpCircle, User } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-unbounded font-semibold text-yellow-400 mb-2">
          Help & Utilities
        </h1>
        <p className="text-gray-400">
          Tools and guides to manage your movie collection
        </p>
      </div>

      {/* Utilities Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Guest Mode Guide */}
        <Link
          href="/help/guest-mode"
          className="group bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
              <User className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                Guest Mode Guide
              </h2>
              <p className="text-sm text-gray-400">
                Learn how rankings and lists work without an account, and how your data migrates when you sign up.
              </p>
            </div>
          </div>
        </Link>
        {/* Refresh Metadata */}
        <Link
          href="/help/refresh-metadata"
          className="group bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                Refresh Movie Metadata
              </h2>
              <p className="text-sm text-gray-400">
                Fix incorrect movie information (title, year, poster, etc.) by fetching fresh data from TMDB without affecting your rankings.
              </p>
            </div>
          </div>
        </Link>

        {/* Add Movie */}
        <Link
          href="/help/add-movie"
          className="group bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
              <Plus className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                Add New Movie
              </h2>
              <p className="text-sm text-gray-400">
                Manually add a movie to the database by TMDB ID if it's not showing up in search or the main catalog.
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-200 mb-1">How do I find a movie's Database ID?</h3>
            <p className="text-sm text-gray-400">
              Open the movie detail page and look at the URL (e.g., <code className="text-yellow-300">/films/movie-slug/04581dc3-...</code>). 
              You can also find it displayed on the movie detail page under the title.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-200 mb-1">How do I find a movie's TMDB ID?</h3>
            <p className="text-sm text-gray-400">
              Search for the movie on <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">themoviedb.org</a> and 
              grab the numeric ID from the URL (e.g., <code className="text-yellow-300">themoviedb.org/movie/195589</code> → ID is <code className="text-yellow-300">195589</code>).
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-200 mb-1">Will refreshing metadata affect my rankings?</h3>
            <p className="text-sm text-gray-400">
              No! Rankings are stored separately and are never modified when updating movie metadata. Only the movie information (title, year, poster, etc.) gets updated.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-200 mb-1">What if a movie isn't in the database?</h3>
            <p className="text-sm text-gray-400">
              Use the <Link href="/help/add-movie" className="text-yellow-400 hover:text-yellow-300">Add New Movie</Link> tool to import it using its TMDB ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
