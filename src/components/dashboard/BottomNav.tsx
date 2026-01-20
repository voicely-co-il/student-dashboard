import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, HeartPulse, BarChart3, Settings, MessageCircle, Headphones } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'בית', path: '/' },
  { icon: MessageCircle, label: 'צ\'אט AI', path: '/teacher-chat' },
  { icon: Headphones, label: 'Live Chat', path: '/live-chat' },
  { icon: BarChart3, label: 'אנליטיקס', path: '/admin/analytics' },
  { icon: Settings, label: 'הגדרות', path: '#' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string, index: number) => {
    if (path !== '#') {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-50 safe-area-pb">
      <div className="flex justify-around max-w-lg mx-auto py-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => handleNavClick(item.path, index)}
              className={`flex flex-col items-center justify-center p-2 min-w-[60px] rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              <item.icon className={`h-5 w-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
