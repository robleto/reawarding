import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  imageClassName?: string;
}

export function Logo({ size = 'md', className = '', showText = true, imageClassName = 'object-contain' }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 42, height: 42 },
    lg: { width: 48, height: 48 }
  };

  const textSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const emojiSize = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  // Use the existing logo file
  const logoSrc = '/Oscarworthy-logomark.svg';

  return ( 
    <a href="/" className={`flex items-center gap-1 ${className}`} aria-label="Oscar Worthy Home">
      {/* Oscar Worthy Logo with fallback */}
      {!imageError ? (
      <Image
        src={logoSrc}
        alt="Oscar Worthy Logo"
        width={dimensions[size].width}
        height={dimensions[size].height}
        className={imageClassName}
        priority
        onError={() => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Logo failed to load:', logoSrc);
        }
        setImageError(true);
        }}
      />
      ) : (
      <span className={`${emojiSize[size]}`}>🏆</span>
      )}
      {showText && (
      <h1 className={`font-semibold font-unbounded uppercase text-gold ${textSize[size]} tracking-widest`}>
        Oscarworthy
      </h1>
      )}
    </a>
  );
}

// Fallback component if no logo image is available
export function LogoFallback({ size = 'md', className = '', showText = true }: LogoProps) {
  const emojiSize = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  const textSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <a href="/" className={`flex items-center gap-3 ${className}`} aria-label="Oscar Worthy Home">
      <span className={`${emojiSize[size]}`}>🏆</span>
      {showText && (
      <h1 className={`font-bold text-white ${textSize[size]}`}>
        Oscarworthy
      </h1>
      )}
    </a>
  );
}
