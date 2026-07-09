'use client';

import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

// The scroll-reactive ambient glow behind every page. Dark mode keeps the
// original saturated cinema palette. Light mode is under evaluation with two
// candidates (see LIGHT_GLOW_DEFAULT below):
//   'pastel' — same rotation, but soft pastel tints that sit on ivory
//   'off'    — no glow at all; the light canvas stays clean
// While we decide, either can be forced with ?glow=pastel or ?glow=off.
type LightGlowMode = 'pastel' | 'off';
const LIGHT_GLOW_DEFAULT: LightGlowMode = 'pastel';

const DARK_COLORS = [
  '#D4AF37', // Gold
  '#EF4444', // Red
  '#A855F7', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F43F5E', // Pink
  '#F59E0B', // Orange
];

// Pastel counterparts, one per dark color, tuned to read as a wash on the
// warm ivory canvas rather than a spotlight.
const LIGHT_COLORS = [
  '#EDD494', // Soft gold
  '#F5B3A9', // Coral blush
  '#D8BCF2', // Lilac
  '#AFCFF5', // Powder blue
  '#ABE3C4', // Mint
  '#F5BCCE', // Rose
  '#F5CD96', // Apricot
];

export function NetflixGlow() {
  const debug = process.env.NODE_ENV !== 'production';

  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const prevColorIndex = useRef(0);
  const gradientRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Track if this is the first render after mount
  const isFirstRender = useRef(true);
  // Track theme to swap palettes (dark = saturated, light = pastel/off)
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lightGlowMode, setLightGlowMode] = useState<LightGlowMode>(LIGHT_GLOW_DEFAULT);

  // Observe html.dark class changes (Tailwind darkMode: 'class')
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDarkMode(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Temporary comparison hook while light mode is evaluated: ?glow=off|pastel
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('glow');
    if (param === 'off' || param === 'pastel') setLightGlowMode(param);
  }, []);

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const glowHidden = !isDarkMode && lightGlowMode === 'off';
  // Pastels are already soft — they can run at full opacity on ivory.
  const activeOpacity = isDarkMode ? 1 : 0.8;

  // Set the correct color index after mount (client-side)
  useEffect(() => {
    const scrollY = window.scrollY;
    const scrollTrigger = 600;
    const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
    setCurrentColorIndex(newColorIndex);
    prevColorIndex.current = newColorIndex;
  }, [colors.length]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollTrigger = 600;
      const newColorIndex = Math.floor(scrollY / scrollTrigger) % colors.length;
      if (debug) {
        console.log('[NetflixGlow] ScrollY:', scrollY, 'Current:', currentColorIndex, 'New:', newColorIndex);
      }
      if (newColorIndex !== currentColorIndex) {
        prevColorIndex.current = currentColorIndex;
        setCurrentColorIndex(newColorIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentColorIndex, colors.length, debug]);

  useEffect(() => {
    // Only animate previous and current if not the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prev = gradientRefs.current[prevColorIndex.current];
    const curr = gradientRefs.current[currentColorIndex];
    if (debug) {
      console.log('[NetflixGlow] Color index changed:', prevColorIndex.current, '->', currentColorIndex);
    }
    if (prev && curr) {
      gsap.to(prev, { opacity: 0, duration: 1, ease: 'power2.out' });
      gsap.to(curr, { opacity: glowHidden ? 0 : activeOpacity, duration: 0.5, ease: 'power2.out' });
    }
  }, [currentColorIndex, isDarkMode, glowHidden, activeOpacity, debug]);

  if (glowHidden) return null;

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
            opacity: index === currentColorIndex ? activeOpacity : 0,
            mixBlendMode: 'normal',
          }}
        />
      ))}
    </div>
  );
}
