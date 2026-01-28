import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SonioxToken {
  token: string;
  expiresAt: number;
}

interface TranscriptWord {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
}

interface UseSonioxStreamOptions {
  languageHints?: string[];
  enableSpeakerDiarization?: boolean;
  onTranscript?: (words: TranscriptWord[], isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: StreamStatus) => void;
  // Beta test limits
  maxSessionSeconds?: number; // Max duration per session (default: 10 minutes)
  maxDailySeconds?: number;   // Max daily usage (default: 30 minutes)
  onLimitWarning?: (type: 'session' | 'daily', remainingSeconds: number) => void;
  onLimitReached?: (type: 'session' | 'daily') => void;
}

// Beta test configuration
const BETA_LIMITS = {
  MAX_SESSION_SECONDS: 10 * 60,  // 10 minutes per session
  MAX_DAILY_SECONDS: 30 * 60,    // 30 minutes per day
  WARNING_THRESHOLD_SECONDS: 2 * 60, // Warn 2 minutes before limit
};

// Local storage key for daily usage tracking
const DAILY_USAGE_KEY = 'voicely_live_assistant_daily_usage';

type StreamStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'stopped';

const SONIOX_WS_URL = 'wss://api.soniox.com/transcribe-websocket';

// Helper to get/set daily usage from localStorage
function getDailyUsage(): { date: string; seconds: number } {
  try {
    const stored = localStorage.getItem(DAILY_USAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const today = new Date().toDateString();
      if (data.date === today) {
        return data;
      }
    }
  } catch (e) {
    console.error('Failed to read daily usage:', e);
  }
  return { date: new Date().toDateString(), seconds: 0 };
}

function setDailyUsage(seconds: number): void {
  try {
    localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify({
      date: new Date().toDateString(),
      seconds,
    }));
  } catch (e) {
    console.error('Failed to save daily usage:', e);
  }
}

export function useSonioxStream(options: UseSonioxStreamOptions = {}) {
  const {
    languageHints = ['he', 'en'],
    enableSpeakerDiarization = true,
    onTranscript,
    onError,
    onStatusChange,
    maxSessionSeconds = BETA_LIMITS.MAX_SESSION_SECONDS,
    maxDailySeconds = BETA_LIMITS.MAX_DAILY_SECONDS,
    onLimitWarning,
    onLimitReached,
  } = options;

  const [status, setStatus] = useState<StreamStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>(''); // Text being spoken now
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [dailyUsedSeconds, setDailyUsedSeconds] = useState(() => getDailyUsage().seconds);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTriggeredRef = useRef<{ session: boolean; daily: boolean }>({ session: false, daily: false });

  const updateStatus = useCallback((newStatus: StreamStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Check and enforce limits
  const checkLimits = useCallback((currentSessionSecs: number, currentDailySecs: number) => {
    const sessionRemaining = maxSessionSeconds - currentSessionSecs;
    const dailyRemaining = maxDailySeconds - currentDailySecs;

    // Check session limit warning
    if (!warningTriggeredRef.current.session && sessionRemaining <= BETA_LIMITS.WARNING_THRESHOLD_SECONDS && sessionRemaining > 0) {
      warningTriggeredRef.current.session = true;
      onLimitWarning?.('session', sessionRemaining);
    }

    // Check daily limit warning
    if (!warningTriggeredRef.current.daily && dailyRemaining <= BETA_LIMITS.WARNING_THRESHOLD_SECONDS && dailyRemaining > 0) {
      warningTriggeredRef.current.daily = true;
      onLimitWarning?.('daily', dailyRemaining);
    }

    // Check if limits reached
    if (currentSessionSecs >= maxSessionSeconds) {
      onLimitReached?.('session');
      return 'session';
    }
    if (currentDailySecs >= maxDailySeconds) {
      onLimitReached?.('daily');
      return 'daily';
    }
    return null;
  }, [maxSessionSeconds, maxDailySeconds, onLimitWarning, onLimitReached]);

  // Start session timer
  const startSessionTimer = useCallback(() => {
    warningTriggeredRef.current = { session: false, daily: false };
    setSessionSeconds(0);

    sessionTimerRef.current = setInterval(() => {
      setSessionSeconds(prev => {
        const newSessionSecs = prev + 1;
        const newDailySecs = dailyUsedSeconds + newSessionSecs;

        // Update daily usage in localStorage
        setDailyUsage(newDailySecs);
        setDailyUsedSeconds(newDailySecs);

        // Check limits
        const limitReached = checkLimits(newSessionSecs, newDailySecs);
        if (limitReached) {
          // Will trigger stop via effect
        }

        return newSessionSecs;
      });
    }, 1000);
  }, [dailyUsedSeconds, checkLimits]);

  // Stop session timer
  const stopSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  // Auto-stop when limits reached
  useEffect(() => {
    if (status === 'streaming') {
      const limitReached = checkLimits(sessionSeconds, dailyUsedSeconds);
      if (limitReached) {
        stop();
      }
    }
  }, [sessionSeconds, dailyUsedSeconds, status, checkLimits]);

  // Get temporary token from our Edge Function
  const getToken = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('soniox-token');

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to get Soniox token');
      }

      if (!data?.token) {
        throw new Error('No token received from server');
      }

      return data.token;
    } catch (error) {
      console.error('Token fetch error:', error);
      throw error;
    }
  }, []);

  // Convert Float32Array to Int16Array (PCM)
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }, []);

  // Downsample audio to 16kHz
  const downsampleBuffer = useCallback((
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }
    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = Math.round(i * ratio);
      result[i] = buffer[index];
    }
    return result;
  }, []);

  // Start streaming
  const start = useCallback(async () => {
    try {
      // Check if daily limit already reached
      const currentDaily = getDailyUsage().seconds;
      if (currentDaily >= maxDailySeconds) {
        onLimitReached?.('daily');
        onError?.('הגעת למגבלת השימוש היומית (30 דקות). נסה שוב מחר.');
        return;
      }

      updateStatus('connecting');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Get Soniox token
      const token = await getToken();
      console.log('[Soniox] Got token:', token ? `${token.slice(0, 10)}...` : 'MISSING');

      // Create WebSocket connection
      console.log('[Soniox] Connecting to:', SONIOX_WS_URL);
      const ws = new WebSocket(SONIOX_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        updateStatus('connected');
        console.log('[Soniox] WebSocket connected, sending config...');

        // Send configuration per Soniox API docs
        // See: https://soniox.com/docs/stt/api-reference/websocket-api
        const config = {
          api_key: token,
          model: 'stt-rt-preview',
          language_hints: languageHints,
          enable_streaming_speaker_diarization: enableSpeakerDiarization,
          include_nonfinal: true, // Get interim results
          speech_context: {
            entries: [
              { phrases: ['שירה', 'קול', 'נשימה', 'תמיכה', 'רזוננס', 'טווח', 'גבוה', 'נמוך'] }
            ]
          }
        };
        console.log('[Soniox] Config:', config);
        ws.send(JSON.stringify(config));

        // Start audio processing
        const audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        let audioChunkCount = 0;
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(inputData, 48000, 16000);
            const pcmData = floatTo16BitPCM(downsampled);
            ws.send(pcmData);
            audioChunkCount++;
            if (audioChunkCount % 50 === 0) {
              console.log('[Soniox] Audio chunks sent:', audioChunkCount);
            }
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Start session timer for limit tracking
        startSessionTimer();
        updateStatus('streaming');
      };

      ws.onmessage = (event) => {
        console.log('[Soniox] Raw message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('[Soniox] Parsed message:', data);

          if (data.error) {
            console.error('[Soniox] Error in message:', data.error);
            onError?.(data.error);
            updateStatus('error');
            return;
          }

          // Soniox API can return tokens in different formats
          // Check for 'tokens', 'words', or 'result' fields
          const tokens = data.tokens || data.words || data.result?.words || [];

          if (tokens.length > 0) {
            console.log('[Soniox] Tokens received:', tokens.length);
            const words: TranscriptWord[] = tokens.map((token: any) => ({
              text: token.text || token.word || '',
              startTime: (token.start_ms || token.start || 0) / 1000,
              endTime: (token.end_ms || token.end || 0) / 1000,
              confidence: token.confidence || 1,
              isFinal: token.is_final ?? data.is_final ?? false,
              speaker: token.speaker,
            }));

            // Update current speaker
            const lastSpeaker = words[words.length - 1]?.speaker;
            if (lastSpeaker) {
              setCurrentSpeaker(lastSpeaker);
            }

            // Build transcript
            const text = words.map(w => w.text).join('');
            console.log('[Soniox] Text:', text, 'Final:', data.is_final);

            if (data.is_final) {
              // Final result - add to permanent transcript
              setTranscript(prev => prev + text + ' ');
              setInterimText(''); // Clear interim
            } else {
              // Interim result - show what's being spoken now
              setInterimText(text);
            }

            onTranscript?.(words, data.is_final);
          } else if (data.transcript || data.text) {
            // Some APIs return plain text directly
            const text = data.transcript || data.text;
            console.log('[Soniox] Plain text received:', text);
            if (data.is_final) {
              setTranscript(prev => prev + text + ' ');
              setInterimText('');
            } else {
              setInterimText(text);
            }
          }
        } catch (e) {
          console.error('[Soniox] Failed to parse message:', e, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[Soniox] WebSocket error:', error);
        onError?.('WebSocket connection error');
        updateStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[Soniox] WebSocket closed:', event.code, event.reason);
        if (status === 'streaming') {
          updateStatus('stopped');
        }
      };

    } catch (error) {
      console.error('Start streaming error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to start streaming');
      updateStatus('error');
    }
  }, [
    getToken,
    languageHints,
    enableSpeakerDiarization,
    downsampleBuffer,
    floatTo16BitPCM,
    updateStatus,
    onTranscript,
    onError,
    status,
    maxDailySeconds,
    onLimitReached,
    startSessionTimer,
  ]);

  // Stop streaming
  const stop = useCallback(() => {
    // Stop session timer
    stopSessionTimer();

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      // Send empty frame to signal end of audio
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(new ArrayBuffer(0));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    updateStatus('stopped');
  }, [updateStatus, stopSessionTimer]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    transcript,
    interimText, // Text currently being spoken
    currentSpeaker,
    start,
    stop,
    clearTranscript,
    isStreaming: status === 'streaming',
    isConnecting: status === 'connecting',
    // Beta limits info
    sessionSeconds,
    dailyUsedSeconds,
    maxSessionSeconds,
    maxDailySeconds,
    remainingSessionSeconds: Math.max(0, maxSessionSeconds - sessionSeconds),
    remainingDailySeconds: Math.max(0, maxDailySeconds - dailyUsedSeconds),
  };
}
