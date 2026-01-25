import { AlertTriangle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CashflowSummaryBarProps {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  alertMinimum: number;
  periodCount: number;
  periodType: "weekly" | "monthly";
}

export default function CashflowSummaryBar({
  currentBalance,
  totalIncome,
  totalExpenses,
  alertMinimum,
  periodCount,
  periodType,
}: CashflowSummaryBarProps) {
  const isAlert = alertMinimum > 0 && currentBalance < alertMinimum;
  const avgIncome = periodCount > 0 ? totalIncome / periodCount : 0;
  const avgExpenses = periodCount > 0 ? totalExpenses / periodCount : 0;
  const periodLabel = periodType === "weekly" ? "weekly" : "monthly";

  return (
    <div className="sticky bottom-0 z-20 bg-background border-t shadow-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Current Balance */}
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Current Balance:</span>
          <span
            className={`text-lg font-bold ${
              currentBalance < 0
                ? "text-red-600"
                : isAlert
                ? "text-orange-600"
                : "text-green-600"
            }`}
            dir="ltr"
          >
            ₪{currentBalance.toLocaleString("he-IL")}
          </span>
          {isAlert && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Below Threshold
            </Badge>
          )}
        </div>

        {/* Averages */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-muted-foreground">Avg {periodLabel} income:</span>
            <span className="text-sm font-medium text-green-600" dir="ltr">
              ₪{Math.round(avgIncome).toLocaleString("he-IL")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-muted-foreground">Avg {periodLabel} expense:</span>
            <span className="text-sm font-medium text-red-600" dir="ltr">
              ₪{Math.round(avgExpenses).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
