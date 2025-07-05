'use client';

import { useEffect, useState } from 'react';
import { gsap } from 'gsap';

export function NetflixGlow() {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  
  // Netflix-inspired soft colors
  const colors = [
    '#ff5e57', // Netflix red
    '#57baff', // Blue
    '#a95eff', // Purple
    '#ffd857', // Gold
    '#57ff9a', // Green
    '#ff57d4', // Pink
    '#ffb857', // Orange
  ];

  useEffect(() => {
    let tween: gsap.core.Tween;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollTrigger = 600; // Change color every 600px
      const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
      
      if (newColorIndex !== currentColorIndex) {
        setCurrentColorIndex(newColorIndex);
        
        // GSAP animation for smooth color transition
        const glowElement = document.getElementById('netflix-glow');
        if (glowElement) {
          // Cancel any existing animation
          if (tween) tween.kill();
          
          // Animate to new color
          tween = gsap.to(glowElement, {
            backgroundColor: colors[newColorIndex],
            duration: 0.8,
            ease: 'power2.out',
          });
        }
      }
    };

    // Initial color setup
    const glowElement = document.getElementById('netflix-glow');
    if (glowElement) {
      gsap.set(glowElement, {
        backgroundColor: colors[0],
      });
    }

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (tween) tween.kill();
    };
  }, [currentColorIndex, colors]);

  return (
    <>
      {/* Main glow element */}
      <div
        id="netflix-glow"
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 dark:opacity-30 blur-3xl pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle, ${colors[currentColorIndex]} 0%, transparent 70%)`,
          transform: 'translate(50%, -50%)',
        }}
      />
      
      {/* Secondary smaller glow for depth */}
      <div
        className="fixed top-20 right-20 w-48 h-48 rounded-full opacity-10 dark:opacity-20 blur-2xl pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle, ${colors[(currentColorIndex + 1) % colors.length]} 0%, transparent 70%)`,
          transform: 'translate(25%, -25%)',
          transition: 'background-color 0.8s ease',
        }}
      />
      
      {/* Mobile-optimized smaller glow */}
      <div
        className="fixed top-0 right-0 w-48 h-48 rounded-full opacity-15 dark:opacity-25 blur-2xl pointer-events-none z-0 md:hidden"
        style={{
          background: `radial-gradient(circle, ${colors[currentColorIndex]} 0%, transparent 70%)`,
          transform: 'translate(25%, -25%)',
          transition: 'background-color 0.8s ease',
        }}
      />
    </>
  );
}
