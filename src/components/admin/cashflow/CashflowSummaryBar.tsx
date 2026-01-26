import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Receipt, Calculator } from "lucide-react";
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
  incomeTaxRate?: number;
  socialSecurityRate?: number;
}

export default function CashflowSummaryBar({
  currentBalance,
  totalIncome,
  totalExpenses,
  alertMinimum,
  periodCount,
  periodType,
  vatRate = 0.18,
  incomeTaxRate = 0.30,
  socialSecurityRate = 0.12,
}: CashflowSummaryBarProps) {
  const isAlert = alertMinimum > 0 && currentBalance < alertMinimum;
  const avgIncome = periodCount > 0 ? totalIncome / periodCount : 0;
  const avgExpenses = periodCount > 0 ? totalExpenses / periodCount : 0;
  const periodLabel = periodType === "weekly" ? "שבועי" : "חודשי";

  // Step 1: Remove VAT to get net before tax
  const incomeBeforeTax = totalIncome / (1 + vatRate);
  const vatAmount = totalIncome - incomeBeforeTax;

  // Step 2: Calculate taxes on net income (after VAT)
  const incomeTax = incomeBeforeTax * incomeTaxRate;
  const socialSecurity = incomeBeforeTax * socialSecurityRate;

  // Step 3: True net income (after all deductions)
  const trueNetIncome = incomeBeforeTax - incomeTax - socialSecurity;

  // Total tax burden
  const totalTaxes = vatAmount + incomeTax + socialSecurity;
  const effectiveTaxRate = totalIncome > 0 ? (totalTaxes / totalIncome) * 100 : 0;

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

        {/* Income & Tax Calculations */}
        <div className="flex items-center gap-4">
          {/* Gross Income */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-muted-foreground">ברוטו {periodLabel}:</span>
                  <span className="text-sm font-medium text-green-600" dir="ltr">
                    ₪{Math.round(avgIncome).toLocaleString("he-IL")}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>הכנסה ברוטו (כולל מע"מ)</p>
                <p className="text-xs text-muted-foreground">
                  סה"כ: ₪{Math.round(totalIncome).toLocaleString("he-IL")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* True Net Income */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-muted-foreground">נטו אמיתי:</span>
                  <span className="text-sm font-bold text-blue-600" dir="ltr">
                    ₪{Math.round(trueNetIncome).toLocaleString("he-IL")}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">פירוט חישוב נטו:</p>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between gap-4">
                      <span>ברוטו (כולל מע"מ):</span>
                      <span dir="ltr">₪{Math.round(totalIncome).toLocaleString("he-IL")}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-red-500">
                      <span>− מע"מ ({(vatRate * 100).toFixed(0)}%):</span>
                      <span dir="ltr">₪{Math.round(vatAmount).toLocaleString("he-IL")}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-red-500">
                      <span>− מס הכנסה ({(incomeTaxRate * 100).toFixed(0)}%):</span>
                      <span dir="ltr">₪{Math.round(incomeTax).toLocaleString("he-IL")}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-red-500">
                      <span>− ביטוח לאומי ({(socialSecurityRate * 100).toFixed(0)}%):</span>
                      <span dir="ltr">₪{Math.round(socialSecurity).toLocaleString("he-IL")}</span>
                    </div>
                    <div className="border-t pt-1 mt-1 flex justify-between gap-4 font-medium">
                      <span>= נטו אמיתי:</span>
                      <span dir="ltr" className="text-blue-600">₪{Math.round(trueNetIncome).toLocaleString("he-IL")}</span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Tax Summary */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Calculator className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-xs text-muted-foreground">מסים:</span>
                  <span className="text-sm font-medium text-orange-600" dir="ltr">
                    {effectiveTaxRate.toFixed(0)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">סה"כ מסים: ₪{Math.round(totalTaxes).toLocaleString("he-IL")}</p>
                  <div className="text-xs text-muted-foreground">
                    <p>מע"מ: ₪{Math.round(vatAmount).toLocaleString("he-IL")}</p>
                    <p>מס הכנסה: ₪{Math.round(incomeTax).toLocaleString("he-IL")}</p>
                    <p>ביטוח לאומי: ₪{Math.round(socialSecurity).toLocaleString("he-IL")}</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Expenses */}
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
