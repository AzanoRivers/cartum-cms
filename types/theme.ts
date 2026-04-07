export type ThemeId = 'dark' | 'cyber-soft' | 'light'

export interface ThemeDefinition {
  id:          ThemeId
  label:       string
  description: string
  /** Hex preview values — used only for static swatch rendering, not in components */
  preview: {
    bg:      string
    surface: string
    primary: string
    accent:  string
  }
}

export const THEMES: ThemeDefinition[] = [
  {
    id:          'dark',
    label:       'Dark',
    description: 'Deep cyberpunk. Max contrast.',
    preview: {
      bg:      '#0a0a0f',
      surface: '#111118',
      primary: '#6366f1',
      accent:  '#22d3ee',
    },
  },
  {
    id:          'cyber-soft',
    label:       'Cyber Soft',
    description: 'Deep blue-grey. Pro mode.',
    preview: {
      bg:      '#0d1117',
      surface: '#161b27',
      primary: '#818cf8',
      accent:  '#38bdf8',
    },
  },
  {
    id:          'light',
    label:       'Light',
    description: 'Slate white. Bright environments.',
    preview: {
      bg:      '#f8fafc',
      surface: '#ffffff',
      primary: '#6366f1',
      accent:  '#0ea5e9',
    },
  },
]
