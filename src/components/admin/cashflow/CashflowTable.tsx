import { useState, useCallback, useMemo } from "react";
import {
  CashflowCategory,
  CashflowEntry,
  useUpsertEntry,
  formatPeriodLabel,
} from "@/hooks/admin/useCashflow";

interface CashflowTableProps {
  categories: CashflowCategory[];
  entries: CashflowEntry[];
  periods: string[];
  periodType: "weekly" | "monthly";
  openingBalance: number;
  alertMinimum: number;
}

function EditableCell({
  value,
  onSave,
}: {
  value: number;
  onSave: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const handleClick = () => {
    setInputVal(value === 0 ? "" : String(value));
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const num = parseFloat(inputVal) || 0;
    if (num !== value) {
      onSave(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full h-full px-1 py-0.5 text-sm text-center bg-white dark:bg-gray-800 border border-amber-400 rounded outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        dir="ltr"
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer px-1 py-0.5 text-sm text-center hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded min-h-[28px] flex items-center justify-center"
      dir="ltr"
    >
      {value !== 0 ? value.toLocaleString("he-IL") : "—"}
    </div>
  );
}

function SummaryCell({ value, alertMinimum }: { value: number; alertMinimum?: number }) {
  const isNegative = value < 0;
  const isBelowAlert = alertMinimum !== undefined && alertMinimum > 0 && value < alertMinimum;

  return (
    <div
      className={`px-1 py-0.5 text-sm font-bold text-center ${
        isNegative || isBelowAlert
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400"
      }`}
      dir="ltr"
    >
      {value.toLocaleString("he-IL")}
    </div>
  );
}

export default function CashflowTable({
  categories,
  entries,
  periods,
  periodType,
  openingBalance,
  alertMinimum,
}: CashflowTableProps) {
  const upsertEntry = useUpsertEntry();

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );
  const otherExpenseCategories = useMemo(
    () => categories.filter((c) => c.type === "other_expense"),
    [categories]
  );

  // Build lookup: category_id + period_start → amount
  const entryMap = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => {
      map[`${e.category_id}_${e.period_start}`] = Number(e.amount);
    });
    return map;
  }, [entries]);

  const getAmount = useCallback(
    (categoryId: string, period: string) => {
      return entryMap[`${categoryId}_${period}`] || 0;
    },
    [entryMap]
  );

  const handleSave = useCallback(
    (categoryId: string, period: string, amount: number) => {
      upsertEntry.mutate({
        category_id: categoryId,
        period_type: periodType,
        period_start: period,
        amount,
      });
    },
    [upsertEntry, periodType]
  );

  // Calculate totals per period
  const calculations = useMemo(() => {
    return periods.map((period, idx) => {
      const totalIncome = incomeCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalExpenses = expenseCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalOtherExpenses = otherExpenseCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalCashOut = totalExpenses + totalOtherExpenses;

      // Opening balance: first period uses settings value, rest use prev closing
      let opening = openingBalance;
      if (idx > 0) {
        // Use previous period's closing balance
        const prevCalc = getCalcForPeriod(idx - 1);
        opening = prevCalc.closing;
      }

      const totalAvailable = opening + totalIncome;
      const closing = totalAvailable - totalCashOut;

      return {
        period,
        opening,
        totalIncome,
        totalAvailable,
        totalExpenses,
        totalOtherExpenses,
        totalCashOut,
        closing,
      };
    });

    function getCalcForPeriod(idx: number) {
      const period = periods[idx];
      const totalIncome = incomeCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalExpenses = expenseCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalOtherExpenses = otherExpenseCategories.reduce(
        (sum, cat) => sum + getAmount(cat.id, period),
        0
      );
      const totalCashOut = totalExpenses + totalOtherExpenses;

      let opening = openingBalance;
      if (idx > 0) {
        const prev = getCalcForPeriod(idx - 1);
        opening = prev.closing;
      }
      const totalAvailable = opening + totalIncome;
      const closing = totalAvailable - totalCashOut;
      return { opening, totalIncome, totalAvailable, totalExpenses, totalOtherExpenses, totalCashOut, closing };
    }
  }, [periods, incomeCategories, expenseCategories, otherExpenseCategories, getAmount, openingBalance]);

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full border-collapse min-w-[900px]">
        <thead>
          {/* Period headers */}
          <tr className="bg-muted/50">
            <th className="sticky right-0 z-10 bg-muted/50 text-right px-3 py-2 text-sm font-medium border-b border-l w-[180px] min-w-[180px]">
              Category
            </th>
            {periods.map((period) => (
              <th
                key={period}
                className="px-2 py-2 text-center text-xs font-medium border-b border-l min-w-[90px]"
              >
                {formatPeriodLabel(period, periodType)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Opening Balance Row */}
          <tr className="bg-blue-50 dark:bg-blue-900/20">
            <td className="sticky right-0 z-10 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-sm font-semibold border-b border-l">
              Opening Balance
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                <SummaryCell value={calc.opening} />
              </td>
            ))}
          </tr>

          {/* Income Section Header */}
          <tr className="bg-green-50 dark:bg-green-900/20">
            <td
              colSpan={periods.length + 1}
              className="px-3 py-1.5 text-sm font-bold text-green-700 dark:text-green-300 border-b"
            >
              Income
            </td>
          </tr>

          {/* Income Categories */}
          {incomeCategories.map((cat) => (
            <tr key={cat.id} className="hover:bg-muted/30">
              <td className="sticky right-0 z-10 bg-background px-3 py-1 text-sm border-b border-l">
                {cat.name}
              </td>
              {periods.map((period) => (
                <td key={period} className="px-1 py-1 border-b border-l">
                  <EditableCell
                    value={getAmount(cat.id, period)}
                    onSave={(val) => handleSave(cat.id, period, val)}
                  />
                </td>
              ))}
            </tr>
          ))}

          {/* Total Income */}
          <tr className="bg-green-50/50 dark:bg-green-900/10 font-semibold">
            <td className="sticky right-0 z-10 bg-green-50/50 dark:bg-green-900/10 px-3 py-1.5 text-sm border-b border-l">
              Total Income
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                <SummaryCell value={calc.totalIncome} />
              </td>
            ))}
          </tr>

          {/* Total Available */}
          <tr className="bg-blue-50/50 dark:bg-blue-900/10 font-semibold">
            <td className="sticky right-0 z-10 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 text-sm border-b border-l">
              Total Cash Available
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                <SummaryCell value={calc.totalAvailable} />
              </td>
            ))}
          </tr>

          {/* Expense Section Header */}
          <tr className="bg-red-50 dark:bg-red-900/20">
            <td
              colSpan={periods.length + 1}
              className="px-3 py-1.5 text-sm font-bold text-red-700 dark:text-red-300 border-b"
            >
              Expenses
            </td>
          </tr>

          {/* Expense Categories */}
          {expenseCategories.map((cat) => (
            <tr key={cat.id} className="hover:bg-muted/30">
              <td className="sticky right-0 z-10 bg-background px-3 py-1 text-sm border-b border-l">
                {cat.name}
              </td>
              {periods.map((period) => (
                <td key={period} className="px-1 py-1 border-b border-l">
                  <EditableCell
                    value={getAmount(cat.id, period)}
                    onSave={(val) => handleSave(cat.id, period, val)}
                  />
                </td>
              ))}
            </tr>
          ))}

          {/* Subtotal Expenses */}
          <tr className="bg-red-50/50 dark:bg-red-900/10 font-semibold">
            <td className="sticky right-0 z-10 bg-red-50/50 dark:bg-red-900/10 px-3 py-1.5 text-sm border-b border-l">
              Total Expenses
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                <div className="px-1 py-0.5 text-sm font-bold text-center text-red-600 dark:text-red-400" dir="ltr">
                  {calc.totalExpenses.toLocaleString("he-IL")}
                </div>
              </td>
            ))}
          </tr>

          {/* Other Expenses Section Header */}
          {otherExpenseCategories.length > 0 && (
            <>
              <tr className="bg-orange-50 dark:bg-orange-900/20">
                <td
                  colSpan={periods.length + 1}
                  className="px-3 py-1.5 text-sm font-bold text-orange-700 dark:text-orange-300 border-b"
                >
                  Other Expenses
                </td>
              </tr>

              {otherExpenseCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/30">
                  <td className="sticky right-0 z-10 bg-background px-3 py-1 text-sm border-b border-l">
                    {cat.name}
                  </td>
                  {periods.map((period) => (
                    <td key={period} className="px-1 py-1 border-b border-l">
                      <EditableCell
                        value={getAmount(cat.id, period)}
                        onSave={(val) => handleSave(cat.id, period, val)}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Subtotal Other Expenses */}
              <tr className="bg-orange-50/50 dark:bg-orange-900/10 font-semibold">
                <td className="sticky right-0 z-10 bg-orange-50/50 dark:bg-orange-900/10 px-3 py-1.5 text-sm border-b border-l">
                  Total Other Expenses
                </td>
                {calculations.map((calc) => (
                  <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                    <div className="px-1 py-0.5 text-sm font-bold text-center text-orange-600 dark:text-orange-400" dir="ltr">
                      {calc.totalOtherExpenses.toLocaleString("he-IL")}
                    </div>
                  </td>
                ))}
              </tr>
            </>
          )}

          {/* Total Cash Paid Out */}
          <tr className="bg-red-100/50 dark:bg-red-900/30 font-bold">
            <td className="sticky right-0 z-10 bg-red-100/50 dark:bg-red-900/30 px-3 py-1.5 text-sm border-b border-l">
              Total Cash Paid Out
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-1.5 border-b border-l">
                <div className="px-1 py-0.5 text-sm font-bold text-center text-red-700 dark:text-red-300" dir="ltr">
                  {calc.totalCashOut.toLocaleString("he-IL")}
                </div>
              </td>
            ))}
          </tr>

          {/* Closing Balance */}
          <tr className="bg-blue-100 dark:bg-blue-900/30">
            <td className="sticky right-0 z-10 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 text-sm font-bold border-b border-l">
              Closing Balance
            </td>
            {calculations.map((calc) => (
              <td key={calc.period} className="px-1 py-2 border-b border-l">
                <SummaryCell value={calc.closing} alertMinimum={alertMinimum} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
