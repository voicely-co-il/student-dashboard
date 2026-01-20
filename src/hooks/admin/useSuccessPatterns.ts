import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuccessFactor {
  factor: string;
  correlation: number; // 0-1
  description: string;
  evidence?: string[];
}

export interface EffectiveTechnique {
  technique: string;
  successRate: number;
}

export interface LessonPattern {
  pattern: string;
  impact: string;
}

export interface SuccessPatternsData {
  analyzedStudents: number;
  successfulStudents: number;
  avgProgressDelta: number;
  successFactors: SuccessFactor[];
  effectiveTechniques: EffectiveTechnique[];
  optimalLessonPatterns: LessonPattern[];
}

// Mock data for development - will be replaced with AI analysis
const MOCK_SUCCESS_DATA: SuccessPatternsData = {
  analyzedStudents: 127,
  successfulStudents: 45,
  avgProgressDelta: 23,
  successFactors: [
    {
      factor: 'תרגול יומי קבוע',
      correlation: 0.89,
      description: 'תלמידים שמתרגלים לפחות 15 דקות ביום מראים התקדמות משמעותית יותר',
      evidence: [
        'תלמידים עם streak של 30+ ימים התקדמו פי 2 מאחרים',
        'גם תרגול קצר (10 דק\') יומי עדיף על תרגול ארוך פעמיים בשבוע',
      ],
    },
    {
      factor: 'שיעורים קבועים (שבועיים)',
      correlation: 0.82,
      description: 'תדירות שיעורים קבועה מעלה משמעותית את קצב ההתקדמות',
      evidence: [
        'תלמידים עם שיעור קבוע כל שבוע התקדמו מהר יותר',
        'הפסקות של יותר משבועיים פגעו בהתקדמות',
      ],
    },
    {
      factor: 'הקלטה עצמית',
      correlation: 0.76,
      description: 'תלמידים שמקליטים את עצמם ושולחים משוב לענבל מתקדמים מהר יותר',
      evidence: [
        'ההקלטה מאפשרת זיהוי בעיות שהתלמיד לא שומע בזמן אמת',
        'מגבירה מודעות עצמית ואחריות',
      ],
    },
    {
      factor: 'גישה חיובית לטעויות',
      correlation: 0.71,
      description: 'תלמידים שמקבלים טעויות כחלק מהתהליך מתקדמים מהר יותר',
      evidence: [
        'פחות חרדת ביצוע = יותר חופש להתנסות',
        'למידה מטעויות במקום הימנעות',
      ],
    },
    {
      factor: 'יעדים ברורים',
      correlation: 0.68,
      description: 'תלמידים עם יעד ספציפי (אירוע, שיר) מתקדמים מהר יותר',
      evidence: [
        'מוטיבציה גבוהה יותר כשיש deadline',
        'מיקוד באימון יעיל יותר',
      ],
    },
    {
      factor: 'עבודה על נשימה',
      correlation: 0.65,
      description: 'תלמידים שמשקיעים בתרגילי נשימה רואים שיפור כולל',
      evidence: [
        'נשימה היא הבסיס לכל שאר הטכניקות',
        'שיפור בנשימה = שיפור בשליטה, טווח ויציבות',
      ],
    },
  ],
  effectiveTechniques: [
    { technique: 'Lip Trills יומיים', successRate: 87 },
    { technique: 'תרגילי נשימה סרעפתית', successRate: 84 },
    { technique: 'שירת סקאלות איטיות', successRate: 79 },
    { technique: 'הקלטה ושליחת משוב', successRate: 76 },
    { technique: 'עבודה על שיר אחד עד שלמות', successRate: 72 },
  ],
  optimalLessonPatterns: [
    {
      pattern: 'חימום ממוקד (5 דק\') + טכניקה (15 דק\') + שיר (15 דק\')',
      impact: 'מאזן אופטימלי בין פיתוח טכני ליישום מעשי',
    },
    {
      pattern: 'חזרה על נקודות מהשיעור הקודם בתחילת כל שיעור',
      impact: 'מחזק את הלמידה ומראה התקדמות',
    },
    {
      pattern: 'סיום בנימה חיובית (משהו שהתלמיד עושה טוב)',
      impact: 'בונה מוטיבציה וביטחון להמשך',
    },
    {
      pattern: 'מתן 2-3 משימות ספציפיות לתרגול בבית',
      impact: 'מיקוד התרגול הביתי לאפקטיביות מקסימלית',
    },
  ],
};

export const useSuccessPatterns = () => {
  return useQuery<SuccessPatternsData, Error>({
    queryKey: ['analytics', 'success-patterns'],
    queryFn: async () => {
      // In production, this would call an Edge Function that uses Claude
      // to analyze success patterns. For now, return mock data.

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual Edge Function call:
      // const { data, error } = await supabase.functions.invoke('identify-success-patterns');

      return MOCK_SUCCESS_DATA;
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1,
  });
};
