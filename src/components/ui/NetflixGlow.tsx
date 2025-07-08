'use client';

<<<<<<< HEAD
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
=======
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
>>>>>>> 2122713 (feat: Enhance dark mode support and UI elements)
  );
}
