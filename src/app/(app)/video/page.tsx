'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { t } from '@/lib/i18n/labels';
import { getTitle } from '@/lib/types';
import type { Video } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';

export default function VideoPage() {
  const { selectedModuleId, lang } = useStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadVideos() {
      setLoading(true);
      try {
        // Taksha Video tab always shows the Taksha Workshop orientation library.
        const vids = await api.content.videos('M15-video-library');
        if (!cancelled) setVideos(vids);
      } catch (err) {
        console.error('Failed to load videos:', err);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadVideos();
    return () => { cancelled = true; };
  }, [selectedModuleId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 lg:px-6 py-10">
        <EmptyState
          icon="play"
          title={t('noVideos', lang)}
          description={
            lang === 'bn'
              ? 'এখনও ভিডিও লাইব্রেরিতে কিছু নেই। অ্যাডমিন যোগ করলে এখানে দেখতে পাবে।'
              : lang === 'hi'
              ? 'वीडियो लाइब्रेरी में अभी कुछ नहीं। एडमिन जोड़ेगा तो यहाँ दिखेगा।'
              : "The orientation library is empty right now — videos will appear here as they're added."
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-5">
      <div className="mb-4">
        <Tag tone="muted">
          Video Library · {videos.length} Orientation Videos
        </Tag>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {videos.map((video) => (
          <Card key={video.id} tone="surface" padding="none" className="overflow-hidden">
            {playingId === video.youtube_id ? (
              <div className="aspect-video bg-ink">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1${video.start_seconds ? `&start=${video.start_seconds}` : ''}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={getTitle(video, lang)}
                />
              </div>
            ) : (
              <button
                onClick={() => setPlayingId(video.youtube_id)}
                className="relative w-full aspect-video bg-line group focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                aria-label={`Play ${getTitle(video, lang)}`}
              >
                <img
                  src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                  alt={getTitle(video, lang)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-ink/30 group-hover:bg-ink/40 transition-colors">
                  <div className="w-16 h-16 bg-forest/95 group-hover:bg-forest rounded-full flex items-center justify-center shadow-lg">
                    <Icon name="play" size={26} color="var(--color-cream)" strokeWidth={2} />
                  </div>
                </div>
              </button>
            )}
            <div className="px-4 py-3.5">
              <h3 className="font-serif text-base text-ink leading-snug">{getTitle(video, lang)}</h3>
              {video.duration && (
                <Tag tone="muted" className="mt-1.5">
                  <Icon name="clock" size={11} className="mr-1" />
                  {video.duration}
                </Tag>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
