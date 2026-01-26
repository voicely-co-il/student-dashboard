import { useState } from "react";
import {
  Lightbulb,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  PiggyBank,
  Target,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useExpenseAnalysis, Recommendation } from "@/hooks/admin/useExpenseAnalysis";

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const priorityConfig = {
    high: { color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle, label: "דחוף" },
    medium: { color: "text-amber-600 bg-amber-50 border-amber-200", icon: Lightbulb, label: "מומלץ" },
    low: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Sparkles, label: "הזדמנות" },
  };

  const typeConfig = {
    warning: { icon: AlertTriangle, bg: "bg-red-500" },
    suggestion: { icon: Lightbulb, bg: "bg-amber-500" },
    opportunity: { icon: Sparkles, bg: "bg-green-500" },
  };

  const config = priorityConfig[rec.priority];
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`rounded-lg border p-3 ${config.color}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-right">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{rec.title}</span>
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {rec.potentialSaving > 0 && (
                  <span className="text-sm font-bold text-green-700" dir="ltr">
                    ₪{rec.potentialSaving.toLocaleString("he-IL")}/שנה
                  </span>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 pt-2 border-t border-current/10">
          <p className="text-sm mb-2">{rec.description}</p>
          <div className="flex items-start gap-2 text-sm">
            <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{rec.action}</span>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function ExpenseOptimization() {
  const { data, isLoading, error, refetch } = useExpenseAnalysis();
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="mr-2 text-muted-foreground">מנתח הוצאות...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="mt-6">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-2">לא ניתן לטעון ניתוח הוצאות</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, recommendations, totalPotentialSaving, top5Expenses } = data;

  return (
    <Card className="mt-6 border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="w-full text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-amber-600" />
                  <CardTitle className="text-lg">אופטימיזציית הוצאות</CardTitle>
                  <Badge className="bg-green-600">
                    חיסכון פוטנציאלי: ₪{totalPotentialSaving.toLocaleString("he-IL")}/שנה
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      refetch();
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  הכנסה חודשית
                </div>
                <div className="text-xl font-bold text-green-600" dir="ltr">
                  ₪{summary.monthlyIncome.toLocaleString("he-IL")}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  הוצאות חודשיות
                </div>
                <div className="text-xl font-bold text-red-600" dir="ltr">
                  ₪{summary.monthlyExpenses.toLocaleString("he-IL")}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  רווח גולמי
                </div>
                <div className="text-xl font-bold text-blue-600" dir="ltr">
                  ₪{summary.grossProfit.toLocaleString("he-IL")}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  יחס הוצאות
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold">{summary.expenseRatio}%</div>
                  <Progress
                    value={summary.expenseRatio}
                    className="h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                המלצות לחיסכון ({recommendations.length})
              </h3>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} index={i} />
                ))}
              </div>
            </div>

            {/* Top 5 Expenses */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                5 ההוצאות הגדולות
              </h3>
              <div className="space-y-2">
                {top5Expenses.map((expense, i) => {
                  const percent = Math.round((expense.monthlyCost / summary.monthlyExpenses) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-4">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{expense.name}</span>
                          <span className="font-medium" dir="ltr">
                            ₪{expense.monthlyCost.toLocaleString("he-IL")}
                          </span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-left">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
