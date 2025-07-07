'use client';

import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

export function NetflixGlow() {
  const colors = [
    '#D4AF37', // Gold
    '#EF4444', // Red
    '#A855F7', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F43F5E', // Pink
    '#F59E0B', // Orange
  ];

  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const prevColorIndex = useRef(0);
  const gradientRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Track if this is the first render after mount
  const isFirstRender = useRef(true);

  // Set the correct color index after mount (client-side)
  useEffect(() => {
    const scrollY = window.scrollY;
    const scrollTrigger = 600;
    const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
    setCurrentColorIndex(newColorIndex);
    prevColorIndex.current = newColorIndex;
  }, [colors.length]);

  useEffect(() => {
    console.log('[NetflixGlow] Mounted. Initial color index:', currentColorIndex);
    setTimeout(() => {
      gradientRefs.current.forEach((ref, idx) => {
        if (ref) {
          console.log(`[NetflixGlow] On mount: Gradient ${idx} opacity:`, ref.style.opacity);
        }
      });
    }, 100);
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollTrigger = 600;
      const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
      console.log('[NetflixGlow] ScrollY:', scrollY, 'Current:', currentColorIndex, 'New:', newColorIndex);
      if (newColorIndex !== currentColorIndex) {
        prevColorIndex.current = currentColorIndex;
        setCurrentColorIndex(newColorIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentColorIndex, colors.length]);

  useEffect(() => {
    // Only animate previous and current if not the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prev = gradientRefs.current[prevColorIndex.current];
    const curr = gradientRefs.current[currentColorIndex];
    console.log('[NetflixGlow] Color index changed:', prevColorIndex.current, '->', currentColorIndex);
    if (prev && curr) {
      gsap.to(prev, { opacity: 0, duration: 1, ease: 'power2.out' });
      gsap.to(curr, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  }, [currentColorIndex]);

  return (
    <div
      id="gradient-container"
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
    >
      {colors.map((color, index) => (
        <div
          key={index}
          ref={el => { gradientRefs.current[index] = el; }}
          className="gradient absolute w-full h-full transition-opacity duration-1000 ease-out"
          style={{
            background: `linear-gradient(226.67deg, ${color} -38.52%, ${color}00 50.26%)`,
            opacity: index === currentColorIndex ? 1 : 0,
            mixBlendMode: 'normal',
          }}
        />
      ))}
    </div>
  );
}
