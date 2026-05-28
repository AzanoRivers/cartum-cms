import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { cookies } from 'next/headers'
import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { project } from '@/db/schema'
import { usersRepository } from '@/db/repositories/users.repository'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { projectMembershipsRepository } from '@/db/repositories/project-memberships.repository'
import { verifyPassword } from '@/lib/services/auth.service'
import { ROLE_RESTRICTED } from '@/types/roles'
import '@/types/auth'
import { SWITCH_COOKIE } from '@/lib/auth/constants'

class AccountDisabledError extends CredentialsSignin {
  code = 'account_disabled'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await usersRepository.findByEmail(email)
        if (!user) return null

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) return null

        const roleRows = await rolesRepository.findByUserId(user.id)

        // Block users whose only role is 'restricted'
        if (
          !user.isSuperAdmin &&
          roleRows.length > 0 &&
          roleRows.every((r) => r.name === ROLE_RESTRICTED)
        ) {
          throw new AccountDisabledError()
        }

        // Set initial project context: first membership found
        const memberships = await projectMembershipsRepository.getUserProjects(user.id)
        const firstProjectId = memberships[0]?.projectId ?? null

        return {
          id:                   user.id,
          email:                user.email,
          isSuperAdmin:         user.isSuperAdmin ?? false,
          roles:                roleRows.map((r) => r.name),
          currentProjectId:     firstProjectId,
          cartumSuscriptor:     user.cartumSuscriptor ?? true,
          cartumSuscriptorTime: user.cartumSuscriptorTime ?? 0,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id                   = user.id as string
        token.isSuperAdmin         = user.isSuperAdmin
        token.roles                = user.roles
        token.currentProjectId     = user.currentProjectId ?? null
        token.cartumSuscriptor     = user.cartumSuscriptor ?? true
        token.cartumSuscriptorTime = user.cartumSuscriptorTime ?? 0
      }
      // Consume project-switch cookie if present
      try {
        const cookieStore = await cookies()
        const switchValue = cookieStore.get(SWITCH_COOKIE)?.value
        if (switchValue) {
          token.currentProjectId = switchValue
        }
      } catch {
        // cookies() unavailable in some JWT callback contexts — skip
      }
      // Backfill: JWT predates currentProjectId field (sessions from before MP-01)
      if (token.id && token.currentProjectId === undefined) {
        const memberships = await projectMembershipsRepository.getUserProjects(token.id as string)
        token.currentProjectId = memberships[0]?.projectId ?? null
      }
      // Super-admin fallback: no membership record → use first project from DB
      if (!token.currentProjectId && token.isSuperAdmin) {
        const [firstProject] = await db.select({ id: project.id }).from(project).orderBy(asc(project.createdAt)).limit(1)
        if (firstProject) token.currentProjectId = firstProject.id
      }
      return token
    },
    session({ session, token }) {
      session.user.id                   = token.id                   as string
      session.user.isSuperAdmin         = token.isSuperAdmin         as boolean
      session.user.roles                = token.roles                as string[]
      session.user.currentProjectId     = (token.currentProjectId     as string | null) ?? null
      session.user.cartumSuscriptor     = (token.cartumSuscriptor     as boolean) ?? true
      session.user.cartumSuscriptorTime = (token.cartumSuscriptorTime as number)  ?? 0
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
})
