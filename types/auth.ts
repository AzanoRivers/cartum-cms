import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isSuperAdmin: boolean
      roles: string[]
    } & DefaultSession['user']
  }

  interface User {
    isSuperAdmin: boolean
    roles: string[]
  }
}

// JWT augmentation via next-auth token callback (no separate module needed in beta)

export interface SessionUser {
  id: string
  email: string
  isSuperAdmin: boolean
  roles: string[]
}
