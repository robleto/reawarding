'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { Plus, ArrowLeft, Edit2, Trash2, Film } from 'lucide-react';
import Loader from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import CollectionCard from '@/components/films/CollectionCard';

type FilmCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  movie_count?: number;
};

export default function CollectionsManager() {
  const [collections, setCollections] = useState<FilmCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'featured' | string>('all');
  const supabase = useSupabaseClient<Database>();

  useEffect(() => {
    fetchCollections();
  }, [filter]);

  async function fetchCollections() {
    setLoading(true);

    let query = supabase
      .from('film_collections_with_counts')
      .select('*')
      .order('title', { ascending: true });

    if (filter === 'featured') {
      query = query.eq('featured', true);
    } else if (filter !== 'all') {
      query = query.eq('category', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCollections(data as FilmCollection[]);
    }

    setLoading(false);
  }

  async function deleteCollection(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This will also remove all films from this collection.`)) {
      return;
    }

    const response = await fetch(`/api/admin/collections/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(`Error deleting collection: ${result.error || 'Unknown error'}`);
    } else {
      fetchCollections();
    }
  }

  if (loading) {
    return <Loader message="Loading collections..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-unbounded text-white mb-3">
                Film Collections
              </h1>
              <p className="text-gray-400 text-lg">
                Manage curated film collections
              </p>
            </div>

            <Link href="/admin/collections/new">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Collection
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Total Collections</p>
            <p className="text-2xl font-bold text-white">{collections.length}</p>
          </div>
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Featured</p>
            <p className="text-2xl font-bold text-white">
              {collections.filter(c => c.featured).length}
            </p>
          </div>
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Total Films</p>
            <p className="text-2xl font-bold text-white">
              {collections.reduce((sum, c) => sum + (c.movie_count || 0), 0)}
            </p>
          </div>
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Categories</p>
            <p className="text-2xl font-bold text-white">
              {new Set(collections.map(c => c.category)).size}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2">
          {['all', 'featured', 'directors', 'actors', 'franchises', 'studios', 'awards', 'lists'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === tab
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                  : 'bg-charcoal-800/50 text-gray-400 hover:text-white hover:bg-charcoal-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Collections Grid */}
        {collections.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-4">No collections found</p>
            <Link href="/admin/collections/new">
              <Button variant="primary">Create Your First Collection</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <div key={collection.id} className="relative group">
                <CollectionCard collection={collection} />
                
                {/* Admin Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                  <Link href={`/admin/collections/${collection.id}/edit`}>
                    <Button
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/collections/${collection.id}/films`}>
                    <Button
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Film className="w-4 h-4" />
                      Manage Films
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={() => deleteCollection(collection.id, collection.title)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
