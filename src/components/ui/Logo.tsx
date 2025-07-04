import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
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

  // Try different extensions for oscarworthy-icon
  const logoSrc = '/oscarworthy-icon.png'; // Change extension if needed (.svg, .jpg, .jpeg, etc.)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Oscar Worthy Logo with fallback */}
      {!imageError ? (
        <Image
          src={logoSrc}
          alt="Oscar Worthy Logo"
          width={dimensions[size].width}
          height={dimensions[size].height}
          className="object-contain"
          priority
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={`${emojiSize[size]}`}>🏆</span>
      )}
      {showText && (
        <h1 className={`font-bold text-white ${textSize[size]}`}>
          Oscar Worthy
        </h1>
      )}
    </div>
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
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`${emojiSize[size]}`}>🏆</span>
      {showText && (
        <h1 className={`font-bold text-white ${textSize[size]}`}>
          Oscar Worthy
        </h1>
      )}
    </div>
  );
}
