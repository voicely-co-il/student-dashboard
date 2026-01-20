import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Users,
  Lightbulb,
  Target,
  Megaphone,
  RefreshCw,
  Star
} from 'lucide-react';
import AnalyticsOverview from '@/components/admin/analytics/AnalyticsOverview';
import TrendsDashboard from '@/components/admin/analytics/TrendsDashboard';
import MethodologyAnalyzer from '@/components/admin/analytics/MethodologyAnalyzer';
import StudentArchetypes from '@/components/admin/analytics/StudentArchetypes';
import SuccessPatterns from '@/components/admin/analytics/SuccessPatterns';
import MarketingInsights from '@/components/admin/analytics/MarketingInsights';
import TestimonialTool from '@/components/admin/analytics/TestimonialTool';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminAnalytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefreshViews = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.rpc('refresh_analytics_views');
      if (error) throw error;

      // Invalidate all analytics queries
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('הנתונים עודכנו בהצלחה');
    } catch (error) {
      console.error('Error refreshing views:', error);
      toast.error('שגיאה בעדכון הנתונים');
    } finally {
      setIsRefreshing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: BarChart3 },
    { id: 'trends', label: 'מגמות', icon: TrendingUp },
    { id: 'methodology', label: 'שיטת ההוראה', icon: Lightbulb },
    { id: 'students', label: 'ארכיטיפי תלמידים', icon: Users },
    { id: 'success', label: 'דפוסי הצלחה', icon: Target },
    { id: 'marketing', label: 'תוכן שיווקי', icon: Megaphone },
    { id: 'testimonials', label: 'חוות דעת', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">אנליטיקס מתקדם</h1>
            <p className="text-muted-foreground text-sm mt-1">
              ניתוח עמוק של 828+ שיחות מתומללות
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshViews}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ms-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'מעדכן...' : 'עדכן נתונים'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 rounded-lg transition-all"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <AnalyticsOverview />
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            <TrendsDashboard />
          </TabsContent>

          <TabsContent value="methodology" className="mt-0">
            <MethodologyAnalyzer />
          </TabsContent>

          <TabsContent value="students" className="mt-0">
            <StudentArchetypes />
          </TabsContent>

          <TabsContent value="success" className="mt-0">
            <SuccessPatterns />
          </TabsContent>

          <TabsContent value="marketing" className="mt-0">
            <MarketingInsights />
          </TabsContent>

          <TabsContent value="testimonials" className="mt-0">
            <TestimonialTool />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAnalytics;
