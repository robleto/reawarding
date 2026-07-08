'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Database } from '@/types/supabase';
import type { Movie } from '@/types/types';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Loader from '@/components/ui/Loading';
import Image from 'next/image';
import { normalizeImageUrl } from '@/utils/imageUrl';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Collection = {
  id: string;
  title: string;
  slug: string;
};

interface FilmsManagerProps {
  collection: Collection;
}

export default function FilmsManager({ collection }: FilmsManagerProps) {
  const [films, setFilms] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const supabase = createClientComponentClient<Database>();

  const filmTmdbIds = useMemo(() => new Set(films.map(f => f.tmdb_id).filter(Boolean)), [films]);

  useEffect(() => {
    fetchCollectionFilms();
  }, [collection.id]);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchMovies = async () => {
      setSearching(true);

      // Query the full movies table (not limited to current collection)
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('title', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearchResults((data || []) as unknown as Movie[]);
      setSearching(false);
    };

    const debounce = setTimeout(searchMovies, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, collection.id]);

  async function fetchCollectionFilms() {
    setLoading(true);

    // Get film IDs in this collection
    const { data: items, error: itemsError } = await supabase
      .from('film_collection_items')
      .select('tmdb_id')
      .eq('collection_id', collection.id);

    if (!items || items.length === 0) {
      setFilms([]);
      setLoading(false);
      return;
    }

    const tmdbIds = items.map(item => item.tmdb_id);

    // Fetch movie details
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('*')
      .in('tmdb_id', tmdbIds);

    setFilms((movies || []) as unknown as Movie[]);
    setLoading(false);
  }

  async function addFilm(movie: Movie) {
    if (!movie.tmdb_id) {
      alert('This movie does not have a TMDB ID and cannot be added to collections.');
      return;
    }

    const response = await fetch(`/api/admin/collections/${collection.id}/films`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: movie.tmdb_id }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(`Error adding film: ${result.error}`);
    } else {
      await fetchCollectionFilms();
      setSearchTerm('');
      setSearchResults([]);
    }
  }

  async function removeFilm(tmdbId: number) {
    if (!confirm('Remove this film from the collection?')) {
      return;
    }

    const response = await fetch(`/api/admin/collections/${collection.id}/films?tmdb_id=${tmdbId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Delete error:', result.error);
      alert(`Error removing film: ${result.error}`);
    } else {
      // Optimistically update UI first
      setFilms(prev => prev.filter(f => f.tmdb_id !== tmdbId));
      // Then refresh from database to ensure consistency
      await fetchCollectionFilms();
    }
  }

  if (loading) {
    return <Loader message="Loading films..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <Link
          href="/admin/collections"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold font-unbounded text-white mb-3">
              {collection.title}
            </h1>
            <p className="text-gray-400 text-lg">
              {films.length} {films.length === 1 ? 'film' : 'films'} in collection
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-2"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {searchOpen ? 'Close' : 'Add Films'}
          </Button>
        </div>

        {/* Search Panel */}
        {searchOpen && (
          <div className="mb-8 bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-6">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for films to add..."
                className="w-full pl-12 pr-4 py-3 bg-charcoal-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                autoFocus
              />
            </div>

            {searching && <p className="text-gray-400 text-sm">Searching...</p>}

            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((movie) => (
                  <div
                    key={movie.id}
                    className="group relative overflow-hidden rounded-lg bg-charcoal-900/50 border border-gray-700 hover:border-gold-500/50 transition-all"
                  >
                    <div className="aspect-[2/3] relative">
                      <Image
                        src={normalizeImageUrl(movie.poster_url) || 'https://placehold.co/300x450?text=No+Image'}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-gray-400">{movie.release_year}</p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (filmTmdbIds.has(movie.tmdb_id)) return;
                        addFilm(movie);
                      }}
                      disabled={filmTmdbIds.has(movie.tmdb_id)}
                      className="w-full rounded-t-none text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {filmTmdbIds.has(movie.tmdb_id) ? 'In Collection' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
              <p className="text-gray-400 text-center py-4">No films found matching "{searchTerm}"</p>
            )}
          </div>
        )}

        {/* Films Grid */}
        {films.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No films in this collection yet</p>
            <Button variant="primary" onClick={() => setSearchOpen(true)}>
              Add Your First Film
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {films.map((movie) => (
              <div
                key={movie.id}
                className="group relative overflow-hidden rounded-lg bg-charcoal-900/50 border border-gray-700"
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    src={normalizeImageUrl(movie.poster_url) || 'https://placehold.co/300x450?text=No+Image'}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  
                  {/* Remove button overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Remove "${movie.title}" from this collection?`)) {
                          removeFilm(movie.tmdb_id!);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </div>
                
                <div className="p-3">
                  <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-gray-400">{movie.release_year}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
