import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// ANALYZE RECORDING - EDGE FUNCTION
// Uses Gemini to analyze vocal recordings
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  pitch_accuracy: number;
  rhythm_accuracy: number;
  breath_control: number;
  energy_level: number;
  resonance_quality: 'excellent' | 'good' | 'fair' | 'needs_work';
  detected_issues: string[];
  strengths: string[];
  feedback_he: string;
  suggestions: string[];
  overall_score: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json();

    if (!recording_id) {
      throw new Error('recording_id is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: recError } = await supabase
      .from('exercise_recordings')
      .select(`
        *,
        exercise:practice_exercises(*)
      `)
      .eq('id', recording_id)
      .single();

    if (recError || !recording) {
      throw new Error(`Recording not found: ${recError?.message}`);
    }

    // Update status to processing
    await supabase
      .from('exercise_recordings')
      .update({
        analysis_status: 'processing',
        analysis_started_at: new Date().toISOString(),
      })
      .eq('id', recording_id);

    // Download audio file
    const audioResponse = await fetch(recording.audio_url);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio');
    }

    const audioBlob = await audioResponse.blob();
    const audioBase64 = await blobToBase64(audioBlob);

    // Analyze with Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const analysis = await analyzeWithGemini(
      geminiApiKey,
      audioBase64,
      recording.exercise,
      recording.duration_seconds
    );

    // Calculate XP based on score
    const xpEarned = calculateXP(analysis.overall_score, recording.duration_seconds);

    // Update recording with results
    const { error: updateError } = await supabase
      .from('exercise_recordings')
      .update({
        analysis_status: 'complete',
        analysis_completed_at: new Date().toISOString(),
        ai_analysis: analysis,
        overall_score: analysis.overall_score,
        pitch_score: analysis.pitch_accuracy,
        rhythm_score: analysis.rhythm_accuracy,
        breath_score: analysis.breath_control,
        energy_score: analysis.energy_level,
        ai_feedback_he: analysis.feedback_he,
        ai_suggestions: analysis.suggestions,
        xp_earned: xpEarned,
      })
      .eq('id', recording_id);

    if (updateError) {
      throw new Error(`Failed to update recording: ${updateError.message}`);
    }

    // Update student XP
    const { data: student } = await supabase
      .from('group_students')
      .select('total_xp')
      .eq('id', recording.student_id)
      .single();

    if (student) {
      await supabase
        .from('group_students')
        .update({
          total_xp: (student.total_xp || 0) + xpEarned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recording.student_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recording_id,
        analysis,
        xp_earned: xpEarned,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Analysis error:', error);

    // Update status to failed if we have recording_id
    try {
      const { recording_id } = await req.json().catch(() => ({}));
      if (recording_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('exercise_recordings')
          .update({ analysis_status: 'failed' })
          .eq('id', recording_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// =====================================================
// GEMINI ANALYSIS
// =====================================================

async function analyzeWithGemini(
  apiKey: string,
  audioBase64: string,
  exercise: any,
  durationSeconds: number
): Promise<AnalysisResult> {
  const prompt = `
אתה מומחה לפיתוח קול ושירה לילדים וצעירים בגילאי 10-14.
נתון לך קטע שיר שהוקלט על ידי תלמיד/ה.

פרטי התרגיל:
- שם: ${exercise?.title_he || 'תרגיל'}
- קטגוריה: ${exercise?.category || 'general'}
- רמת קושי: ${exercise?.difficulty || 'easy'}
- משך ההקלטה: ${durationSeconds} שניות

אנא נתח את ההקלטה והחזר JSON בפורמט הבא:
{
  "pitch_accuracy": <מספר 0-100 - דיוק הצליל>,
  "rhythm_accuracy": <מספר 0-100 - דיוק הקצב>,
  "breath_control": <מספר 0-100 - שליטה בנשימה>,
  "energy_level": <מספר 0-100 - רמת האנרגיה והביטחון>,
  "resonance_quality": <"excellent" | "good" | "fair" | "needs_work">,
  "detected_issues": [<רשימת בעיות שזוהו בעברית>],
  "strengths": [<רשימת חוזקות בעברית>],
  "feedback_he": "<משוב מעודד וקונסטרוקטיבי בעברית, 2-3 משפטים>",
  "suggestions": [<2-3 הצעות לשיפור בעברית>],
  "overall_score": <מספר 0-100 - ציון כללי>
}

חשוב:
1. התאם את המשוב לגיל (10-14) - השתמש בשפה פשוטה ומעודדת
2. הדגש תמיד קודם את החיובי לפני הביקורת
3. תן ציונים הוגנים אך מעודדים - אל תהיה קשוח מדי עם מתחילים
4. המשוב צריך להיות ספציפי ומועיל

החזר רק את ה-JSON, ללא טקסט נוסף.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'audio/webm',
                data: audioBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse Gemini response');
  }

  const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

  // Validate and sanitize
  return {
    pitch_accuracy: clamp(analysis.pitch_accuracy || 70, 0, 100),
    rhythm_accuracy: clamp(analysis.rhythm_accuracy || 70, 0, 100),
    breath_control: clamp(analysis.breath_control || 70, 0, 100),
    energy_level: clamp(analysis.energy_level || 70, 0, 100),
    resonance_quality: analysis.resonance_quality || 'fair',
    detected_issues: analysis.detected_issues || [],
    strengths: analysis.strengths || [],
    feedback_he: analysis.feedback_he || 'עבודה טובה! המשיכו לתרגל.',
    suggestions: analysis.suggestions || ['המשיכו לתרגל כל יום'],
    overall_score: clamp(analysis.overall_score ||
      Math.round((analysis.pitch_accuracy + analysis.rhythm_accuracy +
        analysis.breath_control + analysis.energy_level) / 4), 0, 100),
  };
}

// =====================================================
// HELPERS
// =====================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateXP(score: number, durationSeconds: number): number {
  // Base XP for completing (5-15 based on duration)
  const baseXP = Math.min(15, Math.max(5, Math.round(durationSeconds / 6)));

  // Bonus for score
  let scoreBonus = 0;
  if (score >= 90) scoreBonus = 10;
  else if (score >= 80) scoreBonus = 7;
  else if (score >= 70) scoreBonus = 5;
  else if (score >= 60) scoreBonus = 3;

  return baseXP + scoreBonus;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
