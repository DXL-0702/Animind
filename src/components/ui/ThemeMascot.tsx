'use client';

import { useState } from 'react';

interface ThemeMascotProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 80, md: 150, lg: 220 };

export default function ThemeMascot({ size = 'md' }: ThemeMascotProps) {
  const px = sizeMap[size];
  const [imgError, setImgError] = useState(false);

  return (
    <div className="mascot-breathe inline-block" style={{ width: px, height: px * 1.8 }}>
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/mascots/mascot.jpg"
          alt="mascot"
          width={px}
          height={px * 1.8}
          loading="lazy"
          className="w-full h-full object-contain hover:animate-none mascot-float"
          onError={() => {
            console.warn('[ThemeMascot] Failed to load mascot image');
            setImgError(true);
          }}
        />
      ) : (
        // SVG fallback
        <svg
          viewBox="0 0 100 180"
          className="w-full h-full object-contain hover:animate-none mascot-float"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="40" r="25" fill="#D04050" opacity="0.3" />
          <circle cx="50" cy="100" r="35" fill="#F0D0D8" opacity="0.3" />
          <circle cx="40" cy="35" r="5" fill="#3A2030" />
          <circle cx="60" cy="35" r="5" fill="#3A2030" />
          <path d="M 40 50 Q 50 55 60 50" stroke="#3A2030" strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
  );
}
