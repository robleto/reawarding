'use client';

import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

export function NetflixGlow() {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const gradientRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Netflix-inspired soft colors with proper hex + transparency
  const colors = [
    '#D4AF37', // Gold
    '#EF4444', // Red
    '#A855F7', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F43F5E', // Pink
    '#F59E0B', // Orange
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollTrigger = 600; // Change color every 600px
      const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
      
      if (newColorIndex !== currentColorIndex) {
        setCurrentColorIndex(newColorIndex);
        
        // Fade out all gradients
        gradientRefs.current.forEach((gradient, index) => {
          if (gradient) {
            gsap.to(gradient, {
              opacity: index === newColorIndex ? 0.5 : 0,
              duration: 1,
              ease: 'power2.out',
            });
          }
        });
      }
    };

    // Initial setup - show first gradient
    gradientRefs.current.forEach((gradient, index) => {
      if (gradient) {
        gsap.set(gradient, {
          opacity: index === 0 ? 0.5 : 0,
        });
      }
    });

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentColorIndex, colors.length]);

  return (
    <div 
      id="gradient-container"
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
    >
      {colors.map((color, index) => (
        <div
          key={index}
          ref={(el) => {
            gradientRefs.current[index] = el;
          }}
          className="gradient absolute w-full h-full transition-opacity duration-1000 ease-out"
          style={{
            background: `linear-gradient(226.67deg, ${color} -38.52%, ${color}00 50.26%)`,
            opacity: index === 0 ? 0.5 : 0,
            mixBlendMode: 'normal',
          }}
        />
      ))}
    </div>
  );
}
