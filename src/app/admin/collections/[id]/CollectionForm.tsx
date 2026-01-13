'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import * as LucideIcons from 'lucide-react';

type Collection = {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  featured: boolean;
};

interface CollectionFormProps {
  mode: 'create' | 'edit';
  collection?: Collection;
}

const ICON_OPTIONS = [
  'Film', 'Star', 'Award', 'Sparkles', 'Crown', 'Trophy', 'Heart', 'TrendingUp',
  'Users', 'User', 'Clapperboard', 'Camera', 'Video', 'Play', 'Popcorn', 'Ticket',
];

const COLOR_OPTIONS = [
  { name: 'Gold', value: 'gold' },
  { name: 'Blue', value: 'blue' },
  { name: 'Purple', value: 'purple' },
  { name: 'Pink', value: 'pink' },
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Green', value: 'green' },
  { name: 'Emerald', value: 'emerald' },
  { name: 'Cyan', value: 'cyan' },
  { name: 'Violet', value: 'violet' },
  { name: 'Rose', value: 'rose' },
];

const CATEGORY_OPTIONS = [
  { value: 'directors', label: 'Directors' },
  { value: 'actors', label: 'Actors' },
  { value: 'franchises', label: 'Franchises' },
  { value: 'studios', label: 'Studios' },
  { value: 'awards', label: 'Awards' },
  { value: 'lists', label: 'Lists' },
];

export default function CollectionForm({ mode, collection }: CollectionFormProps) {
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Collection>({
    slug: collection?.slug || '',
    title: collection?.title || '',
    description: collection?.description || '',
    icon: collection?.icon || 'Film',
    color: collection?.color || 'gold',
    category: collection?.category || 'lists',
    featured: collection?.featured || false,
  });

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleTitleChange(title: string) {
    setFormData({
      ...formData,
      title,
      slug: slugify(title),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('film_collections')
          .insert({
            slug: formData.slug,
            title: formData.title,
            description: formData.description,
            icon: formData.icon,
            color: formData.color,
            category: formData.category,
            featured: formData.featured,
          });

        if (error) throw error;
      } else {
        if (!collection?.id) {
          throw new Error('Collection ID is required for updates');
        }
        
        // Use API route with service role key for updates
        const response = await fetch(`/api/admin/collections/${collection.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: formData.slug,
            title: formData.title,
            description: formData.description,
            icon: formData.icon,
            color: formData.color,
            category: formData.category,
            featured: formData.featured,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update collection');
        }
      }

      router.push('/admin/collections');
    } catch (error: any) {
      alert(`Error saving collection: ${error.message}`);
      setSaving(false);
    }
  }

  const IconComponent = (LucideIcons as any)[formData.icon];

  return (
    <div>
      <Link
        href="/admin/collections"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collections
      </Link>

      <h1 className="text-4xl font-bold font-unbounded text-white mb-8">
        {mode === 'create' ? 'Create New Collection' : 'Edit Collection'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className="w-full px-4 py-3 bg-charcoal-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
            placeholder="e.g., Top 50 Grossing Films"
          />
        </div>

        {/* Slug (auto-generated) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Slug (auto-generated)
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
            className="w-full px-4 py-3 bg-charcoal-800/50 border border-gray-700 rounded-lg text-gray-400 focus:outline-none focus:border-gold-500"
            placeholder="top-50-grossing-films"
          />
          <p className="text-sm text-gray-500 mt-1">
            URL: /films/collections/{formData.slug}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-charcoal-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
            placeholder="Brief description of this collection..."
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Icon *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {ICON_OPTIONS.map((iconName) => {
              const Icon = (LucideIcons as any)[iconName];
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: iconName })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.icon === iconName
                      ? 'border-gold-500 bg-gold-500/10'
                      : 'border-gray-700 bg-charcoal-800/50 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-6 h-6 text-white mx-auto" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Color *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {COLOR_OPTIONS.map((colorOption) => (
              <button
                key={colorOption.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: colorOption.value })}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.color === colorOption.value
                    ? 'border-gold-500 bg-gold-500/10 text-white'
                    : 'border-gray-700 bg-charcoal-800/50 text-gray-400 hover:border-gray-600'
                }`}
              >
                {colorOption.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="w-full px-4 py-3 bg-charcoal-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-5 h-5 rounded bg-charcoal-800 border-gray-700 text-gold-500 focus:ring-gold-500"
          />
          <label htmlFor="featured" className="text-sm font-medium text-gray-300">
            Feature on homepage
          </label>
        </div>

        {/* Preview */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
          <div className="max-w-sm">
            <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-${formData.color}-500/10 to-${formData.color}-600/5 border border-${formData.color}-500/20 p-6`}>
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-lg bg-${formData.color}-500/20 flex items-center justify-center mb-4`}>
                  {IconComponent && <IconComponent className={`w-7 h-7 text-${formData.color}-400`} />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {formData.title || 'Untitled Collection'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {formData.description || 'No description'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : mode === 'create' ? 'Create Collection' : 'Save Changes'}
          </Button>
          <Link href="/admin/collections">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
