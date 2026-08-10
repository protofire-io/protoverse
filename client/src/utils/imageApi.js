export function imageServiceUrl(filename) {
  if (!filename) return null
  return `/api/images/${encodeURIComponent(filename)}`
}

export async function listImages() {
  const res = await fetch('/api/images')
  if (!res.ok) {
    throw new Error(`Image list failed (${res.status})`)
  }
  const data = await res.json()
  return Array.isArray(data.images) ? data.images : []
}

export async function fetchLandingBackdropUrl() {
  const images = await listImages()
  if (!images.length) return null

  const pick =
    images.find((img) => /landing/i.test(img.originalName || '')) ||
    images.find((img) => /universe|proto/i.test(img.originalName || '')) ||
    images[0]

  return imageServiceUrl(pick.filename)
}
