/**
 * Group Transcripts Sync & Analysis Script
 *
 * This script:
 * 1. Identifies group lessons from Timeless (Google Drive)
 * 2. Extracts speaker identification from transcripts
 * 3. Analyzes individual student progress within group sessions
 *
 * Usage:
 *   npx tsx scripts/sync-group-transcripts.ts --scan    # Scan for group transcripts
 *   npx tsx scripts/sync-group-transcripts.ts --sync    # Sync and analyze
 *   npx tsx scripts/sync-group-transcripts.ts --analyze # Analyze existing transcripts
 */

import "dotenv/config";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Configuration
const CONFIG = {
  // Google Drive folder for group lessons (Timeless archive)
  GDRIVE_FOLDER_ID: "1phKpNENjzPvc7FvMdJaySoFWVIu797f1",

  // Patterns to identify group lessons
  GROUP_PATTERNS: [
    /קבוצה/i,
    /קבוצתי/i,
    /juniors/i,
    /group/i,
    /צעירים/i,
    /נוער/i,
  ],

  // Known group student names (from actual transcripts)
  GROUP_STUDENTS: [
    "עדי",
    "שיראל",
    "אורין",
    "לירז",
    "תהל",
    "נויה",
    "רוני",
    "שיר",
    "דנה",
    "יעל",
  ],

  // Teacher name patterns
  TEACHER_PATTERNS: [
    "ענבל",
    "פיתוח קול",
    "Teacher",
    "מורה",
  ],
};

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Speaker segment interface
interface SpeakerSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
  is_student: boolean;
  is_teacher: boolean;
}

// Analyzed transcript
interface AnalyzedTranscript {
  transcript_id: string;
  gdrive_file_id: string;
  title: string;
  lesson_date: Date;
  is_group_lesson: boolean;
  speakers: string[];
  student_segments: Map<string, SpeakerSegment[]>;
  teacher_segments: SpeakerSegment[];
  student_stats: Map<string, {
    speaking_time_seconds: number;
    segments_count: number;
    singing_detected: boolean;
    topics: string[];
  }>;
}

/**
 * Scan existing transcripts to identify group lessons
 */
async function scanForGroupLessons(): Promise<void> {
  console.log("🔍 Scanning transcripts for group lessons...\n");

  // Get all transcripts
  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("id, title, full_text, lesson_date, gdrive_file_id")
    .order("lesson_date", { ascending: false });

  if (error) {
    console.error("Error fetching transcripts:", error);
    return;
  }

  console.log(`Found ${transcripts?.length || 0} transcripts total\n`);

  const groupLessons: any[] = [];

  for (const transcript of transcripts || []) {
    const isGroup = isGroupLesson(transcript.title, transcript.full_text);
    if (isGroup) {
      const speakers = extractSpeakers(transcript.full_text);
      const studentSpeakers = speakers.filter(s =>
        CONFIG.GROUP_STUDENTS.some(name => s.includes(name))
      );

      groupLessons.push({
        id: transcript.id,
        title: transcript.title,
        date: transcript.lesson_date,
        speakers_count: speakers.length,
        student_speakers: studentSpeakers,
      });
    }
  }

  console.log(`\n📊 Found ${groupLessons.length} group lessons:\n`);

  for (const lesson of groupLessons.slice(0, 10)) {
    console.log(`  📅 ${lesson.date?.split("T")[0] || "Unknown date"}`);
    console.log(`     ${lesson.title}`);
    console.log(`     Speakers: ${lesson.speakers_count}`);
    console.log(`     Students: ${lesson.student_speakers.join(", ") || "Unknown"}`);
    console.log();
  }

  if (groupLessons.length > 10) {
    console.log(`  ... and ${groupLessons.length - 10} more\n`);
  }
}

/**
 * Check if a transcript is from a group lesson
 */
function isGroupLesson(title: string, content: string): boolean {
  // Check title
  for (const pattern of CONFIG.GROUP_PATTERNS) {
    if (pattern.test(title)) return true;
  }

  // Check content for multiple students
  const speakers = extractSpeakers(content);
  const studentSpeakers = speakers.filter(s =>
    CONFIG.GROUP_STUDENTS.some(name => s.includes(name))
  );

  // If 2+ student speakers, likely a group lesson
  return studentSpeakers.length >= 2;
}

/**
 * Extract unique speakers from transcript text
 * Supports multiple formats:
 * - "Speaker Name: text"
 * - "Speaker Name (123.45): text" (Timeless format)
 */
function extractSpeakers(content: string): string[] {
  if (!content) return [];

  // Remove BOM
  content = content.replace(/^\uFEFF/, "");

  const speakers = new Set<string>();

  // Pattern 1: "Speaker Name (timestamp): text" - Timeless format
  const timelessPattern = /^(.+?)\s*\(\d+\.?\d*\):\s/gm;
  let match;

  while ((match = timelessPattern.exec(content)) !== null) {
    let speaker = match[1].trim();
    if (speaker.length > 1 && speaker.length < 50) {
      // Clean up speaker name (remove "פיתוח קול" etc.)
      speaker = speaker.replace(/\s*-\s*פיתוח קול\s*$/i, "").trim();
      speakers.add(speaker);
    }
  }

  // Pattern 2: "Speaker Name:" at start of line (fallback)
  if (speakers.size === 0) {
    const simplePattern = /^([א-ת\s]+):\s/gm;
    while ((match = simplePattern.exec(content)) !== null) {
      const speaker = match[1].trim();
      if (speaker.length > 1 && speaker.length < 30) {
        speakers.add(speaker);
      }
    }
  }

  return Array.from(speakers);
}

/**
 * Analyze a transcript and extract student-specific segments
 * Supports Timeless format: "Speaker Name (timestamp): text"
 */
function analyzeTranscript(content: string): {
  segments: SpeakerSegment[];
  studentStats: Map<string, any>;
} {
  const segments: SpeakerSegment[] = [];
  const studentStats = new Map<string, any>();

  if (!content) return { segments, studentStats };

  // Remove BOM
  content = content.replace(/^\uFEFF/, "");

  // Split by speaker turns
  const lines = content.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Match Timeless format: "Speaker Name (123.45): text"
    const timelessMatch = line.match(/^(.+?)\s*\((\d+\.?\d*)\):\s*(.+)$/);
    // Fallback: "Speaker Name: text"
    const simpleMatch = line.match(/^([א-ת\s]+):\s(.+)$/);

    const match = timelessMatch || simpleMatch;
    if (!match) continue;

    let speaker = match[1].trim();
    const timestamp = timelessMatch ? parseFloat(match[2]) : undefined;
    const text = timelessMatch ? match[3] : match[2];

    // Clean up speaker name
    speaker = speaker.replace(/\s*-\s*פיתוח קול\s*$/i, "").trim();

    // Determine if student or teacher
    const isStudent = CONFIG.GROUP_STUDENTS.some(name =>
      speaker.includes(name)
    );
    const isTeacher = CONFIG.TEACHER_PATTERNS.some(pattern =>
      speaker.includes(pattern)
    );

    segments.push({
      speaker,
      text: text.trim(),
      start_time: timestamp,
      is_student: isStudent,
      is_teacher: isTeacher,
    });

    // Update stats for students
    if (isStudent) {
      const stats = studentStats.get(speaker) || {
        speaking_time_seconds: 0,
        segments_count: 0,
        word_count: 0,
        singing_detected: false,
      };
      stats.segments_count++;
      stats.word_count += text.split(/\s+/).length;
      stats.speaking_time_seconds += estimateSpeakingTime(text);
      stats.singing_detected = stats.singing_detected || detectSinging(text);
      studentStats.set(speaker, stats);
    }
  }

  return { segments, studentStats };
}

/**
 * Estimate speaking time from text (rough approximation)
 */
function estimateSpeakingTime(text: string): number {
  const words = text.split(/\s+/).length;
  // Average speaking rate: ~150 words per minute
  return (words / 150) * 60;
}

/**
 * Detect if a segment contains singing
 */
function detectSinging(text: string): boolean {
  const singingPatterns = [
    /♪|♫|🎵|🎤/,
    /שר|שרה|שירה|לשיר/i,
    /\[שירה\]/i,
    /\[singing\]/i,
    /לה לה לה/i,
    /נא נא נא/i,
  ];

  return singingPatterns.some(pattern => pattern.test(text));
}

/**
 * Main sync and analyze function
 */
async function syncAndAnalyze(): Promise<void> {
  console.log("🔄 Syncing and analyzing group transcripts...\n");

  // Get group transcripts
  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("*")
    .order("lesson_date", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error:", error);
    return;
  }

  let groupCount = 0;
  const studentProgressMap = new Map<string, any[]>();

  for (const transcript of transcripts || []) {
    if (!isGroupLesson(transcript.title, transcript.full_text)) continue;
    groupCount++;

    console.log(`📝 Analyzing: ${transcript.title}`);

    const { segments, studentStats } = analyzeTranscript(transcript.full_text);

    // Debug: show found speakers
    const speakers = [...new Set(segments.map(s => s.speaker))];
    const students = segments.filter(s => s.is_student);
    if (students.length > 0 || studentStats.size > 0) {
      console.log(`   Found ${speakers.length} speakers, ${studentStats.size} students`);
    }

    // Store group lesson summary
    await storeGroupLessonSummary(transcript, segments, studentStats);

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

  console.log(`\n📊 Analyzed ${groupCount} group lessons\n`);

  // Print student summaries
  console.log("👩‍🎤 Student Progress Summary:\n");

  for (const [studentName, sessions] of studentProgressMap) {
    const totalWords = sessions.reduce((sum, s) => sum + s.word_count, 0);
    const totalTime = sessions.reduce((sum, s) => sum + s.speaking_time_seconds, 0);
    const singingSessions = sessions.filter(s => s.singing_detected).length;

    console.log(`  ${studentName}:`);
    console.log(`    Sessions: ${sessions.length}`);
    console.log(`    Total words spoken: ${totalWords}`);
    console.log(`    Est. speaking time: ${Math.round(totalTime / 60)} min`);
    console.log(`    Sessions with singing: ${singingSessions}`);
    console.log();
  }

  // Store results
  await storeGroupAnalysis(studentProgressMap);
}

/**
 * Store group analysis in database - uses new transcript_student_analysis table
 */
async function storeGroupAnalysis(
  progressMap: Map<string, any[]>
): Promise<void> {
  console.log("💾 Storing analysis results...\n");

  let storedCount = 0;
  let linkedCount = 0;

  for (const [speakerName, sessions] of progressMap) {
    // Check if student exists by matching display_name
    const { data: existingStudent } = await supabase
      .from("group_students")
      .select("id, display_name")
      .ilike("display_name", `%${speakerName}%`)
      .single();

    for (const session of sessions) {
      // Store in transcript_student_analysis table
      const { error } = await supabase
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

      if (!error) {
        storedCount++;
        if (existingStudent) linkedCount++;
      }
    }

    if (existingStudent) {
      console.log(`  ✓ ${speakerName} → linked to registered student`);
    } else {
      console.log(`  📝 ${speakerName} → stored (pending registration)`);
    }
  }

  console.log(`\n✅ Stored ${storedCount} analysis records (${linkedCount} linked to students)\n`);
}

/**
 * Store group lesson summary in database
 */
async function storeGroupLessonSummary(
  transcript: any,
  segments: SpeakerSegment[],
  studentStats: Map<string, any>
): Promise<void> {
  const speakers = [...new Set(segments.map(s => s.speaker))];
  const studentSpeakers = speakers.filter(s =>
    CONFIG.GROUP_STUDENTS.some(name => s.includes(name))
  );
  const teacherSpeakers = speakers.filter(s =>
    CONFIG.TEACHER_PATTERNS.some(pattern => s.includes(pattern))
  );

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
      speakers: speakers,
      student_names: studentSpeakers,
      teacher_names: teacherSpeakers,
      total_segments: segments.length,
      total_word_count: totalWords,
      estimated_duration_minutes: totalWords / 150, // ~150 wpm speaking rate
      singing_segments_count: singingSegments,
      analyzed_at: new Date().toISOString(),
    }, {
      onConflict: "transcript_id",
    });
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--scan")) {
    await scanForGroupLessons();
  } else if (args.includes("--sync") || args.includes("--analyze")) {
    await syncAndAnalyze();
  } else {
    console.log(`
Group Transcripts Sync & Analysis

Usage:
  npx tsx scripts/sync-group-transcripts.ts --scan     Scan for group transcripts
  npx tsx scripts/sync-group-transcripts.ts --sync     Sync and analyze all
  npx tsx scripts/sync-group-transcripts.ts --analyze  Analyze existing transcripts
    `);
  }
}

main().catch(console.error);
