'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createPost,
  updatePost,
  deletePost,
  toggleReaction,
  addComment,
  deleteComment,
  createPostSchema,
  updatePostSchema,
  commentSchema,
  type MediaUpload,
} from '@/services/post.service'

export type ActionState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// Media files arrive as repeated `media` fields; each video's poster (if any)
// arrives as `thumb_<index>` keyed to the media index.
function collectMedia(formData: FormData): MediaUpload[] {
  const files = formData.getAll('media').filter((f): f is File => f instanceof File && f.size > 0)
  return files.map((file, i) => {
    const thumb = formData.get(`thumb_${i}`)
    return { file, thumbnail: thumb instanceof File && thumb.size > 0 ? thumb : undefined }
  })
}

export async function createPostAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const media = collectMedia(formData)
  const parsed = createPostSchema.safeParse({
    body: formData.get('body'),
    location_name: formData.get('location_name'),
    media_count: media.length,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await createPost(supabase, tripId, user.id, parsed.data, media)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}

export async function updatePostAction(
  tripId: string,
  postId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const media = collectMedia(formData)
  const parsed = updatePostSchema.safeParse({
    body: formData.get('body'),
    location_name: formData.get('location_name'),
    media_count: media.length,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await updatePost(supabase, postId, user.id, parsed.data, media)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}

export async function deletePostAction(tripId: string, postId: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  try {
    await deletePost(supabase, postId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}

export async function toggleReactionAction(tripId: string, postId: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  try {
    await toggleReaction(supabase, postId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}

export async function addCommentAction(
  tripId: string,
  postId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = commentSchema.safeParse({
    body: formData.get('body'),
    parent_comment_id: formData.get('parent_comment_id') ?? undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  try {
    await addComment(supabase, postId, user.id, parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}

export async function deleteCommentAction(
  tripId: string,
  commentId: string
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  try {
    await deleteComment(supabase, commentId, user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
  revalidatePath(`/trips/${tripId}/moments`)
  return { success: true }
}
