import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CashflowSummaryBarProps {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  alertMinimum: number;
  periodCount: number;
  periodType: "weekly" | "monthly";
  vatRate?: number;
}

export default function CashflowSummaryBar({
  currentBalance,
  totalIncome,
  totalExpenses,
  alertMinimum,
  periodCount,
  periodType,
  vatRate = 0.18,
}: CashflowSummaryBarProps) {
  const isAlert = alertMinimum > 0 && currentBalance < alertMinimum;
  const avgIncome = periodCount > 0 ? totalIncome / periodCount : 0;
  const avgExpenses = periodCount > 0 ? totalExpenses / periodCount : 0;
  const periodLabel = periodType === "weekly" ? "שבועי" : "חודשי";

  // Calculate net income (after VAT)
  const netIncome = totalIncome / (1 + vatRate);
  const vatAmount = totalIncome - netIncome;

  return (
    <div className="sticky bottom-0 z-20 bg-background border-t shadow-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Current Balance */}
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">יתרה נוכחית:</span>
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
              מתחת לסף
            </Badge>
          )}
        </div>

        {/* Averages & VAT */}
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-muted-foreground">ממוצע {periodLabel}:</span>
                  <span className="text-sm font-medium text-green-600" dir="ltr">
                    ₪{Math.round(avgIncome).toLocaleString("he-IL")}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>הכנסה ברוטו (כולל מע"מ)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-muted-foreground">נטו:</span>
                  <span className="text-sm font-medium text-blue-600" dir="ltr">
                    ₪{Math.round(netIncome).toLocaleString("he-IL")}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>הכנסה נטו (אחרי ניכוי {vatRate * 100}% מע"מ)</p>
                <p className="text-xs text-muted-foreground">מע"מ לתשלום: ₪{Math.round(vatAmount).toLocaleString("he-IL")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-muted-foreground">הוצאות:</span>
            <span className="text-sm font-medium text-red-600" dir="ltr">
              ₪{Math.round(avgExpenses).toLocaleString("he-IL")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
