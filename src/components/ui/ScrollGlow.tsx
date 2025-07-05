'use client';

import { useScrollGlow } from '@/hooks/useScrollGlow';

export function ScrollGlow() {
  const { currentColor, isVisible } = useScrollGlow();

  return (
    <div 
      className={`
        fixed top-0 right-0 pointer-events-none z-0
        transition-opacity duration-1000 ease-in-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Main glow effect */}
      <div 
        className={`
          w-96 h-96 rounded-full blur-3xl
          bg-gradient-radial ${currentColor}
          transform translate-x-1/2 -translate-y-1/2
          transition-all duration-1000 ease-in-out
        `}
      />
      
      {/* Secondary softer glow for more depth */}
      <div 
        className={`
          absolute top-0 right-0
          w-72 h-72 rounded-full blur-2xl
          bg-gradient-radial ${currentColor}
          transform translate-x-1/3 -translate-y-1/3
          transition-all duration-1000 ease-in-out
          opacity-60
        `}
      />
    </div>
  );
}
