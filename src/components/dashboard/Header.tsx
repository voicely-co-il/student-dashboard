import React from 'react';
import voicelyLogo from '@/assets/voicely-logo.png';

const Header = () => {
  return (
    <header className="p-4 pt-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">שלום, שרה! 👋</h1>
        <p className="text-muted-foreground text-sm">בואי נראה איך הקול שלך מתפתח</p>
      </div>
      <img
        src={voicelyLogo}
        alt="Voicely"
        className="h-16 sm:h-20 w-auto object-contain"
      />
    </header>
  );
};

export default Header;
