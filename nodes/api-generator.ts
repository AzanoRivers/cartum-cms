/**
 * Converts a node name to a URL-safe slug.
 * Example: "Blog Posts" → "blog-posts", "My API (v2)!" → "my-api-v2"
 */
export function nodeNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Converts a node name to its "simple name" search key: the same name,
 * lowercased, with whitespace removed. Example: "Blog Posts" → "blogposts".
 * Kept in sync on every write to `nodes.name` so search endpoints can match
 * a query regardless of casing or spacing.
 */
export function toSimpleName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '')
}
