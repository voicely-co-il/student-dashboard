import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Settings, ListTree, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CashflowTable from "@/components/admin/cashflow/CashflowTable";
import CashflowSummaryBar from "@/components/admin/cashflow/CashflowSummaryBar";
import CategoryManageDialog from "@/components/admin/cashflow/CategoryManageDialog";
import CashflowSettingsDialog from "@/components/admin/cashflow/CashflowSettingsDialog";
import {
  useCashflowCategories,
  useCashflowEntries,
  useCashflowSettings,
  getWeeklyPeriods,
  getMonthlyPeriods,
} from "@/hooks/admin/useCashflow";

export default function AdminCashflow() {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [weeklyOffset, setWeeklyOffset] = useState(0); // offset in weeks (multiples of 13)
  const [monthlyOffset, setMonthlyOffset] = useState(0); // offset in months (multiples of 12)

  const { data: categories = [], isLoading: loadingCategories } = useCashflowCategories();
  const { data: settings = {}, isLoading: loadingSettings } = useCashflowSettings();

  // Calculate periods based on settings and offsets
  const weeklyStartDate = useMemo(() => {
    const base = new Date(settings.weekly_start_date || "2026-01-19");
    base.setDate(base.getDate() + weeklyOffset * 7 * 13);
    return base;
  }, [settings.weekly_start_date, weeklyOffset]);

  const monthlyStartDate = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthlyOffset * 12, 1);
    return base;
  }, [monthlyOffset]);

  const weeklyPeriods = useMemo(() => getWeeklyPeriods(weeklyStartDate, 13), [weeklyStartDate]);
  const monthlyPeriods = useMemo(() => getMonthlyPeriods(monthlyStartDate, 12), [monthlyStartDate]);

  const currentPeriods = activeTab === "weekly" ? weeklyPeriods : monthlyPeriods;

  const { data: entries = [], isLoading: loadingEntries } = useCashflowEntries(
    activeTab,
    currentPeriods
  );

  const openingBalance = parseFloat(
    activeTab === "weekly"
      ? settings.opening_balance_weekly || "0"
      : settings.opening_balance_monthly || "0"
  );
  const alertMinimum = parseFloat(settings.alert_minimum || "0");
  const vatRate = parseFloat(settings.vat_rate || "0.18");
  const incomeTaxRate = parseFloat(settings.income_tax_rate || "0.30");
  const socialSecurityRate = parseFloat(settings.social_security_rate || "0.12");

  // Calculate summary values
  const summaryValues = useMemo(() => {
    const incomeCategories = categories.filter((c) => c.type === "income");
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const otherExpenseCategories = categories.filter((c) => c.type === "other_expense");

    let totalIncome = 0;
    let totalExpenses = 0;

    const entryMap: Record<string, number> = {};
    entries.forEach((e) => {
      entryMap[`${e.category_id}_${e.period_start}`] = Number(e.amount);
    });

    currentPeriods.forEach((period) => {
      incomeCategories.forEach((cat) => {
        totalIncome += entryMap[`${cat.id}_${period}`] || 0;
      });
      expenseCategories.forEach((cat) => {
        totalExpenses += entryMap[`${cat.id}_${period}`] || 0;
      });
      otherExpenseCategories.forEach((cat) => {
        totalExpenses += entryMap[`${cat.id}_${period}`] || 0;
      });
    });

    // Calculate final closing balance
    let balance = openingBalance;
    currentPeriods.forEach((period) => {
      const periodIncome = incomeCategories.reduce(
        (sum, cat) => sum + (entryMap[`${cat.id}_${period}`] || 0),
        0
      );
      const periodExpenses = expenseCategories.reduce(
        (sum, cat) => sum + (entryMap[`${cat.id}_${period}`] || 0),
        0
      );
      const periodOther = otherExpenseCategories.reduce(
        (sum, cat) => sum + (entryMap[`${cat.id}_${period}`] || 0),
        0
      );
      balance = balance + periodIncome - periodExpenses - periodOther;
    });

    return { totalIncome, totalExpenses, currentBalance: balance };
  }, [categories, entries, currentPeriods, openingBalance]);

  const isLoading = loadingCategories || loadingSettings || loadingEntries;

  if (isLoading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-6 max-w-7xl flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Cashflow</h1>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              ₪{summaryValues.currentBalance.toLocaleString("he-IL")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CategoryManageDialog categories={categories}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ListTree className="w-4 h-4" />
                Categories
              </Button>
            </CategoryManageDialog>
            <CashflowSettingsDialog settings={settings}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </CashflowSettingsDialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "weekly" | "monthly")}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="weekly">Weekly (13 weeks)</TabsTrigger>
              <TabsTrigger value="monthly">Monthly (12 months)</TabsTrigger>
            </TabsList>

            {/* Period Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  activeTab === "weekly"
                    ? setWeeklyOffset((o) => o - 1)
                    : setMonthlyOffset((o) => o - 1)
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeTab === "weekly") setWeeklyOffset(0);
                  else setMonthlyOffset(0);
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  activeTab === "weekly"
                    ? setWeeklyOffset((o) => o + 1)
                    : setMonthlyOffset((o) => o + 1)
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="weekly" className="mt-0">
            <CashflowTable
              categories={categories}
              entries={entries}
              periods={weeklyPeriods}
              periodType="weekly"
              openingBalance={openingBalance}
              alertMinimum={alertMinimum}
            />
          </TabsContent>

          <TabsContent value="monthly" className="mt-0">
            <CashflowTable
              categories={categories}
              entries={entries}
              periods={monthlyPeriods}
              periodType="monthly"
              openingBalance={openingBalance}
              alertMinimum={alertMinimum}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Summary Bar */}
      <CashflowSummaryBar
        currentBalance={summaryValues.currentBalance}
        totalIncome={summaryValues.totalIncome}
        totalExpenses={summaryValues.totalExpenses}
        alertMinimum={alertMinimum}
        periodCount={currentPeriods.length}
        periodType={activeTab}
        vatRate={vatRate}
        incomeTaxRate={incomeTaxRate}
        socialSecurityRate={socialSecurityRate}
      />
    </div>
  );
}
