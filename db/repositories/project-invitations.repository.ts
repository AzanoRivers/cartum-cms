import { and, eq, isNull, lt } from 'drizzle-orm'
import { db } from '@/db'
import { projectInvitations, roles } from '@/db/schema'

export const projectInvitationsRepository = {

  async findByTokenHash(tokenHash: string) {
    const [row] = await db
      .select({
        id:           projectInvitations.id,
        projectId:    projectInvitations.projectId,
        invitedEmail: projectInvitations.invitedEmail,
        roleId:       projectInvitations.roleId,
        roleName:     roles.name,
        expiresAt:    projectInvitations.expiresAt,
        acceptedAt:   projectInvitations.acceptedAt,
      })
      .from(projectInvitations)
      .innerJoin(roles, eq(roles.id, projectInvitations.roleId))
      .where(eq(projectInvitations.tokenHash, tokenHash))
      .limit(1)
    return row ?? null
  },

  async findById(id: string, projectId: string) {
    const [row] = await db
      .select({
        id:           projectInvitations.id,
        invitedEmail: projectInvitations.invitedEmail,
        roleId:       projectInvitations.roleId,
        expiresAt:    projectInvitations.expiresAt,
        acceptedAt:   projectInvitations.acceptedAt,
      })
      .from(projectInvitations)
      .where(and(eq(projectInvitations.id, id), eq(projectInvitations.projectId, projectId)))
      .limit(1)
    return row ?? null
  },

  async listPending(projectId: string) {
    return db
      .select({
        id:           projectInvitations.id,
        invitedEmail: projectInvitations.invitedEmail,
        roleId:       projectInvitations.roleId,
        roleName:     roles.name,
        expiresAt:    projectInvitations.expiresAt,
        createdAt:    projectInvitations.createdAt,
      })
      .from(projectInvitations)
      .innerJoin(roles, eq(roles.id, projectInvitations.roleId))
      .where(
        and(
          eq(projectInvitations.projectId, projectId),
          isNull(projectInvitations.acceptedAt),
        ),
      )
  },

  async upsert(data: {
    projectId:    string
    invitedEmail: string
    roleId:       string
    invitedBy:    string
    tokenHash:    string
    expiresAt:    Date
  }) {
    await db
      .insert(projectInvitations)
      .values(data)
      .onConflictDoUpdate({
        target: [projectInvitations.projectId, projectInvitations.invitedEmail],
        set: {
          roleId:    data.roleId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      })
  },

  async markAccepted(id: string) {
    await db
      .update(projectInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(projectInvitations.id, id))
  },

  async refreshToken(id: string, tokenHash: string, expiresAt: Date) {
    await db
      .update(projectInvitations)
      .set({ tokenHash, expiresAt })
      .where(eq(projectInvitations.id, id))
  },

  async delete(id: string, projectId: string) {
    await db
      .delete(projectInvitations)
      .where(and(eq(projectInvitations.id, id), eq(projectInvitations.projectId, projectId)))
  },

  /**
   * Lazy expiry sweep — this is a serverless deploy with no background
   * worker/cron, so there is no process that expires invitations on a
   * schedule. Instead this runs opportunistically at natural trigger points
   * (opening the invite UI, sending a new invite, export, import) and
   * deletes any PENDING invitation (never an already-accepted one — that's
   * a historical record) whose `expiresAt` is in the past.
   *
   * Pass a `projectId` to scope the sweep to one project (cheap, used on
   * every invite-flow interaction); omit it to sweep the whole instance
   * (used by export/import, which operate instance-wide).
   */
  async deleteExpiredPending(projectId?: string): Promise<void> {
    const conditions = [isNull(projectInvitations.acceptedAt), lt(projectInvitations.expiresAt, new Date())]
    if (projectId) conditions.push(eq(projectInvitations.projectId, projectId))
    await db.delete(projectInvitations).where(and(...conditions))
  },
}
