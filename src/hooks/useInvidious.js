import { useQuery } from '@tanstack/react-query';
import { getTrending, searchVideos, getVideo, getChannel, getChannelVideos, getPlaylist, getComments, fetchInstances, checkHealth } from '../lib/invidious.js';

export function useTrending(region = 'US') {
  return useQuery({
    queryKey: ['trending', region],
    queryFn: () => getTrending(region),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearch(query, page = 1, sortBy = 'relevance', type = 'video', duration = '', features = '', region = 'US') {
  return useQuery({
    queryKey: ['search', query, page, sortBy, type, duration, features, region],
    queryFn: () => searchVideos(query, page, sortBy, type, duration, features, region),
    enabled: !!query,
    staleTime: 2 * 60 * 1000,
  });
}

export function useVideo(id) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => getVideo(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useVideoWithFallback(id, fallbackUrl) {
  const primary = useQuery({
    queryKey: ['video', id],
    queryFn: () => getVideo(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // If primary failed, try fallback instance
  const fallback = useQuery({
    queryKey: ['video-fallback', id, fallbackUrl],
    queryFn: async () => {
      const { getVideo } = await import('../lib/invidious.js');
      return getVideo(id);
    },
    enabled: !!id && !!fallbackUrl && !!primary.error,
    staleTime: 5 * 60 * 1000,
  });

  // Return primary data if successful, otherwise fallback data
  if (primary.data) return { data: primary.data, isLoading: false, error: null, isFallback: false };
  if (fallback.data) return { data: fallback.data, isLoading: false, error: null, isFallback: true };
  if (primary.isLoading) return { data: null, isLoading: true, error: null, isFallback: false };
  if (fallback.isLoading) return { data: null, isLoading: true, error: null, isFallback: true };
  return { data: null, isLoading: false, error: primary.error || fallback.error, isFallback: false };
}

export function useChannel(id) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: () => getChannel(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useChannelVideos(id, sortBy = 'newest', page = 1) {
  return useQuery({
    queryKey: ['channelVideos', id, sortBy, page],
    queryFn: () => getChannelVideos(id, sortBy, page),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlaylist(id) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylist(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useComments(videoId, continuation = null) {
  return useQuery({
    queryKey: ['comments', videoId, continuation],
    queryFn: () => getComments(videoId, continuation),
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstances() {
  return useQuery({
    queryKey: ['instances'],
    queryFn: fetchInstances,
    staleTime: 30 * 60 * 1000,
  });
}

export function useHealthCheck(url) {
  return useQuery({
    queryKey: ['health', url],
    queryFn: () => checkHealth(url),
    enabled: !!url,
    retry: 1,
    staleTime: 60 * 1000,
  });
}
