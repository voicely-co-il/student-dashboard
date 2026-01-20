import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingProblem {
  problem: string;
  frequency: number;
  relatable: boolean;
  sampleQuotes?: string[];
}

export interface Transformation {
  before: string;
  after: string;
  studentLevel: string;
  duration: string;
}

export interface MarketingStat {
  stat: string;
  value: string;
  context: string;
}

export interface MarketingQuote {
  text: string;
  context: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MarketingInsightsData {
  problems: MarketingProblem[];
  transformations: Transformation[];
  statistics: MarketingStat[];
  quotes: MarketingQuote[];
}

// Mock data for development - will be replaced with AI extraction
const MOCK_MARKETING_DATA: MarketingInsightsData = {
  problems: [
    {
      problem: 'אני מתבייש/ת לשיר מול אנשים',
      frequency: 156,
      relatable: true,
      sampleQuotes: [
        'כשמישהו שומע אותי שרה אני פשוט נחנקת',
        'בראש שלי זה נשמע טוב אבל כשאני שרה בקול זה משהו אחר',
      ],
    },
    {
      problem: 'אני לא יודע/ת אם יש לי קול טוב',
      frequency: 134,
      relatable: true,
      sampleQuotes: [
        'תמיד אמרו לי שאין לי קול',
        'אני לא בטוח שאני מסוגל להשתפר',
      ],
    },
    {
      problem: 'הקול שלי נשבר בתווים גבוהים',
      frequency: 98,
      relatable: true,
      sampleQuotes: [
        'כל פעם שאני מנסה להגיע לתווים גבוהים זה נשמע נורא',
        'יש לי גבול ואחריו הכל מתפרק',
      ],
    },
    {
      problem: 'אני לא מצליח/ה להחזיק נשימה ארוכה',
      frequency: 87,
      relatable: true,
      sampleQuotes: [
        'באמצע המשפט נגמר לי האוויר',
        'אני חייבת לעצור לנשום כל הזמן',
      ],
    },
    {
      problem: 'הקול שלי נשמע שטוח/משעמם',
      frequency: 76,
      relatable: true,
      sampleQuotes: [
        'אני שר את התווים הנכונים אבל זה לא מרגש',
        'חסר לי משהו בקול, אני לא יודע מה',
      ],
    },
  ],
  transformations: [
    {
      before: 'לא יכולתי לשיר מול אף אחד, אפילו לא מול המשפחה',
      after: 'הופעתי באירוע משפחתי ושרתי שיר שלם!',
      studentLevel: 'מתחילה',
      duration: '6 חודשים',
    },
    {
      before: 'הקול שלי היה נשבר בכל תו גבוה',
      after: 'עכשיו אני שרה תווים שחשבתי שלעולם לא אגיע אליהם',
      studentLevel: 'מתקדמת',
      duration: '8 חודשים',
    },
    {
      before: 'חשבתי שאין לי קול ושאני פשוט לא נולדתי לשיר',
      after: 'הבנתי שכל אחד יכול לשיר - זה עניין של טכניקה ותרגול',
      studentLevel: 'מתחיל',
      duration: '4 חודשים',
    },
    {
      before: 'הייתי מתבייש להקליט את עצמי',
      after: 'אני מעלה סרטונים שלי שר לרשתות החברתיות',
      studentLevel: 'מתקדם',
      duration: '12 חודשים',
    },
  ],
  statistics: [
    {
      stat: 'שיפור בביטחון',
      value: '94%',
      context: 'מהתלמידים מדווחים על שיפור משמעותי בביטחון הקולי',
    },
    {
      stat: 'הרחבת טווח',
      value: '+5 תווים',
      context: 'ממוצע הרחבת טווח אחרי 6 חודשי לימוד',
    },
    {
      stat: 'שביעות רצון',
      value: '4.9/5',
      context: 'דירוג ממוצע של תלמידים',
    },
    {
      stat: 'המשכיות',
      value: '87%',
      context: 'מהתלמידים ממשיכים מעבר ל-6 חודשים',
    },
    {
      stat: 'שיעורים',
      value: '828+',
      context: 'שיעורים פרטיים שהועברו',
    },
    {
      stat: 'ניסיון',
      value: '15+ שנים',
      context: 'ניסיון בהוראת שירה ופיתוח קול',
    },
  ],
  quotes: [
    {
      text: 'ענבל שינתה לי את החיים. לא רק את הקול - את הביטחון העצמי',
      context: 'אחרי שנה של לימודים',
      sentiment: 'positive',
    },
    {
      text: 'לראשונה בחיים אני נהנה לשמוע את עצמי שר',
      context: 'אחרי 6 חודשים',
      sentiment: 'positive',
    },
    {
      text: 'השיטה של ענבל פשוט עובדת. היא יודעת בדיוק מה צריך לתקן',
      context: 'תלמידה מתקדמת',
      sentiment: 'positive',
    },
    {
      text: 'בפעם הראשונה הרגשתי שמישהו באמת מאמין שאני יכול',
      context: 'תלמיד חדש',
      sentiment: 'positive',
    },
    {
      text: 'זה לא רק שיעורי שירה - זה טיפול בנשמה דרך הקול',
      context: 'תלמידה ותיקה',
      sentiment: 'positive',
    },
    {
      text: 'קיבלתי כלים פרקטיים שאני משתמש בהם כל יום',
      context: 'אחרי 3 חודשים',
      sentiment: 'positive',
    },
  ],
};

export const useMarketingInsights = () => {
  return useQuery<MarketingInsightsData, Error>({
    queryKey: ['analytics', 'marketing-insights'],
    queryFn: async () => {
      // In production, this would call an Edge Function that uses Claude
      // to extract marketing content. For now, return mock data.

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Replace with actual Edge Function call:
      // const { data, error } = await supabase.functions.invoke('generate-marketing-content');

      return MOCK_MARKETING_DATA;
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1,
  });
};
