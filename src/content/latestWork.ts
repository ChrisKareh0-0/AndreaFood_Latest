export type LatestWorkPost = {
  id: number
  title: string
  excerpt: string
  imageUrl: string
}

export const defaultLatestWorkPosts: LatestWorkPost[] = [
  {
    id: 1,
    title: 'New campaign highlights',
    excerpt:
      "A quick look at a recent food styling set, focusing on texture, light, and storytelling through color.",
    imageUrl: ''
  },
  {
    id: 2,
    title: 'Behind the scenes',
    excerpt:
      'From prop selection to final plating — a short behind-the-scenes recap of the process and creative choices.',
    imageUrl: ''
  }
]

const STORAGE_KEY = 'latestWorkPosts'

export function loadLatestWorkPosts(): LatestWorkPost[] {
  if (typeof window === 'undefined') return defaultLatestWorkPosts

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultLatestWorkPosts

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return defaultLatestWorkPosts

    return parsed
      .filter((p) => p && typeof p === 'object')
      .map((p, idx) => {
        const rec = p as Record<string, unknown>
        return {
          id: typeof rec.id === 'number' ? rec.id : Date.now() + idx,
          title: typeof rec.title === 'string' ? rec.title : '',
          excerpt: typeof rec.excerpt === 'string' ? rec.excerpt : '',
          imageUrl: typeof rec.imageUrl === 'string' ? rec.imageUrl : ''
        }
      })
  } catch {
    return defaultLatestWorkPosts
  }
}

export function saveLatestWorkPosts(posts: LatestWorkPost[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}
