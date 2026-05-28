export type TokenScope = 'read' | 'write' | 'update' | 'delete'

export interface ApiToken {
  id:              string
  name:            string
  roleId:          string
  projectId:       string
  scope:           TokenScope[]
  excludedNodeIds: string[]
  createdAt:       Date
  lastUsedAt:      Date | null
  expiresAt:       Date | null
  revokedAt:       Date | null
}

export interface CreateApiTokenInput {
  name:            string
  roleId:          string
  scope:           TokenScope[]
  excludedNodeIds: string[]
  expiresAt?:      Date
}

export interface ApiAuth {
  roleId:          string
  tokenId:         string
  projectId:       string
  scope:           TokenScope[]
  excludedNodeIds: string[]
}
