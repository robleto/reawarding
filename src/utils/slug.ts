export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function movieSlug(title: string, id: number | string) {
  const slug = slugifyTitle(title || 'movie');
  // Return path-like slug: <slug>/<id>
  return `${slug}/${id}`;
}

export function parseSlugId(param: string): { id: string | null; slug: string } {
  // Support legacy combined format: <slug>-<id>
  // Try UUID at end
  const uuidMatch = param.match(/^(.*)-([0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$/);
  if (uuidMatch) return { slug: uuidMatch[1], id: uuidMatch[2] };

  // Try numeric id at end
  const numMatch = param.match(/^(.*)-(\d+)$/);
  if (numMatch) return { slug: numMatch[1], id: numMatch[2] };

  return { id: null, slug: param };
}
