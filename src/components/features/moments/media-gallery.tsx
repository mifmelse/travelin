'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import type { PostMediaView } from '@/services/post.service'
import { FEED_VISIBLE_MEDIA } from './media-meta'
import { MediaLightbox } from './media-lightbox'

function Tile({ item, overlay }: { item: PostMediaView; overlay?: number }) {
  const src = (item.media_type === 'video' ? item.thumbnail_url : item.url) ?? ''
  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      {item.media_type === 'video' && !overlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="h-5 w-5" />
          </span>
        </div>
      )}
      {overlay ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-semibold text-white">
          +{overlay}
        </div>
      ) : null}
    </div>
  )
}

export function MediaGallery({ media }: { media: PostMediaView[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  if (media.length === 0) return null

  const visible = media.slice(0, FEED_VISIBLE_MEDIA)
  const hidden = media.length - visible.length

  // Grid columns scale with count; rows are fixed-height tiles.
  const cols = visible.length === 1 ? 1 : visible.length === 2 ? 2 : 3

  return (
    <>
      <div
        className="grid gap-[3px] overflow-hidden rounded-lg"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {visible.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setLightbox(i)}
            className={`relative ${visible.length === 1 ? 'h-72' : 'h-40'}`}
          >
            <Tile item={m} overlay={i === visible.length - 1 && hidden > 0 ? hidden : undefined} />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <MediaLightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}
