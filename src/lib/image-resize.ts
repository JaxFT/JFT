// Client-side image downscaling before upload.
//
// The Sri Lanka cover that ships with the site is ~1MB. Phones over
// 4G chew through that on every page load. We can't run sharp on
// Cloudflare Workers, so we cap upload size in the browser instead:
// any image larger than MAX_WIDTH gets rendered into a canvas at that
// width and re-encoded as JPEG at QUALITY. Photos that are already
// small (or already JPEGs under MAX_BYTES) pass through unchanged.
//
// Result: most camera-roll photos land in storage at 150-400 KB
// instead of 2-8 MB, with no perceivable quality loss on cards or
// in-body images.

const MAX_WIDTH = 1600          // px
const MAX_HEIGHT = 2400         // px (vertical photos)
const QUALITY = 0.85            // JPEG quality 0..1
const MAX_BYTES_BYPASS = 300_000 // images already this small pass through

export type ResizeResult = {
  file: File
  resized: boolean
  originalBytes: number
  newBytes: number
}

// Try to resize. On any failure (unsupported format, browser quirk,
// etc.) returns the original file untouched. Safe to call on every
// upload.
export async function resizeImageIfLarge(file: File): Promise<ResizeResult> {
  const originalBytes = file.size

  // Non-images (e.g. PDFs), skip entirely.
  if (!file.type.startsWith('image/')) {
    return { file, resized: false, originalBytes, newBytes: originalBytes }
  }
  // SVGs aren't pixel data, don't touch.
  if (file.type === 'image/svg+xml') {
    return { file, resized: false, originalBytes, newBytes: originalBytes }
  }
  // Already small, pass through. Avoids re-encoding small icons /
  // already-optimised images.
  if (originalBytes <= MAX_BYTES_BYPASS) {
    return { file, resized: false, originalBytes, newBytes: originalBytes }
  }

  try {
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImage(dataUrl)

    // Compute target dimensions, preserving aspect ratio.
    const scale = Math.min(
      1,
      MAX_WIDTH / img.naturalWidth,
      MAX_HEIGHT / img.naturalHeight,
    )
    if (scale >= 1 && originalBytes <= MAX_BYTES_BYPASS * 4) {
      // Image is already within the dimensional cap and isn't enormous.
      // Pass through.
      return { file, resized: false, originalBytes, newBytes: originalBytes }
    }
    const targetW = Math.round(img.naturalWidth * scale)
    const targetH = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return { file, resized: false, originalBytes, newBytes: originalBytes }
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY)
    if (!blob) return { file, resized: false, originalBytes, newBytes: originalBytes }

    // If the re-encoded JPEG is somehow LARGER than the original (rare,
    // possible with already-tiny JPEGs that we mis-judged), keep the original.
    if (blob.size >= originalBytes) {
      return { file, resized: false, originalBytes, newBytes: originalBytes }
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    const newName = `${baseName}.jpg`
    const newFile = new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
    return { file: newFile, resized: true, originalBytes, newBytes: blob.size }
  } catch {
    return { file, resized: false, originalBytes, newBytes: originalBytes }
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality))
}
