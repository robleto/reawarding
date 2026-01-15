"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import CollectionCard from "@/components/films/CollectionCard";
import Loader from "@/components/ui/Loading";

type CollectionCategory = 'awards' | 'lists' | 'franchises' | 'actors' | 'directors' | 'studios';

interface FilmCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: CollectionCategory;
  featured: boolean;
  movie_count: number;
}

export default function CollectionsPage() {
  const [activeCategory, setActiveCategory] = useState<CollectionCategory | 'all' | 'featured'>('featured');
  const [collections, setCollections] = useState<FilmCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  const categories: Array<{ key: CollectionCategory | 'all' | 'featured'; label: string }> = [
    { key: 'featured', label: 'Featured' },
    { key: 'all', label: 'All Collections' },
    { key: 'awards', label: 'Awards & Honors' },
    { key: 'lists', label: 'Essential Lists' },
    { key: 'franchises', label: 'Franchises' },
    { key: 'actors', label: 'Actors' },
    { key: 'directors', label: 'Directors' },
    { key: 'studios', label: 'Studios' },
  ];

  useEffect(() => {
    async function fetchCollections() {
      setCollectionsLoading(true);
      
      let query = supabase.from('film_collections_with_counts').select('*');
      
      if (activeCategory === 'featured') {
        query = query.eq('featured', true);
      } else if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }
      
      const { data, error } = await query.order('title', { ascending: true });
      
      if (error) {
        console.error('Error fetching collections:', error);
      } else {
        setCollections(data || []);
      }
      
      setCollectionsLoading(false);
    }
    
    fetchCollections();
  }, [activeCategory]);


  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3 font-unbounded">
            Film Collections
          </h1>
          <p className="text-lg text-gray-400">
            Explore curated collections of essential cinema
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="inline-flex rounded-xl bg-gray-900/60 border border-gray-700/40 p-1 gap-1">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeCategory === category.key
                    ? 'bg-yellow-500 text-gray-900'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collections Grid */}
        {collectionsLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No collections found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.slug}
                collection={collection}
                movieCount={collection.movie_count}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
