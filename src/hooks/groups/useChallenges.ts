import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  WeeklyChallenge,
  ChallengeEntry,
  ChallengeWithEntries,
  LeaderboardEntry,
  ChallengeComment,
  ChallengeStatus,
} from '@/types/groups';
import { useGroupStudent } from './useGroupStudent';

// =====================================================
// HOOK: useChallenges
// Get challenges for the student's group
// =====================================================

export function useChallenges() {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['challenges', student?.group_id],
    queryFn: async () => {
      if (!student?.group_id) return [];

      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('group_id', student.group_id)
        .in('status', ['active', 'ended'])
        .order('starts_at', { ascending: false });

      if (error) throw error;
      return data as WeeklyChallenge[];
    },
    enabled: !!student?.group_id,
  });
}

// =====================================================
// HOOK: useActiveChallenge
// Get the current active challenge
// =====================================================

export function useActiveChallenge() {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['active-challenge', student?.group_id],
    queryFn: async () => {
      if (!student?.group_id) return null;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('group_id', student.group_id)
        .eq('status', 'active')
        .lte('starts_at', now)
        .gte('ends_at', now)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as WeeklyChallenge | null;
    },
    enabled: !!student?.group_id,
  });
}

// =====================================================
// HOOK: useChallengeDetail
// Get a single challenge with all entries
// =====================================================

export function useChallengeDetail(challengeId: string | undefined) {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;

      // Get challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;

      // Get entries with student info
      const { data: entries, error: entriesError } = await supabase
        .from('challenge_entries')
        .select(`
          *,
          student:group_students(id, student_name, avatar_emoji)
        `)
        .eq('challenge_id', challengeId)
        .eq('is_best_entry', true)
        .order('final_score', { ascending: false, nullsFirst: false });

      if (entriesError) throw entriesError;

      // Find my entry
      const myEntry = entries?.find(e => e.student_id === student?.id);

      // Calculate time remaining
      const endDate = new Date(challenge.ends_at);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      let timeRemaining: string | undefined;

      if (diffMs > 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
          timeRemaining = `${days} ימים ${hours} שעות`;
        } else {
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          timeRemaining = `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
      }

      return {
        ...challenge,
        entries: entries || [],
        myEntry,
        participantsCount: entries?.length || 0,
        timeRemaining,
      } as ChallengeWithEntries;
    },
    enabled: !!challengeId,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}

// =====================================================
// HOOK: useChallengeLeaderboard
// Get leaderboard for a challenge
// =====================================================

export function useChallengeLeaderboard(challengeId: string | undefined) {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['challenge-leaderboard', challengeId],
    queryFn: async () => {
      if (!challengeId || !student?.id) return { leaderboard: [], myRank: null };

      // Get challenge to check leaderboard mode
      const { data: challenge } = await supabase
        .from('weekly_challenges')
        .select('leaderboard_mode')
        .eq('id', challengeId)
        .single();

      // Get all best entries
      const { data: entries, error } = await supabase
        .from('challenge_entries')
        .select(`
          *,
          student:group_students(id, student_name, avatar_emoji, user_id)
        `)
        .eq('challenge_id', challengeId)
        .eq('is_best_entry', true)
        .eq('is_disqualified', false)
        .order('final_score', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Build leaderboard with ranks
      const leaderboard: LeaderboardEntry[] = (entries || []).map((entry, index) => ({
        rank: index + 1,
        student: entry.student,
        entry: entry as ChallengeEntry,
        isCurrentUser: entry.student_id === student.id,
      }));

      // Apply privacy based on leaderboard mode
      const mode = challenge?.leaderboard_mode || 'semi';
      let filteredLeaderboard = leaderboard;

      if (mode === 'private') {
        // Only show current user
        filteredLeaderboard = leaderboard.filter(e => e.isCurrentUser);
      } else if (mode === 'semi') {
        // Show top 3 + current user
        const top3 = leaderboard.slice(0, 3);
        const myEntry = leaderboard.find(e => e.isCurrentUser);
        if (myEntry && !top3.some(e => e.isCurrentUser)) {
          filteredLeaderboard = [...top3, myEntry];
        } else {
          filteredLeaderboard = top3;
        }
      }

      // Find my rank
      const myRank = leaderboard.find(e => e.isCurrentUser)?.rank || null;

      return { leaderboard: filteredLeaderboard, myRank };
    },
    enabled: !!challengeId && !!student?.id,
  });
}

// =====================================================
// HOOK: useMyEntries
// Get all my entries for a challenge
// =====================================================

export function useMyEntries(challengeId: string | undefined) {
  const { student } = useGroupStudent();

  return useQuery({
    queryKey: ['my-entries', challengeId, student?.id],
    queryFn: async () => {
      if (!challengeId || !student?.id) return [];

      const { data, error } = await supabase
        .from('challenge_entries')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChallengeEntry[];
    },
    enabled: !!challengeId && !!student?.id,
  });
}

// =====================================================
// HOOK: useSubmitChallengeEntry
// Submit a new challenge entry
// =====================================================

export function useSubmitChallengeEntry() {
  const { student } = useGroupStudent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      recordingUrl,
      durationSeconds,
    }: {
      challengeId: string;
      recordingUrl: string;
      durationSeconds: number;
    }) => {
      if (!student?.id) throw new Error('Student not found');

      // Get current attempt count
      const { count } = await supabase
        .from('challenge_entries')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('student_id', student.id);

      const attemptNumber = (count || 0) + 1;

      // Check max attempts
      const { data: challenge } = await supabase
        .from('weekly_challenges')
        .select('max_attempts')
        .eq('id', challengeId)
        .single();

      if (challenge && attemptNumber > challenge.max_attempts) {
        throw new Error(`הגעת למקסימום ${challenge.max_attempts} ניסיונות`);
      }

      // Reset previous best entry flag
      await supabase
        .from('challenge_entries')
        .update({ is_best_entry: false })
        .eq('challenge_id', challengeId)
        .eq('student_id', student.id);

      // Create new entry
      const { data: entry, error } = await supabase
        .from('challenge_entries')
        .insert({
          challenge_id: challengeId,
          student_id: student.id,
          recording_url: recordingUrl,
          duration_seconds: durationSeconds,
          attempt_number: attemptNumber,
          participation_bonus: 5, // +5 for participating
          is_best_entry: true, // Mark as best (will update after AI analysis)
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger AI analysis
      supabase.functions.invoke('analyze-challenge-entry', {
        body: { entry_id: entry.id },
      }).catch(console.error);

      return entry as ChallengeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['my-entries', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', variables.challengeId] });
    },
  });
}

// =====================================================
// HOOK: useShareEntry
// Share/unshare a challenge entry
// =====================================================

export function useShareEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      isShared,
    }: {
      entryId: string;
      isShared: boolean;
    }) => {
      const { data, error } = await supabase
        .from('challenge_entries')
        .update({
          is_shared: isShared,
          shared_at: isShared ? new Date().toISOString() : null,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', data.challenge_id] });
    },
  });
}

// =====================================================
// HOOK: useChallengeComments
// Get comments for an entry
// =====================================================

export function useChallengeComments(entryId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-comments', entryId],
    queryFn: async () => {
      if (!entryId) return [];

      const { data, error } = await supabase
        .from('challenge_comments')
        .select(`
          *,
          author:group_students(id, student_name, avatar_emoji)
        `)
        .eq('entry_id', entryId)
        .eq('is_approved', true)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChallengeComment[];
    },
    enabled: !!entryId,
  });
}

// =====================================================
// HOOK: useAddComment
// Add a comment to an entry
// =====================================================

export function useAddComment() {
  const { student } = useGroupStudent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      content,
    }: {
      entryId: string;
      content: string;
    }) => {
      if (!student?.id) throw new Error('Student not found');

      if (content.length > 500) {
        throw new Error('התגובה ארוכה מדי (מקסימום 500 תווים)');
      }

      const { data, error } = await supabase
        .from('challenge_comments')
        .insert({
          entry_id: entryId,
          author_id: student.id,
          content: content.trim(),
          is_approved: false, // Needs teacher approval
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenge-comments', variables.entryId] });
    },
  });
}

// =====================================================
// HOOK: useLikeEntry
// Like/unlike an entry
// =====================================================

export function useLikeEntry() {
  const { student } = useGroupStudent();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      isLiked,
    }: {
      entryId: string;
      isLiked: boolean;
    }) => {
      if (!student?.id) throw new Error('Student not found');

      if (isLiked) {
        // Add like
        const { error } = await supabase
          .from('challenge_likes')
          .insert({
            entry_id: entryId,
            student_id: student.id,
          });

        if (error && error.code !== '23505') throw error; // Ignore duplicate
      } else {
        // Remove like
        const { error } = await supabase
          .from('challenge_likes')
          .delete()
          .eq('entry_id', entryId)
          .eq('student_id', student.id);

        if (error) throw error;
      }

      return { entryId, isLiked };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard'] });
    },
  });
}

// =====================================================
// HOOK: useCreateChallenge (Teacher only)
// Create a new challenge
// =====================================================

export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<WeeklyChallenge> & { group_id: string }) => {
      const { data: challenge, error } = await supabase
        .from('weekly_challenges')
        .insert({
          ...data,
          status: 'draft' as ChallengeStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return challenge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges', data.group_id] });
    },
  });
}

export default useChallenges;
