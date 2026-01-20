import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchetypeTrait {
  name: string;
  score: number;
}

export interface StudentArchetype {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  characteristics: string[];
  challenges: string[];
  recommendedApproach: string;
  traits?: ArchetypeTrait[];
}

export interface ArchetypesData {
  totalStudents: number;
  archetypes: StudentArchetype[];
}

// Mock data for development - will be replaced with AI clustering
const MOCK_ARCHETYPES_DATA: ArchetypesData = {
  totalStudents: 127,
  archetypes: [
    {
      id: 'perfectionist',
      name: 'הפרפקציוניסט/ית',
      description: 'תלמידים שמתמקדים בדיוק טכני ולפעמים מתקשים "לשחרר" ולהנות',
      studentCount: 34,
      characteristics: [
        'מאוד ביקורתיים כלפי עצמם',
        'רוצים להבין את התיאוריה',
        'מתאמנים הרבה בבית',
        'מתוסכלים מטעויות',
      ],
      challenges: [
        'קושי להתחבר לרגש בשירה',
        'מתח יתר בזמן ביצוע',
        'פחד מטעויות',
      ],
      recommendedApproach:
        'לתת הרבה מקום לטעויות, להדגיש שהטעויות הן חלק מהתהליך. להתמקד בהנאה ופחות בתוצאה.',
      traits: [
        { name: 'טכניקה', score: 90 },
        { name: 'תרגול', score: 85 },
        { name: 'ביטחון', score: 45 },
        { name: 'ביטוי רגשי', score: 55 },
        { name: 'גמישות', score: 40 },
      ],
    },
    {
      id: 'expressive',
      name: 'המבטא/ת רגשית',
      description: 'תלמידים שמתחברים מאוד לרגש ולביטוי, אבל פחות לטכניקה',
      studentCount: 28,
      characteristics: [
        'מתרגשים מהמוזיקה',
        'שרים עם הרבה רגש',
        'פחות סבלניים לתרגילים טכניים',
        'מאוד יצירתיים',
      ],
      challenges: [
        'שליטה בטכניקה בסיסית',
        'עקביות באימונים',
        'ניהול נשימה',
      ],
      recommendedApproach:
        'לשלב את הטכניקה בתוך השירים שהם אוהבים. להסביר איך טכניקה טובה מאפשרת ביטוי עוד יותר חזק.',
      traits: [
        { name: 'טכניקה', score: 50 },
        { name: 'תרגול', score: 55 },
        { name: 'ביטחון', score: 75 },
        { name: 'ביטוי רגשי', score: 95 },
        { name: 'גמישות', score: 80 },
      ],
    },
    {
      id: 'busy-pro',
      name: 'המקצוען/ית העסוק/ה',
      description: 'תלמידים עם קריירה תובענית שרוצים לשיר כתחביב אבל עם זמן מוגבל',
      studentCount: 25,
      characteristics: [
        'ממוקדי מטרה',
        'זמן מוגבל לתרגול',
        'רוצים תוצאות מהירות',
        'מאוד מאורגנים',
      ],
      challenges: [
        'מציאת זמן לתרגול',
        'סבלנות לתהליך ארוך',
        'התנתקות מלחץ היומיום',
      ],
      recommendedApproach:
        'לתת תרגילים קצרים ואפקטיביים. להתמקד ב"ניצחונות מהירים". לעזור למצוא רגעי תרגול קצרים ביום.',
      traits: [
        { name: 'טכניקה', score: 65 },
        { name: 'תרגול', score: 40 },
        { name: 'ביטחון', score: 70 },
        { name: 'ביטוי רגשי', score: 60 },
        { name: 'גמישות', score: 85 },
      ],
    },
    {
      id: 'beginner',
      name: 'המתחיל/ה המסור/ה',
      description: 'תלמידים חדשים עם מוטיבציה גבוהה ורצון ללמוד מהיסוד',
      studentCount: 23,
      characteristics: [
        'סקרנים ופתוחים',
        'מתאמנים כפי שנאמר להם',
        'שואלים הרבה שאלות',
        'לפעמים חסרי ביטחון',
      ],
      challenges: [
        'בניית שגרת תרגול',
        'התמודדות עם תסכול ראשוני',
        'פיתוח "אוזן מוזיקלית"',
      ],
      recommendedApproach:
        'לתת הרבה חיזוקים. לבנות את הביטחון בהדרגה. להראות התקדמות בדרכים מוחשיות.',
      traits: [
        { name: 'טכניקה', score: 30 },
        { name: 'תרגול', score: 70 },
        { name: 'ביטחון', score: 40 },
        { name: 'ביטוי רגשי', score: 50 },
        { name: 'גמישות', score: 90 },
      ],
    },
    {
      id: 'comeback',
      name: 'החוזר/ת לשירה',
      description: 'תלמידים ששרו בעבר וחוזרים אחרי הפסקה ארוכה',
      studentCount: 17,
      characteristics: [
        'יש להם רקע מוזיקלי',
        'ציפיות מעצמם',
        'לפעמים מתוסכלים מהמרחק בין הזיכרון ליכולת',
        'מחויבים להצלחה',
      ],
      challenges: [
        'פער בין היכולת הקודמת לנוכחית',
        'הרגלים ישנים שצריך לשנות',
        'סבלנות לתהליך השיקום',
      ],
      recommendedApproach:
        'להכיר בניסיון הקודם. לעזור לבנות מחדש בצורה נכונה. להדגיש שזה נורמלי שלוקח זמן.',
      traits: [
        { name: 'טכניקה', score: 55 },
        { name: 'תרגול', score: 65 },
        { name: 'ביטחון', score: 50 },
        { name: 'ביטוי רגשי', score: 70 },
        { name: 'גמישות', score: 60 },
      ],
    },
  ],
};

export const useStudentArchetypes = () => {
  return useQuery<ArchetypesData, Error>({
    queryKey: ['analytics', 'archetypes'],
    queryFn: async () => {
      // In production, this would call an Edge Function that uses Claude
      // to cluster students. For now, return mock data.

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual Edge Function call:
      // const { data, error } = await supabase.functions.invoke('cluster-students');

      return MOCK_ARCHETYPES_DATA;
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1,
  });
};
