import { create } from 'zustand'
import type { BreadcrumbItem } from '@/types/nodes'
import type { CmsDictionary } from '@/locales/en'
import type { SchemaPermissions } from '@/types/roles'
import { DEFAULT_SCHEMA_PERMS_READONLY } from '@/types/roles'

export type SettingsSection = 'account' | 'appearance' | 'project' | 'subscription' | 'storage' | 'email' | 'api' | 'members' | 'users' | 'roles' | 'help' | 'info' | 'db' | 'webMigration' | 'defaults' | 'cartumProjects' | 'variables' | 'superDb'

interface UIState {
  settingsOpen: boolean
  settingsSection: SettingsSection
  helpOpen: boolean
  creationPanelOpen: boolean
  /** Anchor element for the creation panel (set by DockBar "+ Create" button).
   *  Used by NodePanel on desktop to position the anchored popover near the trigger. */
  creationPanelAnchorEl: HTMLElement | null
  /** Canvas-space position for context-menu node creation (right-click / long-press). Null = use auto grid. */
  creationContextPosition: { x: number; y: number } | null
  editingFieldId: string | null
  breadcrumb: BreadcrumbItem[]
  parentId: string | null
  cmsDict: CmsDictionary | null
  schemaPermissions: SchemaPermissions
  globalLoading: boolean
  globalLoadingLabel: string | undefined
  /** True while a web migration scrape/import job is active. */
  migrationActive: boolean
  /** Registered cancel fn from the active WebMigrationSection instance. */
  cancelMigrationFn: (() => void) | null
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  openHelp: () => void
  closeHelp: () => void
  openCreationPanel: (anchor?: HTMLElement | null, contextPos?: { x: number; y: number } | null) => void
  closeCreationPanel: () => void
  openFieldEdit: (id: string) => void
  closeFieldEdit: () => void
  setBreadcrumb: (items: BreadcrumbItem[], parentId: string | null) => void
  setCmsDict: (dict: CmsDictionary) => void
  setSchemaPermissions: (perms: SchemaPermissions) => void
  setGlobalLoading: (loading: boolean, label?: string) => void
  setMigrationState: (active: boolean, cancelFn?: (() => void) | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  settingsOpen: false,
  settingsSection: 'project',
  helpOpen: false,
  creationPanelOpen: false,
  creationPanelAnchorEl: null,
  creationContextPosition: null,
  editingFieldId: null,
  breadcrumb: [],
  parentId: null,
  cmsDict: null,
  schemaPermissions: { ...DEFAULT_SCHEMA_PERMS_READONLY },
  globalLoading: false,
  globalLoadingLabel: undefined,
  migrationActive: false,
  cancelMigrationFn: null,
  openSettings: (section = 'project') => set({ settingsOpen: true, settingsSection: section }),
  closeSettings: () => set({ settingsOpen: false }),
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  openCreationPanel: (anchor, contextPos) => set({ creationPanelOpen: true, creationPanelAnchorEl: anchor ?? null, creationContextPosition: contextPos ?? null }),
  closeCreationPanel: () => set({ creationPanelOpen: false, creationPanelAnchorEl: null, creationContextPosition: null }),
  openFieldEdit: (id) => set({ editingFieldId: id }),
  closeFieldEdit: () => set({ editingFieldId: null }),
  setBreadcrumb: (items, parentId) => set({ breadcrumb: items, parentId }),
  setCmsDict: (dict) => set({ cmsDict: dict }),
  setSchemaPermissions: (perms) => set({ schemaPermissions: perms }),
  setGlobalLoading: (loading, label) => set({ globalLoading: loading, globalLoadingLabel: label }),
  setMigrationState: (active, cancelFn) => set({
    migrationActive: active,
    cancelMigrationFn: active ? (cancelFn ?? null) : null,
  }),
}))
