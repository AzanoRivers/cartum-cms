export type StorageProvider = 'r2' | 'blob'

export interface ProjectSettings {
  projectName:   string
  description?:  string
  defaultLocale: 'en' | 'es'
}

export interface StorageSettings {
  r2Endpoint:        string
  r2AccessKeyId:     string
  r2SecretAccessKey: string
  r2BucketName:      string
  r2PublicUrl:       string
  mediaVpsUrl?:      string
  mediaVpsKey?:      string
  blobToken?:        string
  storageProvider:   StorageProvider
}

export interface StorageSettingsIsSet {
  r2Endpoint:        boolean
  r2AccessKeyId:     boolean
  r2SecretAccessKey: boolean
  r2BucketName:      boolean
  r2PublicUrl:       boolean
  mediaVpsUrl:       boolean
  mediaVpsKey:       boolean
  blobToken:         boolean
}

export interface UpdateProjectInput extends ProjectSettings {}

export interface UpdateStorageInput extends StorageSettings {}

export interface InviteUserInput {
  email:  string
  roleId: string
}

export interface RolePermissionMatrix {
  roleId: string
  nodePermissions: Array<{
    nodeId: string | '*'
    actions: Array<'read' | 'create' | 'update' | 'delete'>
  }>
}

export type WebMigrationSettings = {
  scraperApiUrl?: string
  scraperApiKey?: string
}
