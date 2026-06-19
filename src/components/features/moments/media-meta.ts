import { MEDIA_LIMITS } from '@/lib/storage'

// How many tiles the feed shows before collapsing the rest behind a "+N" overlay.
export const FEED_VISIBLE_MEDIA = 5

export const ACCEPTED_MEDIA = 'image/*,video/*'

export const MEDIA_HINT = `Maks ${MEDIA_LIMITS.maxPerPost} media — foto ≤${Math.round(
  MEDIA_LIMITS.maxImageBytes / (1024 * 1024)
)}MB, video ≤${Math.round(MEDIA_LIMITS.maxVideoBytes / (1024 * 1024))}MB`
