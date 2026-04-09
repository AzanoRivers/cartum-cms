import { create } from 'zustand'
import type { BreadcrumbItem } from '@/types/nodes'
import type { CmsDictionary } from '@/locales/en'

export type SettingsSection = 'account' | 'appearance' | 'project' | 'storage' | 'email' | 'api' | 'users' | 'roles' | 'info' | 'db'

interface UIState {
  settingsOpen: boolean
  settingsSection: SettingsSection
  helpOpen: boolean
  creationPanelOpen: boolean
  /** Anchor element for the creation panel (set by DockBar "+ Create" button).
   *  Used by NodePanel on desktop to position the anchored popover near the trigger. */
  creationPanelAnchorEl: HTMLElement | null
  editingFieldId: string | null
  breadcrumb: BreadcrumbItem[]
  parentId: string | null
  cmsDict: CmsDictionary | null
  canAccessBuilder: boolean
  globalLoading: boolean
  globalLoadingLabel: string | undefined
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  openHelp: () => void
  closeHelp: () => void
  openCreationPanel: (anchor?: HTMLElement | null) => void
  closeCreationPanel: () => void
  openFieldEdit: (id: string) => void
  closeFieldEdit: () => void
  setBreadcrumb: (items: BreadcrumbItem[], parentId: string | null) => void
  setCmsDict: (dict: CmsDictionary) => void
  setCanAccessBuilder: (value: boolean) => void
  setGlobalLoading: (loading: boolean, label?: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  settingsOpen: false,
  settingsSection: 'project',
  helpOpen: false,
  creationPanelOpen: false,
  creationPanelAnchorEl: null,
  editingFieldId: null,
  breadcrumb: [],
  parentId: null,
  cmsDict: null,
  canAccessBuilder: true,
  globalLoading: false,
  globalLoadingLabel: undefined,
  openSettings: (section = 'project') => set({ settingsOpen: true, settingsSection: section }),
  closeSettings: () => set({ settingsOpen: false }),
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  openCreationPanel: (anchor) => set({ creationPanelOpen: true, creationPanelAnchorEl: anchor ?? null }),
  closeCreationPanel: () => set({ creationPanelOpen: false, creationPanelAnchorEl: null }),
  openFieldEdit: (id) => set({ editingFieldId: id }),
  closeFieldEdit: () => set({ editingFieldId: null }),
  setBreadcrumb: (items, parentId) => set({ breadcrumb: items, parentId }),
  setCmsDict: (dict) => set({ cmsDict: dict }),
  setCanAccessBuilder: (value) => set({ canAccessBuilder: value }),
  setGlobalLoading: (loading, label) => set({ globalLoading: loading, globalLoadingLabel: label }),
}))
