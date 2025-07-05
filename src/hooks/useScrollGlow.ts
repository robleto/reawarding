import { useState, useEffect } from 'react';

// Color palette for the glow effect - Netflix-inspired but Oscar-themed
const GLOW_COLORS = [
  'from-gold/20 to-transparent', // Oscar gold
  'from-red-500/20 to-transparent', // Red carpet
  'from-purple-500/20 to-transparent', // Elegant purple
  'from-blue-500/20 to-transparent', // Deep blue
  'from-emerald-500/20 to-transparent', // Emerald green
  'from-rose-500/20 to-transparent', // Rose gold
  'from-amber-500/20 to-transparent', // Warm amber
  'from-indigo-500/20 to-transparent', // Royal indigo
];

const SCROLL_INTERVAL = 700; // pixels

export function useScrollGlow() {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const colorIndex = Math.floor(scrollY / SCROLL_INTERVAL) % GLOW_COLORS.length;
          
          if (colorIndex !== currentColorIndex) {
            setCurrentColorIndex(colorIndex);
          }
          
          // Hide glow when at very top of page for cleaner look
          setIsVisible(scrollY > 50);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentColorIndex]);

  return {
    currentColor: GLOW_COLORS[currentColorIndex],
    isVisible,
    colorIndex: currentColorIndex,
  };
}
