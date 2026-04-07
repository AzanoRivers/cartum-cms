export interface ApiToken {
  id:         string
  name:       string
  roleId:     string
  createdAt:  Date
  lastUsedAt: Date | null
  expiresAt:  Date | null
  revokedAt:  Date | null
}

export interface CreateApiTokenInput {
  name:       string
  roleId:     string
  expiresAt?: Date
}

export interface ApiAuth {
  roleId:  string
  tokenId: string
}
