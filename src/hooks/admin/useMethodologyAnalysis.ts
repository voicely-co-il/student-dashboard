import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonPhase {
  name: string;
  duration: string;
  description: string;
  techniques?: string[];
}

export interface TeachingPattern {
  name: string;
  frequency: number;
  description: string;
  examples?: string[];
}

export interface CommonTechnique {
  name: string;
  count: number;
  context: string;
}

export interface MethodologyData {
  analyzedTranscripts: number;
  lessonStructure: LessonPhase[];
  teachingPatterns: TeachingPattern[];
  commonTechniques: CommonTechnique[];
  keyInsights: string[];
}

// Mock data for development - will be replaced with AI analysis
const MOCK_METHODOLOGY_DATA: MethodologyData = {
  analyzedTranscripts: 828,
  lessonStructure: [
    {
      name: 'חימום וחיבור',
      duration: '5-10 דק\'',
      description: 'שיחה קצרה על השבוע, בדיקת מצב הקול, תרגילי נשימה ראשוניים',
      techniques: ['נשימה סרעפתית', 'הרפיית כתפיים', 'וויברטו שפתיים'],
    },
    {
      name: 'תרגילים טכניים',
      duration: '15-20 דק\'',
      description: 'עבודה על טכניקות ספציפיות לפי צורכי התלמיד',
      techniques: ['סקאלות', 'אינטרוולים', 'תרגילי רזוננס'],
    },
    {
      name: 'עבודה על רפרטואר',
      duration: '15-20 דק\'',
      description: 'תרגול שירים, יישום הטכניקות שנלמדו',
      techniques: ['פרשנות', 'דינמיקה', 'ביטוי רגשי'],
    },
    {
      name: 'סיכום ומשימות',
      duration: '5 דק\'',
      description: 'חזרה על נקודות מפתח, הגדרת תרגול לבית',
      techniques: ['רפלקציה', 'הגדרת יעדים'],
    },
  ],
  teachingPatterns: [
    {
      name: 'התאמה אישית מתמדת',
      frequency: 92,
      description: 'ענבל מתאימה את התרגילים בזמן אמת לפי תגובת התלמיד',
      examples: [
        'בואי ננסה גרסה יותר נמוכה של התרגיל',
        'אני רואה שזה עובד לך, בואי נעצים את זה',
      ],
    },
    {
      name: 'חיזוק חיובי מיידי',
      frequency: 88,
      description: 'משוב חיובי ספציפי מיד אחרי ביצוע מוצלח',
      examples: [
        'וואו, שמעת את הרזוננס שיצרת עכשיו?',
        'זה בדיוק מה שרציתי לשמוע!',
      ],
    },
    {
      name: 'שימוש בדימויים',
      frequency: 85,
      description: 'הסברים באמצעות דימויים ויזואליים ומוחשיים',
      examples: [
        'תדמייני שאת שרה דרך קרן אור',
        'הקול צריך לזרום כמו מים',
      ],
    },
    {
      name: 'חיבור גוף-קול',
      frequency: 78,
      description: 'דגש על הקשר בין תנועות גוף לייצור הקול',
      examples: [
        'תרגישי איך הבטן עובדת',
        'שימי לב לכתפיים שלך',
      ],
    },
    {
      name: 'בניית ביטחון הדרגתי',
      frequency: 75,
      description: 'התקדמות קטנה בכל פעם, חגיגת הצלחות קטנות',
      examples: [
        'ראית? עכשיו את יודעת שאת יכולה',
        'צעד אחד קטן כל פעם',
      ],
    },
  ],
  commonTechniques: [
    { name: 'נשימה סרעפתית', count: 312, context: 'בסיס לכל שיעור, במיוחד עם מתחילים' },
    { name: 'וויברטו שפתיים (Lip Trills)', count: 287, context: 'חימום ושחרור מתח' },
    { name: 'סקאלות בסיסיות', count: 265, context: 'הרחבת טווח ושליטה' },
    { name: 'תרגילי רזוננס', count: 198, context: 'שיפור צליל והקרנה' },
    { name: 'עבודה על פאסאג\'ו', count: 156, context: 'מעברים בין רגיסטרים' },
    { name: 'תרגול דינמיקה', count: 143, context: 'שליטה בעוצמות' },
  ],
  keyInsights: [
    'ענבל מקדישה בממוצע 30% מהשיעור לטכניקה ו-40% לרפרטואר',
    'יש התאמה ברורה של הגישה לפי רמת התלמיד - מתחילים מקבלים יותר הסברים, מתקדמים יותר אתגרים',
    'השיטה מדגישה את הקשר בין הגוף לקול - כמעט כל תרגיל כולל מודעות גופנית',
    'יש דגש חזק על בניית ביטחון עצמי ולא רק על טכניקה',
    'ענבל משתמשת בהומור ואווירה קלילה כדי להפחית מתח ביצועי',
  ],
};

export const useMethodologyAnalysis = () => {
  return useQuery<MethodologyData, Error>({
    queryKey: ['analytics', 'methodology'],
    queryFn: async () => {
      // In production, this would call an Edge Function that uses Claude
      // to analyze transcript patterns. For now, return mock data.

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual Edge Function call:
      // const { data, error } = await supabase.functions.invoke('analyze-methodology');

      return MOCK_METHODOLOGY_DATA;
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1,
  });
};
