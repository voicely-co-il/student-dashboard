import React, { useState } from 'react';
import { Home, HeartPulse, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'בית' },
  { icon: HeartPulse, label: 'בריאות' },
  { icon: BarChart3, label: 'נתונים' },
  { icon: Settings, label: 'הגדרות' },
];

const BottomNav = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 glass-effect border-t border-border/50 z-50 safe-area-pb">
      <div className="flex justify-around max-w-lg mx-auto py-2">
        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className={`h-5 w-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
