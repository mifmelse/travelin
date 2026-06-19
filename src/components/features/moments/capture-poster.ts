/**
 * Grab a poster frame from a local video File via a blob URL (same-origin, no
 * CORS) and return it as a JPEG File. Returns null if capture fails.
 */
export async function captureVideoPoster(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.src = url
    video.currentTime = 0.1
    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        return resolve(null)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          cleanup()
          resolve(blob ? new File([blob], 'poster.jpg', { type: 'image/jpeg' }) : null)
        },
        'image/jpeg',
        0.7
      )
    }
    video.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}
