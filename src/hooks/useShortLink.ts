import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LinkType = 'student' | 'lesson' | 'recording';

/**
 * Hook to create a new short link
 */
export const useCreateShortLink = () => {
  return useMutation({
    mutationFn: async ({
      type,
      targetId,
      customSlug,
    }: {
      type: LinkType;
      targetId: string;
      customSlug?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_short_link', {
        p_link_type: type,
        p_target_id: targetId,
        p_custom_slug: customSlug ?? null,
      });

      if (error) throw error;
      return data as string;
    },
  });
};

/**
 * Hook to get an existing short link for a target
 */
export const useGetShortLink = (type: LinkType, targetId: string | undefined) => {
  return useQuery({
    queryKey: ['shortLink', type, targetId],
    queryFn: async () => {
      if (!targetId) return null;

      const { data, error } = await supabase.rpc('get_short_link', {
        p_link_type: type,
        p_target_id: targetId,
      });

      if (error) throw error;
      return data as string | null;
    },
    enabled: !!targetId,
  });
};

/**
 * Get the full short URL for a slug
 */
export const getShortUrl = (slug: string, type: LinkType): string => {
  const prefix = type === 'student' ? 's' : type === 'lesson' ? 'l' : 'r';
  const baseUrl = window.location.origin;
  return `${baseUrl}/${prefix}/${slug}`;
};

/**
 * Copy short URL to clipboard
 */
export const copyShortUrl = async (slug: string, type: LinkType): Promise<boolean> => {
  try {
    const url = getShortUrl(slug, type);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};
