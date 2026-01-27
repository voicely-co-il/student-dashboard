import { useState } from "react";
import {
  TrendingUp,
  Users,
  Target,
  Zap,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Clock,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBusinessMetrics } from "@/hooks/admin/useBusinessMetrics";

interface BusinessInsightsProps {
  vatRate?: number;
  incomeTaxRate?: number;
  socialSecurityRate?: number;
}

interface Insight {
  type: "growth" | "warning" | "opportunity" | "milestone";
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
  action?: string;
  progress?: number;
}

export default function BusinessInsights({
  vatRate = 0.18,
  incomeTaxRate = 0.30,
  socialSecurityRate = 0.12,
}: BusinessInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: metrics, isLoading } = useBusinessMetrics();

  const weeklyIncome = metrics?.weeklyIncome || 3000;
  const weeklyExpenses = metrics?.weeklyExpenses || 843;
  const lessonsPerWeek = metrics?.lessonsPerWeek || 16;
  const avgPricePerLesson = metrics?.avgPricePerLesson || 195;
  const studentCount = metrics?.studentCount || 15;

  // Calculations
  const monthlyIncome = weeklyIncome * 4.33;
  const monthlyExpenses = weeklyExpenses * 4.33;

  // Net calculations
  const incomeAfterVat = monthlyIncome / (1 + vatRate);
  const incomeTax = incomeAfterVat * incomeTaxRate;
  const socialSecurity = incomeAfterVat * socialSecurityRate;
  const trueNetIncome = incomeAfterVat - incomeTax - socialSecurity - monthlyExpenses;

  // Business metrics
  const profitMargin = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
  const lessonsToBreakEven = Math.ceil(monthlyExpenses / avgPricePerLesson);
  const maxCapacity = 30; // Assuming 30 lessons/week max
  const capacityUsage = (lessonsPerWeek / maxCapacity) * 100;
  const avgIncomePerStudent = monthlyIncome / studentCount;

  // Growth targets
  const targetMonthlyIncome = 20000;
  const incomeProgress = (monthlyIncome / targetMonthlyIncome) * 100;
  const lessonsNeededForTarget = Math.ceil(targetMonthlyIncome / 4.33 / avgPricePerLesson);

  // Revenue per hour (assuming 45 min lessons)
  const hourlyRate = avgPricePerLesson * (60 / 45);

  const insights: Insight[] = [
    // Growth Insights
    {
      type: "growth",
      icon: Target,
      title: "יעד הכנסה חודשי",
      value: `${incomeProgress.toFixed(0)}%`,
      description: `₪${monthlyIncome.toLocaleString()} מתוך ₪${targetMonthlyIncome.toLocaleString()}`,
      action: lessonsNeededForTarget > lessonsPerWeek
        ? `צריך עוד ${lessonsNeededForTarget - lessonsPerWeek} שיעורים בשבוע להגיע ליעד`
        : "הגעת ליעד! שקול להעלות אותו",
      progress: Math.min(incomeProgress, 100),
    },
    {
      type: "growth",
      icon: BarChart3,
      title: "ניצולת קיבולת",
      value: `${capacityUsage.toFixed(0)}%`,
      description: `${lessonsPerWeek} שיעורים מתוך ${maxCapacity} מקסימום`,
      action: capacityUsage < 70 ? "יש מקום לגדול! שקול להוסיף תלמידים" : "קרוב לקיבולת מלאה",
      progress: capacityUsage,
    },

    // Financial Health
    {
      type: capacityUsage > 50 ? "milestone" : "warning",
      icon: DollarSign,
      title: "נקודת איזון",
      value: `${lessonsToBreakEven} שיעורים`,
      description: `צריך ${lessonsToBreakEven} שיעורים/חודש לכסות הוצאות`,
      action: `אתה ב-${((lessonsPerWeek * 4.33) / lessonsToBreakEven * 100).toFixed(0)}% מעל נקודת האיזון`,
    },
    {
      type: profitMargin > 60 ? "milestone" : "opportunity",
      icon: TrendingUp,
      title: "שולי רווח גולמי",
      value: `${profitMargin.toFixed(0)}%`,
      description: `רווח גולמי: ₪${(monthlyIncome - monthlyExpenses).toLocaleString()}`,
      action: profitMargin > 70 ? "מצוין! שולי רווח בריאים" : "יש מקום לשיפור יעילות",
      progress: profitMargin,
    },

    // Pricing Insights
    {
      type: "opportunity",
      icon: Clock,
      title: "תעריף לשעה",
      value: `₪${hourlyRate.toFixed(0)}`,
      description: `ממוצע ₪${avgPricePerLesson} לשיעור 45 דק'`,
      action: hourlyRate < 250 ? "שקול העלאת מחירים בהדרגה" : "תעריף תחרותי טוב",
    },
    {
      type: "growth",
      icon: Users,
      title: "הכנסה לתלמיד",
      value: `₪${avgIncomePerStudent.toFixed(0)}`,
      description: `ממוצע חודשי מ-${studentCount} תלמידים`,
      action: "הגדל תדירות שיעורים או הוסף שירותים",
    },

    // Income Goals
    {
      type: "opportunity",
      icon: UserPlus,
      title: "פוטנציאל גידול",
      value: `+₪${((maxCapacity - lessonsPerWeek) * avgPricePerLesson * 4.33).toLocaleString()}`,
      description: `אם תמלא את הקיבולת`,
      action: `עוד ${maxCapacity - lessonsPerWeek} שיעורים בשבוע אפשריים`,
    },
    {
      type: trueNetIncome > 8000 ? "milestone" : "warning",
      icon: Sparkles,
      title: "נטו אמיתי בכיס",
      value: `₪${trueNetIncome.toLocaleString()}`,
      description: "אחרי מע״מ, מסים, הוצאות",
      action: `זה ${((trueNetIncome / monthlyIncome) * 100).toFixed(0)}% מהברוטו`,
    },
  ];

  const typeConfig = {
    growth: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-600" },
    warning: { bg: "bg-red-50 border-red-200", icon: "text-red-600" },
    opportunity: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600" },
    milestone: { bg: "bg-green-50 border-green-200", icon: "text-green-600" },
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed border-blue-300">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="mr-2 text-muted-foreground">טוען תובנות...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="w-full text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">תובנות עסקיות</CardTitle>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    יועץ AI
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-lg p-3 border text-center">
                <div className="text-2xl font-bold text-green-600" dir="ltr">
                  ₪{Math.round(trueNetIncome).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">נטו בכיס/חודש</div>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lessonsPerWeek}
                </div>
                <div className="text-xs text-muted-foreground">שיעורים/שבוע</div>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <div className="text-2xl font-bold text-purple-600" dir="ltr">
                  ₪{hourlyRate.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">לשעה</div>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {profitMargin.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">שולי רווח</div>
              </div>
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, i) => {
                const Icon = insight.icon;
                const config = typeConfig[insight.type];
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${config.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-white ${config.icon}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{insight.title}</span>
                          <span className="text-lg font-bold" dir="ltr">{insight.value}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{insight.description}</p>
                        {insight.progress !== undefined && (
                          <Progress value={insight.progress} className="h-1.5 mb-1" />
                        )}
                        {insight.action && (
                          <p className="text-xs font-medium text-foreground/80">
                            💡 {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Items */}
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                המלצות לפעולה מיידית
              </h4>
              <ul className="space-y-1 text-sm">
                {lessonsPerWeek < 20 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    הוסף {20 - lessonsPerWeek} שיעורים בשבוע להגיע ל-₪17,000/חודש
                  </li>
                )}
                {avgPricePerLesson < 200 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    העלה מחירים ב-10% לתלמידים חדשים
                  </li>
                )}
                {capacityUsage < 60 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    יש {maxCapacity - lessonsPerWeek} סלוטים פנויים - שקול קמפיין שיווקי
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  צור קורס דיגיטלי להכנסה פסיבית
                </li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
