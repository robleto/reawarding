import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  imageClassName?: string;
}

export function Logo({ size = 'lg', className = '', showText = true, imageClassName = 'object-contain' }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  const dimensions = {
    sm: { width: 180, height: 72 },
    md: { width: 225, height: 90 },
    lg: { width: 300, height: 120 }
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

  // Use the new logo file
  const logoSrc = '/reawarding-logo-on-black.svg';

  return ( 
    <div className={`flex items-center gap-1 ${className}`} aria-label="Reawarding Home">
      {/* Reawarding Logo with fallback */}
      {
        !imageError ? (
          <Image
            src={logoSrc}
            alt="Reawarding Logo"
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
          <>
            <span className={`${emojiSize[size]}`}>🏆</span>
            {showText && (
              <h1 className={`font-semibold font-unbounded uppercase text-gold ${textSize[size]} tracking-widest`}>
                Reawarding
              </h1>
            )}
          </>
        )
      }
    </div>
  );
}

