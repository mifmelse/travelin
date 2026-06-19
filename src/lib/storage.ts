import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const TRIP_MEDIA_BUCKET = 'trip-media'
export const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

export const MEDIA_LIMITS = {
  maxImageBytes: 10 * 1024 * 1024, // 10 MB
  maxVideoBytes: 100 * 1024 * 1024, // 100 MB
  maxPerPost: 10,
} as const

export type MediaType = Database['public']['Enums']['post_media_type']

/** Maps a MIME type to our media enum, or null if unsupported. Pure. */
export function mediaTypeForMime(mime: string): MediaType | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

/** Returns an error message if the file is invalid, else null. Pure. */
export function validateMediaFile(file: { type: string; size: number }): string | null {
  const kind = mediaTypeForMime(file.type)
  if (!kind) return 'Tipe file tidak didukung (hanya foto atau video)'
  const limit = kind === 'image' ? MEDIA_LIMITS.maxImageBytes : MEDIA_LIMITS.maxVideoBytes
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return `Ukuran ${kind === 'image' ? 'foto' : 'video'} maksimal ${mb}MB`
  }
  return null
}

/** Builds the canonical storage path. Pure (caller supplies the random id). */
export function buildMediaPath(
  tripId: string,
  postId: string,
  fileId: string,
  ext: string
): string {
  return `trips/${tripId}/posts/${postId}/${fileId}.${ext}`
}

function extFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : 'bin'
}

/**
 * Upload one media file to the trip-media bucket. Returns its storage path and
 * media type. Throws on failure. This is the ONLY place that talks to Storage.
 */
export async function uploadTripMedia(
  supabase: SupabaseClient<Database>,
  args: { tripId: string; postId: string; file: File }
): Promise<{ storagePath: string; mediaType: MediaType }> {
  const mediaType = mediaTypeForMime(args.file.type)
  if (!mediaType) throw new Error('Tipe file tidak didukung')
  const fileId = crypto.randomUUID()
  const path = buildMediaPath(args.tripId, args.postId, fileId, extFromName(args.file.name))
  const { error } = await supabase.storage
    .from(TRIP_MEDIA_BUCKET)
    .upload(path, args.file, { contentType: args.file.type, upsert: false })
  if (error) throw new Error(`Gagal upload media: ${error.message}`)
  return { storagePath: path, mediaType }
}

/** Upload a client-generated video poster image. Returns its path. */
export async function uploadTripThumbnail(
  supabase: SupabaseClient<Database>,
  args: { tripId: string; postId: string; file: File }
): Promise<string> {
  const fileId = crypto.randomUUID()
  const path = buildMediaPath(args.tripId, args.postId, fileId, 'jpg')
  const { error } = await supabase.storage
    .from(TRIP_MEDIA_BUCKET)
    .upload(path, args.file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Gagal upload thumbnail: ${error.message}`)
  return path
}

/** Create a time-limited signed URL for a stored object. Null on failure. */
export async function createSignedMediaUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(TRIP_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

/** Delete objects by path (called when a post is removed). Best-effort. */
export async function deleteTripMedia(
  supabase: SupabaseClient<Database>,
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) return
  await supabase.storage.from(TRIP_MEDIA_BUCKET).remove(storagePaths)
}
