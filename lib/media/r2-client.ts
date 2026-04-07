import { S3Client } from '@aws-sdk/client-s3'
import { getSetting } from '@/lib/settings/get-setting'

/**
 * Builds an S3Client pointed at Cloudflare R2.
 * Reads credentials from DB (app_settings) first, falls back to env vars.
 * Server-only.
 */
export async function getR2Client(): Promise<{ client: S3Client; bucket: string; publicUrl: string }> {
  const endpoint  = process.env.R2_ENDPOINT!
  const accessKey = process.env.R2_ACCESS_KEY_ID!
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!
  const bucket    = await getSetting('r2_bucket_name', process.env.R2_BUCKET_NAME)
  const publicUrl = await getSetting('r2_public_url',  process.env.R2_PUBLIC_URL)

  if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) {
    throw new Error('R2_NOT_CONFIGURED')
  }

  const client = new S3Client({
    region:   'auto',
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  return { client, bucket, publicUrl }
}
