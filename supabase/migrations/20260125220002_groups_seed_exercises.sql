-- =====================================================
-- VOICELY GROUPS PLATFORM - SEED EXERCISES
-- Sample exercises for development and testing
-- =====================================================

-- =====================================================
-- WARMUP EXERCISES
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Mmmmm - Basic Warmup',
  'ממממ - חימום בסיסי',
  'Voice warmup with humming sound at comfortable pitch',
  'חימום קול עם צליל ממממ על גובה נוח',
  'warmup', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 20, 45,
  '[
    {"step": 1, "text_he": "שבו בנוחות עם גב ישר", "duration_sec": 5},
    {"step": 2, "text_he": "נשמו עמוק דרך האף", "duration_sec": 5},
    {"step": 3, "text_he": "הוציאו צליל ממממ ארוך ורך", "duration_sec": 10},
    {"step": 4, "text_he": "שמרו על הצליל יציב למשך 5 שניות", "duration_sec": 5},
    {"step": 5, "text_he": "חזרו 3-4 פעמים", "duration_sec": 20}
  ]'::jsonb,
  true
),
(
  'Soft Siren',
  'סירנה רכה',
  'Gentle slide from low to high and back',
  'גלישה עדינה מנמוך לגבוה וחזרה',
  'warmup', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "התחילו בצליל נמוך ונוח", "duration_sec": 5},
    {"step": 2, "text_he": "גלשו לאט כלפי מעלה כמו סירנה", "duration_sec": 10},
    {"step": 3, "text_he": "הגיעו לגובה נוח (לא מאמץ!)", "duration_sec": 5},
    {"step": 4, "text_he": "גלשו חזרה למטה באותו קצב", "duration_sec": 10},
    {"step": 5, "text_he": "חזרו 3 פעמים", "duration_sec": 30}
  ]'::jsonb,
  true
),
(
  'Lip Trills',
  'שפתיים רוטטות',
  'Lip buzzing on various pitches',
  'רטט שפתיים על מנעד צלילים',
  'warmup', 'medium', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "הרפו את השפתיים", "duration_sec": 5},
    {"step": 2, "text_he": "נשפו אוויר כך שהשפתיים ירטטו (כמו סוס)", "duration_sec": 10},
    {"step": 3, "text_he": "נסו לשיר מנגינה פשוטה עם הרטט", "duration_sec": 20},
    {"step": 4, "text_he": "אם קשה - לחצו קלות על הלחיים", "duration_sec": 10}
  ]'::jsonb,
  true
);

-- =====================================================
-- BREATHING EXERCISES
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Diaphragmatic Breathing',
  'נשימה סרעפתית',
  'Deep breathing with diaphragm - foundation for good singing',
  'נשימה עמוקה עם הסרעפת - הבסיס לכל שירה טובה',
  'breathing', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 45, 90,
  '[
    {"step": 1, "text_he": "שכבו או שבו עם יד על הבטן", "duration_sec": 5},
    {"step": 2, "text_he": "שאפו דרך האף - הבטן מתרוממת", "duration_sec": 4},
    {"step": 3, "text_he": "נשפו לאט דרך הפה - הבטן יורדת", "duration_sec": 4},
    {"step": 4, "text_he": "ספרו 4 שניות שאיפה, 4 שניות נשיפה", "duration_sec": 8},
    {"step": 5, "text_he": "חזרו 5 פעמים", "duration_sec": 40}
  ]'::jsonb,
  true
),
(
  'Long Exhale with Sss',
  'נשיפה ארוכה עם סססס',
  'Breath control with steady sss sound',
  'שליטה בנשיפה עם צליל סססס יציב',
  'breathing', 'medium', ARRAY['10-12', '13-14']::age_group[],
  1, 45, 90,
  '[
    {"step": 1, "text_he": "שאפו עמוק (נשימת בטן!)", "duration_sec": 5},
    {"step": 2, "text_he": "התחילו להוציא צליל סססס יציב", "duration_sec": 20},
    {"step": 3, "text_he": "נסו להחזיק כמה שיותר זמן", "duration_sec": 10},
    {"step": 4, "text_he": "שמרו על עוצמה אחידה לכל אורך הנשיפה", "duration_sec": 10},
    {"step": 5, "text_he": "תעדו את הזמן שלכם!", "duration_sec": 5}
  ]'::jsonb,
  true
),
(
  'Box Breathing',
  'נשימת ריבוע',
  'Calming and centering breathing technique',
  'טכניקת נשימה מרגיעה ומרכזת',
  'breathing', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 45, 90,
  '[
    {"step": 1, "text_he": "שאפו לספירה של 4", "duration_sec": 4},
    {"step": 2, "text_he": "החזיקו לספירה של 4", "duration_sec": 4},
    {"step": 3, "text_he": "נשפו לספירה של 4", "duration_sec": 4},
    {"step": 4, "text_he": "החזיקו (בלי אוויר) לספירה של 4", "duration_sec": 4},
    {"step": 5, "text_he": "חזרו 4 פעמים", "duration_sec": 48}
  ]'::jsonb,
  true
);

-- =====================================================
-- PITCH EXERCISES
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Basic Pitch Matching',
  'התאמת צליל בסיסית',
  'Listening and repeating single notes',
  'שמיעה וחזרה על צלילים בודדים',
  'pitch', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "האזינו לצליל שמושמע", "duration_sec": 5},
    {"step": 2, "text_he": "נסו לזמזם אותו בראש", "duration_sec": 5},
    {"step": 3, "text_he": "שירו את הצליל בקול", "duration_sec": 10},
    {"step": 4, "text_he": "האזינו שוב ותקנו אם צריך", "duration_sec": 10}
  ]'::jsonb,
  true
),
(
  'Ascending Scale',
  'סולם עולה',
  'Singing scale from do to do - 8 notes',
  'שירת סולם מדו עד דו - 8 צלילים',
  'pitch', 'medium', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "שירו: דו רה מי פה סול לה סי דו", "duration_sec": 15},
    {"step": 2, "text_he": "התחילו לאט ובקול ברור", "duration_sec": 10},
    {"step": 3, "text_he": "האזינו לעצמכם תוך כדי", "duration_sec": 10},
    {"step": 4, "text_he": "נסו לשמור על מרווחים שווים", "duration_sec": 10}
  ]'::jsonb,
  true
),
(
  'Interval Jumps',
  'קפיצות אינטרוולים',
  'Jumping between notes - thirds and fifths',
  'קפיצות בין צלילים - שלישיות וחמישיות',
  'pitch', 'advanced', ARRAY['13-14']::age_group[],
  1, 45, 90,
  '[
    {"step": 1, "text_he": "שירו דו-מי-דו (שלישייה)", "duration_sec": 15},
    {"step": 2, "text_he": "שירו דו-סול-דו (חמישייה)", "duration_sec": 15},
    {"step": 3, "text_he": "נסו לקפוץ בדיוק לצליל הנכון", "duration_sec": 15},
    {"step": 4, "text_he": "חזרו כל דפוס 3 פעמים", "duration_sec": 30}
  ]'::jsonb,
  true
);

-- =====================================================
-- RHYTHM EXERCISES
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Clapping to the Beat',
  'מחיאות כפיים בקצב',
  'Keeping steady beat with hand claps',
  'שמירה על קצב קבוע עם מחיאות כפיים',
  'rhythm', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "האזינו לקצב", "duration_sec": 10},
    {"step": 2, "text_he": "התחילו למחוא כפיים עם הקצב", "duration_sec": 15},
    {"step": 3, "text_he": "שמרו על עקביות - לא מהר ולא לאט", "duration_sec": 15},
    {"step": 4, "text_he": "נסו לספור: 1-2-3-4, 1-2-3-4", "duration_sec": 15}
  ]'::jsonb,
  true
),
(
  'Ta-Ta-Ti-Ti-Ta Pattern',
  'תא-תא-טי-טי-תא',
  'Basic rhythm pattern with syllables',
  'דפוס קצב בסיסי עם הברות',
  'rhythm', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "האזינו לדפוס: תא-תא-טי-טי-תא", "duration_sec": 10},
    {"step": 2, "text_he": "תא = צליל ארוך (חצי תו)", "duration_sec": 5},
    {"step": 3, "text_he": "טי = צליל קצר (רבע תו)", "duration_sec": 5},
    {"step": 4, "text_he": "חזרו על הדפוס 4 פעמים", "duration_sec": 20},
    {"step": 5, "text_he": "נסו לשיר את זה על צליל אחד", "duration_sec": 15}
  ]'::jsonb,
  true
),
(
  'Cool Syncopation',
  'סינקופות מגניבות',
  'Accents on weak beats',
  'הדגשות על הזמנים החלשים',
  'rhythm', 'advanced', ARRAY['13-14']::age_group[],
  1, 45, 90,
  '[
    {"step": 1, "text_he": "במקום 1-2-3-4 רגיל", "duration_sec": 10},
    {"step": 2, "text_he": "הדגישו את ה-2 וה-4: 1-שתיים-3-ארבע", "duration_sec": 15},
    {"step": 3, "text_he": "זה הקצב של רוב שירי הפופ!", "duration_sec": 10},
    {"step": 4, "text_he": "נסו למחוא רק על 2 ו-4", "duration_sec": 20}
  ]'::jsonb,
  true
);

-- =====================================================
-- SONG EXERCISES (Practice Songs)
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Simple Song - Had Gadya',
  'שיר פשוט - הד גדיא',
  'Simple folk song for melody practice',
  'שיר עממי פשוט לתרגול מנגינה',
  'song', 'easy', ARRAY['10-12']::age_group[],
  2, 60, 120,
  '[
    {"step": 1, "text_he": "האזינו לשיר פעם אחת", "duration_sec": 30},
    {"step": 2, "text_he": "שירו יחד עם ההקלטה", "duration_sec": 30},
    {"step": 3, "text_he": "נסו לשיר לבד", "duration_sec": 30},
    {"step": 4, "text_he": "הקליטו את עצמכם!", "duration_sec": 30}
  ]'::jsonb,
  true
),
(
  'Intermediate Song - Toda',
  'שיר ביניים - תודה',
  'Israeli song with beautiful melody',
  'שיר ישראלי עם מנגינה יפה',
  'song', 'medium', ARRAY['10-12', '13-14']::age_group[],
  2, 90, 150,
  '[
    {"step": 1, "text_he": "למדו קודם את המילים", "duration_sec": 30},
    {"step": 2, "text_he": "האזינו למנגינה כמה פעמים", "duration_sec": 30},
    {"step": 3, "text_he": "שירו קטעים קטעים", "duration_sec": 30},
    {"step": 4, "text_he": "חברו הכל יחד", "duration_sec": 30}
  ]'::jsonb,
  true
),
(
  'Challenging Song - Hallelujah',
  'שיר מאתגר - הללויה',
  'Song with wide vocal range',
  'שיר עם טווח קולי רחב',
  'song', 'advanced', ARRAY['13-14']::age_group[],
  3, 120, 200,
  '[
    {"step": 1, "text_he": "זה שיר עם טווח גדול!", "duration_sec": 10},
    {"step": 2, "text_he": "התחילו עם הבית הראשון", "duration_sec": 60},
    {"step": 3, "text_he": "תרגלו את הקפיצות הגבוהות בנפרד", "duration_sec": 40},
    {"step": 4, "text_he": "אל תכריחו את הקול בצלילים הגבוהים", "duration_sec": 30}
  ]'::jsonb,
  true
);

-- =====================================================
-- RESONANCE EXERCISES
-- =====================================================

INSERT INTO practice_exercises (
  title, title_he, description, description_he,
  category, difficulty, age_groups,
  duration_minutes, min_duration_seconds, max_duration_seconds,
  instructions, is_active
) VALUES
(
  'Inner Humming',
  'זמזום פנימה',
  'Creating resonance in the inner head space',
  'יצירת תהודה בחלל הפנימי של הראש',
  'resonance', 'easy', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "זמזמו עם פה סגור", "duration_sec": 10},
    {"step": 2, "text_he": "הרגישו את הרטט באזור המצח", "duration_sec": 10},
    {"step": 3, "text_he": "נסו להזיז את הרטט - לאף, למצח, לגרון", "duration_sec": 15},
    {"step": 4, "text_he": "שחקו עם המיקום של הצליל", "duration_sec": 15}
  ]'::jsonb,
  true
),
(
  'Ng-Ng-Ng',
  'נג-נג-נג',
  'Resonance exercise with NG sound',
  'תרגיל תהודה עם צליל NG',
  'resonance', 'medium', ARRAY['10-12', '13-14']::age_group[],
  1, 30, 60,
  '[
    {"step": 1, "text_he": "הוציאו צליל נג כמו בסוף המילה שירינג", "duration_sec": 10},
    {"step": 2, "text_he": "הרגישו את הרטט מאחורי האף", "duration_sec": 10},
    {"step": 3, "text_he": "שנו גובה תוך כדי שמירה על הצליל", "duration_sec": 15},
    {"step": 4, "text_he": "נסו לעשות סירנה עם נג", "duration_sec": 15}
  ]'::jsonb,
  true
);

-- Verify the data was inserted
DO $$
BEGIN
  RAISE NOTICE 'Inserted % exercises', (SELECT COUNT(*) FROM practice_exercises);
END $$;
