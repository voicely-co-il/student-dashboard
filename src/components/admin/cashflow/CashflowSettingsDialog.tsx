import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSetting } from "@/hooks/admin/useCashflow";

interface CashflowSettingsDialogProps {
  settings: Record<string, string>;
  children: React.ReactNode;
}

export default function CashflowSettingsDialog({
  settings,
  children,
}: CashflowSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [openingWeekly, setOpeningWeekly] = useState("");
  const [openingMonthly, setOpeningMonthly] = useState("");
  const [alertMin, setAlertMin] = useState("");
  const [startDate, setStartDate] = useState("");

  const updateSetting = useUpdateSetting();

  useEffect(() => {
    setOpeningWeekly(settings.opening_balance_weekly || "0");
    setOpeningMonthly(settings.opening_balance_monthly || "0");
    setAlertMin(settings.alert_minimum || "0");
    setStartDate(settings.weekly_start_date || "2026-01-19");
  }, [settings]);

  const handleSave = () => {
    updateSetting.mutate({ key: "opening_balance_weekly", value: openingWeekly });
    updateSetting.mutate({ key: "opening_balance_monthly", value: openingMonthly });
    updateSetting.mutate({ key: "alert_minimum", value: alertMin });
    updateSetting.mutate({ key: "weekly_start_date", value: startDate });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הגדרות תזרים</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>יתרת פתיחה - שבועי (₪)</Label>
            <Input
              type="number"
              value={openingWeekly}
              onChange={(e) => setOpeningWeekly(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label>יתרת פתיחה - חודשי (₪)</Label>
            <Input
              type="number"
              value={openingMonthly}
              onChange={(e) => setOpeningMonthly(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label>סף התראה מינימלי (₪)</Label>
            <Input
              type="number"
              value={alertMin}
              onChange={(e) => setAlertMin(e.target.value)}
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              כשהיתרה יורדת מתחת לסף - הערך יוצג באדום
            </p>
          </div>

          <div className="space-y-2">
            <Label>תאריך התחלה (שבועי)</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              התאריך ממנו מתחילים 13 השבועות
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            שמור הגדרות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
