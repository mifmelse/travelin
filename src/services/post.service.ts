import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { assertTripMember, assertTripEditor, assertTripOwner } from '@/services/trip.service'
import {
  uploadTripMedia,
  uploadTripThumbnail,
  createSignedMediaUrl,
  deleteTripMedia,
  validateMediaFile,
  MEDIA_LIMITS,
  type MediaType,
} from '@/lib/storage'

// =========================================
// SCHEMAS / TYPES
// =========================================

const postBaseSchema = z.object({
  body: z.string().max(2000, 'Caption maksimal 2000 karakter').optional().or(z.literal('')),
  location_name: z.string().max(120, 'Lokasi maksimal 120 karakter').optional().or(z.literal('')),
  // Count of media files in this submission; set by the server action.
  media_count: z.coerce.number().int().nonnegative(),
})

// A post must carry a caption OR at least one media item. Standalone refine
// because Zod v4 `.partial()` does not chain `.refine()` (AGENTS.md §8).
const nonEmptyRefine = (d: { body?: string; media_count?: number }) =>
  Boolean(d.body && d.body.trim()) || (d.media_count ?? 0) > 0
const nonEmptyError = { message: 'Tulis sesuatu atau lampirkan media', path: ['body'] }

export const createPostSchema = postBaseSchema.refine(nonEmptyRefine, nonEmptyError)
// Non-emptiness on update is enforced in `updatePost` against EXISTING + new
// media (a photo-only post legitimately has no body), so no schema refine here.
export const updatePostSchema = postBaseSchema

export const commentSchema = z.object({
  body: z.string().min(1, 'Komentar tidak boleh kosong').max(1000, 'Komentar maksimal 1000 karakter'),
  parent_comment_id: z.string().uuid().optional().or(z.literal('')),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type CommentInput = z.infer<typeof commentSchema>

/** A media file plus its optional client-generated video poster. */
export type MediaUpload = { file: File; thumbnail?: File }

export type PostMediaView = {
  id: string
  media_type: MediaType
  url: string | null
  thumbnail_url: string | null
  position: number
}

export type PostCommentView = {
  id: string
  author_id: string
  parent_comment_id: string | null
  body: string
  created_at: string
  author_name: string
  author_avatar: string | null
}

export type PostView = {
  id: string
  trip_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  body: string | null
  location_name: string | null
  created_at: string
  media: PostMediaView[]
  like_count: number
  liked_by_me: boolean
  comments: PostCommentView[]
}

// =========================================
// INTERNAL HELPERS
// =========================================

async function getPostTripId(
  supabase: SupabaseClient<Database>,
  postId: string
): Promise<string | null> {
  const { data } = await supabase.from('posts').select('trip_id').eq('id', postId).maybeSingle()
  return data?.trip_id ?? null
}

/** Allowed if the caller authored the post OR owns the trip (moderation). */
async function assertPostAuthorOrTripOwner(
  supabase: SupabaseClient<Database>,
  postId: string,
  userId: string
): Promise<{ tripId: string }> {
  const { data } = await supabase
    .from('posts')
    .select('trip_id, author_id')
    .eq('id', postId)
    .maybeSingle()
  if (!data) throw new Error('Post not found or access denied')
  if (data.author_id !== userId) {
    await assertTripOwner(supabase, data.trip_id, userId)
  }
  return { tripId: data.trip_id }
}

/** Allowed if the caller authored the comment OR owns the trip (moderation). */
async function assertCommentAuthorOrTripOwner(
  supabase: SupabaseClient<Database>,
  commentId: string,
  userId: string
): Promise<{ tripId: string; postId: string }> {
  const { data } = await supabase
    .from('post_comments')
    .select('author_id, post_id, posts(trip_id)')
    .eq('id', commentId)
    .maybeSingle()
  if (!data) throw new Error('Comment not found or access denied')
  const posts = Array.isArray(data.posts) ? data.posts[0] : data.posts
  const tripId = posts?.trip_id
  if (!tripId) throw new Error('Comment not found or access denied')
  if (data.author_id !== userId) {
    await assertTripOwner(supabase, tripId, userId)
  }
  return { tripId, postId: data.post_id }
}

/** Validate count + each file's type/size. Throws on the first problem. */
function assertValidMedia(media: MediaUpload[]) {
  if (media.length > MEDIA_LIMITS.maxPerPost) {
    throw new Error(`Maksimal ${MEDIA_LIMITS.maxPerPost} media per post`)
  }
  for (const m of media) {
    const err = validateMediaFile({ type: m.file.type, size: m.file.size })
    if (err) throw new Error(err)
  }
}

// =========================================
// QUERIES
// =========================================

/**
 * List a trip's posts with media (signed URLs), like state, and comments.
 * Requires trip membership. Ordered newest-first by post time.
 */
export async function listPostsForTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string
): Promise<PostView[]> {
  await assertTripMember(supabase, tripId, userId)

  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, trip_id, author_id, body, location_name, created_at,
       author:profiles!posts_author_id_fkey(display_name, avatar_url),
       post_media(id, media_type, storage_path, thumbnail_path, position),
       post_reactions(profile_id),
       post_comments(id, author_id, parent_comment_id, body, created_at,
         author:profiles!post_comments_author_id_fkey(display_name, avatar_url))`
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list posts: ${error.message}`)

  const rows = data ?? []
  const result: PostView[] = []
  for (const row of rows) {
    const author = Array.isArray(row.author) ? row.author[0] : row.author
    const mediaRows = [...(row.post_media ?? [])].sort((a, b) => a.position - b.position)
    const media: PostMediaView[] = await Promise.all(
      mediaRows.map(async (m) => ({
        id: m.id,
        media_type: m.media_type,
        position: m.position,
        url: await createSignedMediaUrl(supabase, m.storage_path),
        thumbnail_url: m.thumbnail_path
          ? await createSignedMediaUrl(supabase, m.thumbnail_path)
          : null,
      }))
    )
    const reactions = row.post_reactions ?? []
    const comments: PostCommentView[] = [...(row.post_comments ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => {
        const ca = Array.isArray(c.author) ? c.author[0] : c.author
        return {
          id: c.id,
          author_id: c.author_id,
          parent_comment_id: c.parent_comment_id,
          body: c.body,
          created_at: c.created_at,
          author_name: ca?.display_name ?? 'Traveler',
          author_avatar: ca?.avatar_url ?? null,
        }
      })
    result.push({
      id: row.id,
      trip_id: row.trip_id,
      author_id: row.author_id,
      author_name: author?.display_name ?? 'Traveler',
      author_avatar: author?.avatar_url ?? null,
      body: row.body,
      location_name: row.location_name,
      created_at: row.created_at,
      media,
      like_count: reactions.length,
      liked_by_me: reactions.some((r) => r.profile_id === userId),
      comments,
    })
  }
  return result
}

// =========================================
// MUTATIONS
// =========================================

/**
 * Create a post and upload its media atomically. Requires owner/editor.
 * On any media failure, the post row and already-uploaded files are removed.
 */
export async function createPost(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  input: CreatePostInput,
  media: MediaUpload[]
) {
  await assertTripEditor(supabase, tripId, userId)
  assertValidMedia(media)

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      trip_id: tripId,
      author_id: userId,
      body: input.body || null,
      location_name: input.location_name || null,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create post: ${error.message}`)

  const uploadedPaths: string[] = []
  try {
    const mediaRows: Database['public']['Tables']['post_media']['Insert'][] = []
    for (let i = 0; i < media.length; i++) {
      const { storagePath, mediaType } = await uploadTripMedia(supabase, {
        tripId,
        postId: post.id,
        file: media[i].file,
      })
      uploadedPaths.push(storagePath)
      let thumbnailPath: string | null = null
      if (mediaType === 'video' && media[i].thumbnail) {
        thumbnailPath = await uploadTripThumbnail(supabase, {
          tripId,
          postId: post.id,
          file: media[i].thumbnail as File,
        })
        uploadedPaths.push(thumbnailPath)
      }
      mediaRows.push({
        post_id: post.id,
        media_type: mediaType,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        position: i,
      })
    }
    if (mediaRows.length > 0) {
      const { error: mErr } = await supabase.from('post_media').insert(mediaRows)
      if (mErr) throw new Error(mErr.message)
    }
  } catch (err) {
    // Rollback: remove uploaded files then the post (cascades media rows).
    await deleteTripMedia(supabase, uploadedPaths)
    await supabase.from('posts').delete().eq('id', post.id)
    throw new Error(`Failed to attach media: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  return post
}

/**
 * Update a post's caption/location, and optionally append media. Requires the
 * post author or the trip owner. (Removing individual media is out of v1 scope;
 * editing text is the common case.)
 */
export async function updatePost(
  supabase: SupabaseClient<Database>,
  postId: string,
  userId: string,
  input: UpdatePostInput,
  newMedia: MediaUpload[] = []
) {
  const { tripId } = await assertPostAuthorOrTripOwner(supabase, postId, userId)
  assertValidMedia(newMedia)

  // A post must still have a caption OR at least one media item after editing.
  // Count existing media (the edit form does not resend existing files) plus any
  // newly appended media — a photo-only post legitimately has an empty body.
  const { count: existingMedia } = await supabase
    .from('post_media')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
  if (!(input.body && input.body.trim()) && (existingMedia ?? 0) + newMedia.length === 0) {
    throw new Error('Tulis sesuatu atau lampirkan media')
  }

  const { error } = await supabase
    .from('posts')
    .update({
      body: input.body || null,
      location_name: input.location_name || null,
    })
    .eq('id', postId)
  if (error) throw new Error(`Failed to update post: ${error.message}`)

  // NOTE: unlike createPost, appended media is not rolled back on a mid-loop
  // failure — leftover files/rows are harmless (append-only, no corruption).
  if (newMedia.length > 0) {
    const { count } = await supabase
      .from('post_media')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
    let position = count ?? 0
    for (const m of newMedia) {
      const { storagePath, mediaType } = await uploadTripMedia(supabase, {
        tripId,
        postId,
        file: m.file,
      })
      let thumbnailPath: string | null = null
      if (mediaType === 'video' && m.thumbnail) {
        thumbnailPath = await uploadTripThumbnail(supabase, { tripId, postId, file: m.thumbnail })
      }
      await supabase.from('post_media').insert({
        post_id: postId,
        media_type: mediaType,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        position: position++,
      })
    }
  }
}

/**
 * Delete a post: remove its Storage files FIRST, then the row (cascade removes
 * media/reactions/comments). Requires the post author or the trip owner.
 */
export async function deletePost(
  supabase: SupabaseClient<Database>,
  postId: string,
  userId: string
) {
  await assertPostAuthorOrTripOwner(supabase, postId, userId)

  const { data: mediaRows } = await supabase
    .from('post_media')
    .select('storage_path, thumbnail_path')
    .eq('post_id', postId)
  const paths = (mediaRows ?? []).flatMap((m) =>
    [m.storage_path, m.thumbnail_path].filter((p): p is string => Boolean(p))
  )
  await deleteTripMedia(supabase, paths)

  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw new Error(`Failed to delete post: ${error.message}`)
}

/** Toggle the caller's like on a post. Requires owner/editor. Returns new state. */
export async function toggleReaction(
  supabase: SupabaseClient<Database>,
  postId: string,
  userId: string
): Promise<{ liked: boolean }> {
  const tripId = await getPostTripId(supabase, postId)
  if (!tripId) throw new Error('Post not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('profile_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('post_reactions').delete().eq('id', existing.id)
    if (error) throw new Error(`Failed to unlike: ${error.message}`)
    return { liked: false }
  }
  const { error } = await supabase
    .from('post_reactions')
    .insert({ post_id: postId, profile_id: userId })
  // A concurrent/double like can collide on the unique (post_id, profile_id)
  // constraint — that just means it's already liked, not a real failure.
  if (error && error.code !== '23505') throw new Error(`Failed to like: ${error.message}`)
  return { liked: true }
}

/**
 * Add a comment (or a reply). Requires owner/editor. Replies are flattened: a
 * parent that is itself a reply is resolved to its top-level ancestor, so the
 * DB never stores a thread deeper than one level.
 */
export async function addComment(
  supabase: SupabaseClient<Database>,
  postId: string,
  userId: string,
  input: CommentInput
) {
  const tripId = await getPostTripId(supabase, postId)
  if (!tripId) throw new Error('Post not found or access denied')
  await assertTripEditor(supabase, tripId, userId)

  let parentId: string | null = input.parent_comment_id || null
  if (parentId) {
    const { data: parent } = await supabase
      .from('post_comments')
      .select('id, post_id, parent_comment_id')
      .eq('id', parentId)
      .maybeSingle()
    if (!parent || parent.post_id !== postId) {
      throw new Error('Komentar induk tidak valid')
    }
    // Flatten: if the parent is a reply, attach to its top-level ancestor.
    parentId = parent.parent_comment_id ?? parent.id
  }

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_id: userId, parent_comment_id: parentId, body: input.body })
    .select()
    .single()
  if (error) throw new Error(`Failed to add comment: ${error.message}`)
  return data
}

/** Delete a comment. Requires the comment author or the trip owner. */
export async function deleteComment(
  supabase: SupabaseClient<Database>,
  commentId: string,
  userId: string
) {
  await assertCommentAuthorOrTripOwner(supabase, commentId, userId)
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  if (error) throw new Error(`Failed to delete comment: ${error.message}`)
}
