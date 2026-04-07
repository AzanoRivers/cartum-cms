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
