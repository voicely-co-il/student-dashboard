import { useState } from "react";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBusinessMetrics } from "@/hooks/admin/useBusinessMetrics";

interface BusinessInsightsProps {
  vatRate?: number;
  incomeTaxRate?: number;
  socialSecurityRate?: number;
}

export default function BusinessInsights({
  vatRate = 0.18,
  incomeTaxRate = 0.30,
  socialSecurityRate = 0.12,
}: BusinessInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: metrics, isLoading } = useBusinessMetrics();

  const weeklyIncome = metrics?.weeklyIncome || 0;
  const weeklyExpenses = metrics?.weeklyExpenses || 0;
  const lessonsPerWeek = metrics?.lessonsPerWeek || 0;
  const avgPricePerLesson = metrics?.avgPricePerLesson || 195;
  const studentCount = metrics?.studentCount || 0;

  // Calculations
  const monthlyIncome = weeklyIncome * 4.33;
  const monthlyExpenses = weeklyExpenses * 4.33;

  // Net calculations
  const incomeAfterVat = monthlyIncome / (1 + vatRate);
  const incomeTax = incomeAfterVat * incomeTaxRate;
  const socialSecurity = incomeAfterVat * socialSecurityRate;
  const trueNetIncome = incomeAfterVat - incomeTax - socialSecurity - monthlyExpenses;

  // Business metrics
  const profitMargin = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const maxCapacity = 30;
  const capacityUsage = (lessonsPerWeek / maxCapacity) * 100;

  // Revenue per hour (assuming 45 min lessons)
  const hourlyRate = avgPricePerLesson * (60 / 45);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">טוען תובנות...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="w-full text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base font-semibold">תובנות עסקיות</CardTitle>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">נטו בכיס/חודש</span>
                </div>
                <div className="text-xl font-bold tabular-nums text-green-500" dir="ltr">
                  ₪{Math.round(trueNetIncome).toLocaleString()}
                </div>
              </div>
              <div className="bg-card border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">תעריף לשעה</span>
                </div>
                <div className="text-xl font-bold tabular-nums text-foreground" dir="ltr">
                  ₪{hourlyRate.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    שולי רווח
                  </span>
                  <span className="font-semibold text-foreground">{profitMargin.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(profitMargin, 100)} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    ניצולת קיבולת
                  </span>
                  <span className="font-semibold text-foreground">{lessonsPerWeek}/{maxCapacity} שיעורים</span>
                </div>
                <Progress value={capacityUsage} className="h-2" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-between text-sm pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="font-medium">{studentCount} תלמידים</span>
              </div>
              <div className="text-muted-foreground font-medium">
                ממוצע ₪{avgPricePerLesson}/שיעור
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
