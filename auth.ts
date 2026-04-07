import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { usersRepository } from '@/db/repositories/users.repository'
import { rolesRepository } from '@/db/repositories/roles.repository'
import { verifyPassword } from '@/lib/services/auth.service'
import '@/types/auth'

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

        return {
          id:           user.id,
          email:        user.email,
          isSuperAdmin: user.isSuperAdmin ?? false,
          roles:        roleRows.map((r) => r.name),
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id           = user.id as string
        token.isSuperAdmin = user.isSuperAdmin
        token.roles        = user.roles
      }
      return token
    },
    session({ session, token }) {
      session.user.id           = token.id           as string
      session.user.isSuperAdmin = token.isSuperAdmin as boolean
      session.user.roles        = token.roles        as string[]
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
})
