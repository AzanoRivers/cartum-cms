export interface Project {
  id: string
  name: string
  description: string | null
  defaultLocale: string
  createdAt: Date
}

export type SetupStep =
  | 'system-check'
  | 'locale'
  | 'credentials'
  | 'project'
  | 'theme'
  | 'initializing'
  | 'ready'

export interface SetupState {
  currentStep:     SetupStep
  systemCheck:     Record<string, boolean>
  localeDone:      boolean
  credentialsDone: boolean
  projectDone:     boolean
}

export type SupportedLocale = 'en' | 'es'
