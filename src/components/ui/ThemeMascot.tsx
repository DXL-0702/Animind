'use client';

interface ThemeMascotProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 80, md: 150, lg: 220 };

export default function ThemeMascot({ size = 'md' }: ThemeMascotProps) {
  const px = sizeMap[size];

  return (
    <div className="mascot-breathe inline-block" style={{ width: px, height: px * 1.8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascots/mascot.png"
        alt="mascot"
        width={px}
        height={px * 1.8}
        loading="lazy"
        className="w-full h-full object-contain hover:animate-none mascot-float"
      />
    </div>
  );
}
