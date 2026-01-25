// Supabase Edge Function: Analyze Group Lessons
// Extracts student participation data from group lesson transcripts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known group student names
const GROUP_STUDENTS = ["עדי", "שיראל", "אורין", "לירז", "תהל", "נויה", "רוני", "שיר", "דנה", "יעל"];

// Teacher name patterns
const TEACHER_PATTERNS = ["ענבל", "פיתוח קול", "Teacher", "מורה"];

// Group lesson title patterns
const GROUP_PATTERNS = [/קבוצה/i, /קבוצתי/i, /juniors/i, /group/i, /צעירים/i, /נוער/i, /rehearsal/i];

interface SpeakerSegment {
  speaker: string;
  text: string;
  start_time?: number;
  is_student: boolean;
  is_teacher: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { limit = 100, daysBack = 30 } = await req.json().catch(() => ({}));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get recent transcripts
    const { data: transcripts, error } = await supabase
      .from("transcripts")
      .select("id, title, full_text, lesson_date, created_at")
      .gte("created_at", cutoffDate.toISOString())
      .order("lesson_date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    let groupCount = 0;
    let storedCount = 0;
    const studentProgressMap = new Map<string, any[]>();

    for (const transcript of transcripts || []) {
      if (!isGroupLesson(transcript.title, transcript.full_text)) continue;
      groupCount++;

      const { segments, studentStats } = analyzeTranscript(transcript.full_text);

      // Store group lesson summary
      await storeGroupLessonSummary(supabase, transcript, segments, studentStats);

      // Aggregate per-student progress
      for (const [studentName, stats] of studentStats) {
        const progress = studentProgressMap.get(studentName) || [];
        progress.push({
          date: transcript.lesson_date,
          title: transcript.title,
          transcript_id: transcript.id,
          ...stats,
        });
        studentProgressMap.set(studentName, progress);
      }
    }

    // Store student analysis
    for (const [speakerName, sessions] of studentProgressMap) {
      // Check if student exists
      const { data: existingStudent } = await supabase
        .from("group_students")
        .select("id, student_name")
        .ilike("student_name", `%${speakerName}%`)
        .maybeSingle();

      for (const session of sessions) {
        const { error: upsertError } = await supabase
          .from("transcript_student_analysis")
          .upsert({
            transcript_id: session.transcript_id,
            speaker_name: speakerName,
            student_id: existingStudent?.id || null,
            segments_count: session.segments_count,
            word_count: session.word_count,
            estimated_speaking_seconds: session.speaking_time_seconds,
            singing_detected: session.singing_detected,
            analyzed_at: new Date().toISOString(),
          }, {
            onConflict: "transcript_id,speaker_name",
          });

        if (!upsertError) storedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        groupLessonsFound: groupCount,
        analysisRecordsStored: storedCount,
        studentsFound: [...studentProgressMap.keys()],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function isGroupLesson(title: string, content: string): boolean {
  // Check title
  for (const pattern of GROUP_PATTERNS) {
    if (pattern.test(title)) return true;
  }

  // Check content for multiple students
  const foundStudents = GROUP_STUDENTS.filter(name => content?.includes(name));
  return foundStudents.length >= 2;
}

function analyzeTranscript(content: string): {
  segments: SpeakerSegment[];
  studentStats: Map<string, any>;
} {
  const segments: SpeakerSegment[] = [];
  const studentStats = new Map<string, any>();

  if (!content) return { segments, studentStats };

  // Remove BOM
  content = content.replace(/^\uFEFF/, "");
  const lines = content.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Match Timeless format: "Speaker Name (123.45): text"
    const timelessMatch = line.match(/^(.+?)\s*\((\d+\.?\d*)\):\s*(.+)$/);
    const simpleMatch = line.match(/^([א-ת\s]+):\s(.+)$/);
    const match = timelessMatch || simpleMatch;
    if (!match) continue;

    let speaker = match[1].trim();
    const text = timelessMatch ? match[3] : match[2];

    // Clean up speaker name
    speaker = speaker.replace(/\s*-\s*פיתוח קול\s*$/i, "").trim();

    const isStudent = GROUP_STUDENTS.some(name => speaker.includes(name));
    const isTeacher = TEACHER_PATTERNS.some(pattern => speaker.includes(pattern));

    segments.push({
      speaker,
      text: text.trim(),
      start_time: timelessMatch ? parseFloat(match[2]) : undefined,
      is_student: isStudent,
      is_teacher: isTeacher,
    });

    if (isStudent) {
      const stats = studentStats.get(speaker) || {
        speaking_time_seconds: 0,
        segments_count: 0,
        word_count: 0,
        singing_detected: false,
      };
      stats.segments_count++;
      stats.word_count += text.split(/\s+/).length;
      stats.speaking_time_seconds += (text.split(/\s+/).length / 150) * 60;
      stats.singing_detected = stats.singing_detected || detectSinging(text);
      studentStats.set(speaker, stats);
    }
  }

  return { segments, studentStats };
}

function detectSinging(text: string): boolean {
  const patterns = [/♪|♫|🎵|🎤/, /שר|שרה|שירה|לשיר/i, /\[שירה\]/i, /לה לה לה/i];
  return patterns.some(p => p.test(text));
}

async function storeGroupLessonSummary(
  supabase: any,
  transcript: any,
  segments: SpeakerSegment[],
  studentStats: Map<string, any>
) {
  const speakers = [...new Set(segments.map(s => s.speaker))];
  const studentSpeakers = speakers.filter(s => GROUP_STUDENTS.some(name => s.includes(name)));
  const teacherSpeakers = speakers.filter(s => TEACHER_PATTERNS.some(p => s.includes(p)));
  const totalWords = segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
  const singingSegments = segments.filter(s => detectSinging(s.text)).length;

  await supabase
    .from("group_lesson_analysis")
    .upsert({
      transcript_id: transcript.id,
      lesson_date: transcript.lesson_date?.split("T")[0] || null,
      lesson_title: transcript.title,
      total_speakers: speakers.length,
      student_speakers: studentSpeakers.length,
      teacher_speakers: teacherSpeakers.length,
      speakers,
      student_names: studentSpeakers,
      teacher_names: teacherSpeakers,
      total_segments: segments.length,
      total_word_count: totalWords,
      estimated_duration_minutes: totalWords / 150,
      singing_segments_count: singingSegments,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: "transcript_id" });
}
