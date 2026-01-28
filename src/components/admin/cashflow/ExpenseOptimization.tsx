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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useExpenseAnalysis, Recommendation, Expense } from "@/hooks/admin/useExpenseAnalysis";

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const priorityConfig = {
    high: { color: "border-r-red-500", icon: AlertTriangle, iconColor: "text-red-500" },
    medium: { color: "border-r-yellow-500", icon: Lightbulb, iconColor: "text-yellow-500" },
    low: { color: "border-r-blue-500", icon: Sparkles, iconColor: "text-blue-500" },
  };

  const config = priorityConfig[rec.priority];
  const Icon = config.icon;

  return (
    <div className={`bg-card border border-border/50 rounded-lg p-3 border-r-4 ${config.color}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-foreground">{rec.title}</span>
            {rec.potentialSaving > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold">
                ₪{rec.potentialSaving.toLocaleString("he-IL")}/שנה
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseOptimization() {
  const { data, isLoading, error, refetch } = useExpenseAnalysis();
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">מנתח הוצאות...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">לא ניתן לטעון ניתוח</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { recommendations, totalPotentialSaving, allExpenses = [], summary } = data;

  return (
    <Card className="border-border/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="w-full text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-base font-semibold">ניתוח הוצאות</CardTitle>
                  {totalPotentialSaving > 0 && (
                    <Badge className="text-xs bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
                      חיסכון: ₪{totalPotentialSaving.toLocaleString("he-IL")}/שנה
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      refetch();
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* All Expenses - Detailed List */}
            {allExpenses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center justify-between">
                  <span>כלים ותוכנות ({allExpenses.length})</span>
                  <span className="text-primary font-bold" dir="ltr">
                    סה״כ: ₪{summary.monthlyExpenses.toLocaleString("he-IL")}/חודש
                  </span>
                </h4>
                <div className="bg-muted/30 rounded-lg border border-border/50 divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                  {allExpenses.map((expense, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-foreground">{expense.name}</span>
                      <span className="font-semibold tabular-nums text-foreground text-sm" dir="ltr">
                        ₪{expense.monthlyCost.toLocaleString("he-IL")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  המלצות ({recommendations.length})
                </h4>
                <div className="space-y-2">
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <RecommendationItem key={i} rec={rec} />
                  ))}
                </div>
              </div>
            )}

            {recommendations.length === 0 && allExpenses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                אין מספיק נתונים לניתוח
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
