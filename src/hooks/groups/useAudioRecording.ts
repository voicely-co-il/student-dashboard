import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGroupStudent } from './useGroupStudent';
import { ExerciseRecording, AnalysisStatus } from '@/types/groups';

// =====================================================
// TYPES
// =====================================================

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export interface UseAudioRecordingOptions {
  maxDuration?: number; // seconds
  onRecordingComplete?: (result: RecordingResult) => void;
  onError?: (error: Error) => void;
}

// =====================================================
// HOOK: useAudioRecording
// Complete audio recording with Web Audio API
// =====================================================

export function useAudioRecording(options: UseAudioRecordingOptions = {}) {
  const { maxDuration = 90, onRecordingComplete, onError } = options;
  const { student } = useGroupStudent();
  const queryClient = useQueryClient();

  // State
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  }, []);

  // Check/request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (err) {
      setHasPermission(false);
      const error = err as Error;
      setState(prev => ({ ...prev, error: 'נדרשת הרשאה למיקרופון' }));
      onError?.(error);
      return false;
    }
  }, [onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      setHasPermission(true);

      // Setup audio context for level metering
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

        const result: RecordingResult = { blob, url, duration };
        setRecordingResult(result);
        onRecordingComplete?.(result);
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }));

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (!analyserRef.current || !state.isRecording) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));

        setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

    } catch (err) {
      const error = err as Error;
      setHasPermission(false);
      setState(prev => ({
        ...prev,
        error: 'לא ניתן לגשת למיקרופון',
        isRecording: false,
      }));
      onError?.(error);
      cleanup();
    }
  }, [maxDuration, onRecordingComplete, onError, cleanup]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        audioLevel: 0,
      }));
      cleanup();
    }
  }, [state.isRecording, cleanup]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [state.isRecording, state.isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));

      // Resume timer
      const pausedDuration = state.duration;
      const resumeTime = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = pausedDuration + Math.round((Date.now() - resumeTime) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));

        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    }
  }, [state.isPaused, state.duration, maxDuration, stopRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (state.isRecording) {
      cleanup();
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
        error: null,
      });
      setRecordingResult(null);
    }
  }, [state.isRecording, cleanup]);

  // Clear result
  const clearResult = useCallback(() => {
    if (recordingResult?.url) {
      URL.revokeObjectURL(recordingResult.url);
    }
    setRecordingResult(null);
  }, [recordingResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (recordingResult?.url) {
        URL.revokeObjectURL(recordingResult.url);
      }
    };
  }, [cleanup, recordingResult?.url]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      exerciseId,
      dailyPlanId,
      blob,
      duration,
    }: {
      exerciseId: string;
      dailyPlanId?: string;
      blob: Blob;
      duration: number;
    }) => {
      if (!student?.id) throw new Error('Student not found');

      const timestamp = Date.now();
      const filename = `${student.id}/${exerciseId}/${timestamp}.webm`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('voicely-group-recordings')
        .upload(filename, blob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voicely-group-recordings')
        .getPublicUrl(filename);

      // Create recording record
      const { data: recording, error: dbError } = await supabase
        .from('exercise_recordings')
        .insert({
          student_id: student.id,
          exercise_id: exerciseId,
          daily_plan_id: dailyPlanId,
          audio_url: urlData.publicUrl,
          audio_format: 'webm',
          duration_seconds: duration,
          file_size_bytes: blob.size,
          analysis_status: 'queued' as AnalysisStatus,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger AI analysis (async - don't wait)
      supabase.functions.invoke('analyze-recording', {
        body: { recording_id: recording.id },
      }).catch(console.error);

      return recording as ExerciseRecording;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-recordings'] });
    },
  });

  return {
    // State
    ...state,
    hasPermission,
    recordingResult,

    // Actions
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearResult,

    // Upload
    uploadRecording: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // Derived
    canRecord: hasPermission !== false,
    timeRemaining: maxDuration - state.duration,
  };
}

// =====================================================
// HOOK: useAudioPlayback
// Simple audio playback with controls
// =====================================================

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);

  const loadAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(url);
    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current?.duration || 0);
    };
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);

      const updateTime = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animationRef.current = requestAnimationFrame(updateTime);
      };
      updateTime();
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    loadAudio,
    play,
    pause,
    toggle,
    seek,
    stop,
    progress: duration > 0 ? (currentTime / duration) * 100 : 0,
  };
}

export default useAudioRecording;
