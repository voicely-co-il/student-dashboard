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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  // General settings
  const [openingWeekly, setOpeningWeekly] = useState("");
  const [openingMonthly, setOpeningMonthly] = useState("");
  const [alertMin, setAlertMin] = useState("");
  const [startDate, setStartDate] = useState("");
  // Pricing settings
  const [price1on1New, setPrice1on1New] = useState("");
  const [price1on1Veteran, setPrice1on1Veteran] = useState("");
  const [priceGroupMonthly, setPriceGroupMonthly] = useState("");
  // Tax settings
  const [vatRate, setVatRate] = useState("");
  const [incomeTaxRate, setIncomeTaxRate] = useState("");
  const [socialSecurityRate, setSocialSecurityRate] = useState("");

  const updateSetting = useUpdateSetting();

  useEffect(() => {
    // General
    setOpeningWeekly(settings.opening_balance_weekly || "0");
    setOpeningMonthly(settings.opening_balance_monthly || "0");
    setAlertMin(settings.alert_minimum || "0");
    setStartDate(settings.weekly_start_date || "2026-01-19");
    // Pricing
    setPrice1on1New(settings.price_1on1_new || "200");
    setPrice1on1Veteran(settings.price_1on1_veteran || "180");
    setPriceGroupMonthly(settings.price_group_monthly || "410");
    // Tax rates (stored as decimal, display as percentage)
    setVatRate(String(Number(settings.vat_rate || "0.18") * 100));
    setIncomeTaxRate(String(Number(settings.income_tax_rate || "0.30") * 100));
    setSocialSecurityRate(String(Number(settings.social_security_rate || "0.12") * 100));
  }, [settings]);

  const handleSave = () => {
    // General settings
    updateSetting.mutate({ key: "opening_balance_weekly", value: openingWeekly });
    updateSetting.mutate({ key: "opening_balance_monthly", value: openingMonthly });
    updateSetting.mutate({ key: "alert_minimum", value: alertMin });
    updateSetting.mutate({ key: "weekly_start_date", value: startDate });
    // Pricing settings
    updateSetting.mutate({ key: "price_1on1_new", value: price1on1New });
    updateSetting.mutate({ key: "price_1on1_veteran", value: price1on1Veteran });
    updateSetting.mutate({ key: "price_group_monthly", value: priceGroupMonthly });
    // Tax settings (convert percentage to decimal)
    updateSetting.mutate({ key: "vat_rate", value: String(Number(vatRate) / 100) });
    updateSetting.mutate({ key: "income_tax_rate", value: String(Number(incomeTaxRate) / 100) });
    updateSetting.mutate({ key: "social_security_rate", value: String(Number(socialSecurityRate) / 100) });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הגדרות תזרים</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">כללי</TabsTrigger>
            <TabsTrigger value="pricing">מחירון</TabsTrigger>
            <TabsTrigger value="taxes">מיסים</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
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
                כשהיתרה יורדת מתחת לסף זה, היא תוצג באדום
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
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                המחירים כוללים מע"מ. הנטו יחושב אוטומטית לפי שיעור המע"מ.
              </p>
            </div>

            <div className="space-y-2">
              <Label>שיעור 1:1 - חדשים (₪/45 דק')</Label>
              <Input
                type="number"
                value={price1on1New}
                onChange={(e) => setPrice1on1New(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>שיעור 1:1 - ותיקים (₪/45 דק')</Label>
              <Input
                type="number"
                value={price1on1Veteran}
                onChange={(e) => setPrice1on1Veteran(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                תלמידים ותיקים: כרמל, גילי, עופרי, עדי, אופיר
              </p>
            </div>

            <div className="space-y-2">
              <Label>קבוצה - חודשי (₪/חודש)</Label>
              <Input
                type="number"
                value={priceGroupMonthly}
                onChange={(e) => setPriceGroupMonthly(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </TabsContent>

          <TabsContent value="taxes" className="space-y-4 mt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                שיעורי המס משמשים לחישוב אוטומטי של ההוצאות הצפויות.
              </p>
            </div>

            <div className="space-y-2">
              <Label>מע"מ (%)</Label>
              <Input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                dir="ltr"
                className="text-left"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                מע"מ שיש להעביר למס הכנסה מההכנסות
              </p>
            </div>

            <div className="space-y-2">
              <Label>מס הכנסה (%)</Label>
              <Input
                type="number"
                value={incomeTaxRate}
                onChange={(e) => setIncomeTaxRate(e.target.value)}
                dir="ltr"
                className="text-left"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                שיעור מס הכנסה משוער (מדרגה ממוצעת)
              </p>
            </div>

            <div className="space-y-2">
              <Label>ביטוח לאומי (%)</Label>
              <Input
                type="number"
                value={socialSecurityRate}
                onChange={(e) => setSocialSecurityRate(e.target.value)}
                dir="ltr"
                className="text-left"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                שיעור ביטוח לאומי לעצמאים
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={handleSave} className="w-full mt-4">
          שמור הגדרות
        </Button>
      </DialogContent>
    </Dialog>
  );
}
