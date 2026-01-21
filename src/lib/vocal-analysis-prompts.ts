/**
 * Expert Vocal Coaching Analysis Prompts
 *
 * מערכת prompts מומחית לניתוח שיעורי פיתוח קול ושירה
 * Built with insights from professional vocal pedagogy
 */

// Technical vocal terminology for accurate analysis
export const VOCAL_TERMINOLOGY = {
  techniques: {
    breathSupport: {
      en: "Breath Support",
      he: "תמיכת נשימה",
      keywords: ["diaphragmatic", "appoggio", "intercostal", "belly breathing", "ribcage expansion"],
    },
    resonance: {
      en: "Resonance",
      he: "רזוננס",
      keywords: ["mask", "nasal", "chest voice", "head voice", "twang", "pharyngeal"],
    },
    registration: {
      en: "Registration",
      he: "רגיסטרים",
      keywords: ["chest", "head", "mix", "falsetto", "modal", "passaggio", "bridge"],
    },
    onset: {
      en: "Onset",
      he: "התחלת צליל",
      keywords: ["glottal", "aspirate", "coordinated", "balanced onset"],
    },
    vibrato: {
      en: "Vibrato",
      he: "ויברטו",
      keywords: ["natural vibrato", "forced", "wobble", "straight tone", "tremolo"],
    },
    dynamics: {
      en: "Dynamics",
      he: "דינמיקה",
      keywords: ["messa di voce", "crescendo", "decrescendo", "piano", "forte"],
    },
    diction: {
      en: "Diction",
      he: "דיקציה",
      keywords: ["articulation", "consonants", "vowels", "legato", "text clarity"],
    },
    range: {
      en: "Range Extension",
      he: "הרחבת טווח",
      keywords: ["high notes", "low notes", "tessitura", "vocal ceiling", "belt"],
    },
  },

  exercises: {
    warmups: ["lip trills", "humming", "sirens", "scales", "arpeggios", "5-tone scales"],
    technical: ["messa di voce", "staccato", "legato", "intervals", "octave jumps"],
    stylistic: ["riffs", "runs", "melisma", "ad-libs", "dynamics exercise"],
  },

  commonIssues: {
    tension: ["jaw tension", "tongue tension", "throat tension", "shoulder tension"],
    breathRelated: ["shallow breathing", "breath support collapse", "air leakage"],
    registrationIssues: ["break", "crack", "flip", "strain in passaggio"],
    resonanceIssues: ["nasal sound", "throat sound", "lack of projection"],
  },
};

// Main analysis prompt for extracting detailed insights
export const EXPERT_ANALYSIS_PROMPT = `אתה מומחה לפדגוגיה ווקאלית עם ניסיון של 20 שנה בהוראת קול ושירה.
נתח את תמליל השיעור הבא וחלץ מידע מפורט על התקדמות התלמיד.

## הנחיות לניתוח:

### 1. טכניקות שנעבדו (techniques_worked)
זהה את הטכניקות הספציפיות שהמורה עבד עליהן:
- תמיכת נשימה (Breath Support / Appoggio)
- רזוננס (Resonance - mask, chest, head)
- רגיסטרים (Registration - chest/mix/head/passaggio)
- ויברטו (Vibrato)
- דינמיקה (Dynamics)
- דיקציה (Diction)
- הרחבת טווח (Range Extension)

### 2. תרגילים שבוצעו (exercises_performed)
רשום את התרגילים הספציפיים:
- Lip Trills, Humming, Sirens
- סקאלות (5-tone, major, minor)
- אינטרוולים
- תרגילי סגנון (riffs, runs)

### 3. התקדמות טכנית (technical_progress)
תאר את ההתקדמות הטכנית:
- מה השתפר במהלך השיעור
- אילו "אירורקה" moments היו
- התגברות על קשיים קודמים

### 4. אזורי עבודה (areas_to_work)
זהה מה צריך לעבוד עליו:
- מתחים (tension patterns)
- בעיות נשימה
- קשיים ברגיסטרים
- אזורים שצריכים תרגול

### 5. רפרטואר (repertoire)
אילו שירים נעבדו ובאיזה סגנון

### 6. מצב רגשי והנעה (emotional_state)
- מוטיבציה של התלמיד
- תגובה לאתגרים
- אנרגיה כללית

### 7. המלצות ספציפיות (specific_recommendations)
- תרגילים לתרגול בבית
- נקודות למעקב בשיעור הבא
- שירים מומלצים להמשך

תמליל השיעור:
{transcript}

שם התלמיד: {student_name}
תאריך השיעור: {lesson_date}

---

החזר JSON בלבד בפורמט הבא (בעברית):
{
  "techniques_worked": [
    {
      "technique": "שם הטכניקה",
      "details": "פירוט מה נעשה",
      "student_response": "איך התלמיד הגיב/ביצע"
    }
  ],
  "exercises_performed": [
    {
      "name": "שם התרגיל",
      "purpose": "מטרת התרגיל",
      "execution": "איכות הביצוע (טוב/בינוני/צריך עבודה)"
    }
  ],
  "technical_progress": {
    "improvements": ["שיפור 1", "שיפור 2"],
    "breakthroughs": ["פריצת דרך אם הייתה"],
    "challenges_overcome": ["אתגר שהתגברו עליו"]
  },
  "areas_to_work": [
    {
      "area": "אזור לעבודה",
      "current_level": "רמה נוכחית (1-5)",
      "specific_issues": ["בעיה ספציפית"],
      "recommended_exercises": ["תרגיל מומלץ"]
    }
  ],
  "repertoire": [
    {
      "song": "שם השיר",
      "artist": "אמן",
      "style": "סגנון",
      "focus_areas": ["מה עבדו בשיר"]
    }
  ],
  "emotional_state": {
    "motivation_level": "גבוהה/בינונית/נמוכה",
    "energy": "גבוהה/בינונית/נמוכה",
    "receptiveness": "פתיחות להערות",
    "confidence": "ביטחון עצמי"
  },
  "specific_recommendations": {
    "home_practice": ["תרגיל לבית 1", "תרגיל לבית 2"],
    "focus_next_lesson": ["נקודת מיקוד לשיעור הבא"],
    "songs_to_explore": ["שיר מומלץ להמשך"]
  },
  "lesson_summary": "סיכום קצר של השיעור (2-3 משפטים)",
  "teacher_notes_detected": ["הערות שהמורה הזכיר במפורש"]
}`;

// Quick analysis prompt for batch processing (cheaper, faster)
export const QUICK_ANALYSIS_PROMPT = `אתה מומחה לפיתוח קול. נתח בקצרה את תמליל השיעור.

תמליל:
{transcript}

תלמיד: {student_name}

החזר JSON:
{
  "main_topics": ["3 נושאים עיקריים"],
  "skills_worked": ["3 מיומנויות שנעבדו"],
  "progress_summary": "משפט אחד על התקדמות",
  "mood": "מילה אחת - מצב רוח",
  "next_focus": "מה לעבוד בשיעור הבא"
}`;

// Student progress tracking prompt
export const PROGRESS_TRACKING_PROMPT = `אתה מנתח התקדמות תלמידי קול.

ניתן לך רשימת סיכומי שיעורים של אותו תלמיד.
זהה מגמות ודפוסי התקדמות.

שיעורים קודמים:
{previous_lessons}

שיעור נוכחי:
{current_lesson}

תלמיד: {student_name}

נתח את ההתקדמות לאורך זמן:

{
  "progress_trend": "עולה/יציב/יורד",
  "consistent_strengths": ["חוזקות קבועות"],
  "persistent_challenges": ["אתגרים מתמשכים"],
  "improvement_areas": ["אזורי שיפור משמעותי"],
  "recommended_focus": ["המלצות ממוקדות"],
  "milestone_achieved": "אם הושג אבן דרך",
  "estimated_level": "רמה משוערת (מתחיל/בינוני/מתקדם)"
}`;

// Lesson planning assistant prompt
export const LESSON_PLANNING_PROMPT = `אתה עוזר מומחה למורים לפיתוח קול בתכנון שיעורים.

מידע על התלמיד:
{student_profile}

היסטוריית שיעורים אחרונים:
{recent_lessons}

צרכים מיוחדים:
{special_needs}

---

תכנן שיעור מותאם אישית:

{
  "warmup_sequence": [
    {"exercise": "תרגיל", "duration": "זמן", "purpose": "מטרה"}
  ],
  "main_techniques": [
    {"technique": "טכניקה", "exercises": ["תרגילים"], "duration": "זמן"}
  ],
  "repertoire_work": {
    "song": "שיר לעבודה",
    "focus": "נקודות מיקוד",
    "sections": ["חלקים לתרגל"]
  },
  "cool_down": ["תרגילי סיום"],
  "homework": ["משימות לבית"],
  "lesson_goals": ["3 מטרות לשיעור"],
  "adaptation_notes": "התאמות מיוחדות אם צריך"
}`;

// Helper to build prompt with context
export function buildAnalysisPrompt(
  transcript: string,
  studentName: string,
  lessonDate?: string,
  useQuickMode = false
): string {
  const template = useQuickMode ? QUICK_ANALYSIS_PROMPT : EXPERT_ANALYSIS_PROMPT;

  return template
    .replace("{transcript}", transcript.slice(0, useQuickMode ? 4000 : 10000))
    .replace("{student_name}", studentName)
    .replace("{lesson_date}", lessonDate || "לא צוין");
}

// Helper to build progress tracking prompt
export function buildProgressPrompt(
  previousLessons: string[],
  currentLesson: string,
  studentName: string
): string {
  return PROGRESS_TRACKING_PROMPT
    .replace("{previous_lessons}", previousLessons.slice(-5).join("\n\n---\n\n"))
    .replace("{current_lesson}", currentLesson)
    .replace("{student_name}", studentName);
}
