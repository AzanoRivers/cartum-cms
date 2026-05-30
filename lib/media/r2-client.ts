import { S3Client } from '@aws-sdk/client-s3'
import { getSetting } from '@/lib/settings/get-setting'

async function resolveR2Setting(key: string, envFallback: string | undefined, projectId?: string | null) {
  if (projectId) {
    const project = await getSetting(`${key}:${projectId}`)
    if (project) return project
  }
  return getSetting(key, envFallback)
}

/**
 * Builds an S3Client pointed at Cloudflare R2.
 * Reads credentials from DB (project-scoped first, then global) with env fallback.
 * Server-only.
 */
export async function getR2Client(projectId?: string | null): Promise<{
  client:    S3Client
  bucket:    string
  publicUrl: string
}> {
  const [endpoint, accessKey, secretKey, bucket, publicUrl] = await Promise.all([
    resolveR2Setting('r2_endpoint',       process.env.R2_ENDPOINT,          projectId),
    resolveR2Setting('r2_access_key_id',  process.env.R2_ACCESS_KEY_ID,     projectId),
    resolveR2Setting('r2_secret_key',     process.env.R2_SECRET_ACCESS_KEY, projectId),
    resolveR2Setting('r2_bucket_name',    process.env.R2_BUCKET_NAME,       projectId),
    resolveR2Setting('r2_public_url',     process.env.R2_PUBLIC_URL,        projectId),
  ])

  if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) {
    throw new Error('R2_NOT_CONFIGURED')
  }

  const client = new S3Client({
    region:      'auto',
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  return { client, bucket, publicUrl }
}
