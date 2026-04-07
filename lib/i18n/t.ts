/**
 * Minimal translation helper.
 * Works on the full Dictionary or any sub-object.
 * Uses {single-brace} interpolation syntax: e.g. "Hello {name}".
 *
 * @param dict  - Any object (full Dictionary or a nested sub-object)
 * @param key   - Dot-separated path within dict
 * @param params - Optional substitution values for {param} placeholders
 * @returns The resolved string, or `key` itself if the path is not found.
 */
export function t(
  dict: unknown,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.')
  let value: unknown = dict

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return key
    value = (value as Record<string, unknown>)[part]
  }

  if (typeof value !== 'string') return key

  if (!params) return value

  return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}
