import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: APP_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/map`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${APP_URL}/file`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${APP_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
