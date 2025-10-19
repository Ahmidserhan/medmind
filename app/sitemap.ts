import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const lastModified = new Date()

  const urls: string[] = [
    '/',
    '/calendar',
    '/assignments',
    '/exams',
    '/clinicals',
    '/collaboration',
    '/glossary-skills',
    '/study-tools',
    '/profile',
    '/dashboard',
  ]

  return urls.map((path) => ({
    url: new URL(path, base).toString(),
    lastModified,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
