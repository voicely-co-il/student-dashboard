
import React from 'react';
import { Home, HeartPulse, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'דף הבית', active: true },
  { icon: HeartPulse, label: 'בריאות' },
  { icon: BarChart3, label: 'נתונים' },
  { icon: Settings, label: 'הגדרות' },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/80 shadow-lg z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {navItems.map((item, index) => (
          <a
            key={index}
            href="#"
            className={`flex flex-col items-center justify-center text-center p-3 w-full transition-colors duration-200 ${
              item.active ? 'text-voicely-green' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
