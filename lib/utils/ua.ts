// Simple mobile UA detection for SSR layout branching.
// Not used for security — only for initial layout selection.
const MOBILE_RE = /android|iphone|ipad|ipod|mobile|blackberry|windows phone/i

export function isMobileUserAgent(ua: string): boolean {
  return MOBILE_RE.test(ua)
}
