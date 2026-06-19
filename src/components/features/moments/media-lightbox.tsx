'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PostMediaView } from '@/services/post.service'

export function MediaLightbox({
  media,
  startIndex,
  onClose,
}: {
  media: PostMediaView[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const current = media[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, media.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [media.length, onClose])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex justify-between p-4 text-white text-sm">
        <span>
          {index + 1} / {media.length}
        </span>
        <button aria-label="Tutup" onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>
      <div
        className="flex flex-1 items-center justify-center px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {index > 0 && (
          <button aria-label="Sebelumnya" onClick={() => setIndex((i) => i - 1)} className="text-white">
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        <div className="mx-2 flex max-h-[80vh] max-w-3xl flex-1 items-center justify-center">
          {current.media_type === 'video' ? (
            <video src={current.url ?? undefined} controls autoPlay className="max-h-[80vh] rounded-lg" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url ?? ''} alt="" className="max-h-[80vh] rounded-lg object-contain" />
          )}
        </div>
        {index < media.length - 1 && (
          <button aria-label="Berikutnya" onClick={() => setIndex((i) => i + 1)} className="text-white">
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto p-4" onClick={(e) => e.stopPropagation()}>
        {media.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.id}
            src={(m.media_type === 'video' ? m.thumbnail_url : m.url) ?? ''}
            alt=""
            onClick={() => setIndex(i)}
            className={`h-12 w-12 shrink-0 cursor-pointer rounded object-cover ${
              i === index ? 'outline outline-2 outline-sky-400' : 'opacity-60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
