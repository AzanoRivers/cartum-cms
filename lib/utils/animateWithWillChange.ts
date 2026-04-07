/**
 * animateWithWillChange
 *
 * Safely scopes `will-change` to the duration of a single animation.
 * Sets the hint one rAF before the animation starts, removes it on `animationend`.
 *
 * Rule: `will-change` must NEVER persist on idle elements — it pins memory (a
 * full composited layer) indefinitely. This utility guarantees cleanup.
 *
 * Usage:
 *   animateWithWillChange(el, 'transform, opacity', () => {
 *     el.classList.add('animate-panel-unfurl')
 *   })
 */
export function animateWithWillChange(
  el:         HTMLElement,
  properties: string,   // e.g. 'transform, opacity' | 'clip-path, transform, opacity'
  animate:    () => void,
): void {
  el.style.willChange = properties

  // One rAF gives the browser a chance to promote the layer BEFORE the first
  // animation frame, avoiding the "jank on first frame" problem.
  requestAnimationFrame(() => {
    animate()

    el.addEventListener(
      'animationend',
      () => { el.style.willChange = 'auto' },
      { once: true },
    )
  })
}
