import type { R2Bucket } from '@cloudflare/workers-types'

export class StorageService {
  private bucket: R2Bucket
  private publicUrl: string

  constructor(bucket: R2Bucket, workerUrl: string) {
    this.bucket = bucket
    this.publicUrl = `${workerUrl}/storage`
  }

  async uploadAvatar(userId: string, file: ArrayBuffer, contentType: string): Promise<string> {
    const extension = contentType.split('/')[1] ?? 'jpg'
    const key = `avatars/${userId}.${extension}`
    await this.bucket.put(key, file, {
      httpMetadata: { contentType },
      customMetadata: { userId },
    })
    return `${this.publicUrl}/${key}`
  }

  async getObject(key: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(key)
  }

  async deleteAvatar(userId: string): Promise<void> {
    // Delete all potential avatar extensions
    await Promise.allSettled([
      this.bucket.delete(`avatars/${userId}.jpg`),
      this.bucket.delete(`avatars/${userId}.jpeg`),
      this.bucket.delete(`avatars/${userId}.png`),
      this.bucket.delete(`avatars/${userId}.webp`),
    ])
  }
}

// Type for R2ObjectBody
type R2ObjectBody = {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}
