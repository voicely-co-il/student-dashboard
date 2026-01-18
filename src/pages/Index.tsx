import Header from '@/components/dashboard/Header';
import BottomNav from '@/components/dashboard/BottomNav';
import VoiceScoreCard from '@/components/dashboard/VoiceScoreCard';
import MetricCard from '@/components/dashboard/MetricCard';
import ActionPlanCard from '@/components/dashboard/ActionPlanCard';
import AdvisorsNoteCard from '@/components/dashboard/AdvisorsNoteCard';
import StarBoxCard from '@/components/dashboard/StarBoxCard';
import VoiceComfortCard from '@/components/dashboard/VoiceComfortCard';
import { Wind, Music } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hero - Voice Score */}
        <VoiceScoreCard score={82} />
        
        {/* Advisor's Note */}
        <AdvisorsNoteCard />
        
        {/* Breathing Metric */}
        <MetricCard 
          title="נשיפה רציפה"
          value="18 שנ'"
          description="מתוך יעד של 20 שנ'"
          percentage={90}
          color="hsl(var(--voicely-green))"
          icon={Wind}
        />
        
        {/* Pitch Accuracy */}
        <MetricCard 
          title="דיוק בגובה הצליל"
          value="92%"
          description="בתרגול האחרון"
          percentage={92}
          color="hsl(var(--voicely-orange))"
          icon={Music}
        />
        
        {/* Star Box */}
        <StarBoxCard earnedStars={4} streakDays={7} />
        
        {/* Voice Comfort */}
        <VoiceComfortCard level={2} />
        
        {/* Action Plan */}
        <ActionPlanCard />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
