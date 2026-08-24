import React from 'react';

interface ApexLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function ApexLogo({ size = 120, className = '', showText = true }: ApexLogoProps) {
  // Calculates the 12 stars positions around the ring (radius = 90px on a 200x200 canvas)
  const stars = Array.from({ length: 12 }).map((_, index) => {
    const angle = (index * 30 * Math.PI) / 180;
    const cx = 100 + 82 * Math.sin(angle);
    const cy = 100 - 82 * Math.cos(angle);
    return { cx, cy, key: index };
  });

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_4px_10px_rgba(14,165,233,0.3)] animate-scale-up"
      >
        {/* Deep Black Inner Circle */}
        <circle cx="100" cy="100" r="96" fill="#000000" />

        {/* Thick Electric Blue Ring */}
        <circle cx="100" cy="100" r="82" stroke="#0EA5E9" strokeWidth="11" />
        
        {/* Double white/light thin container borders */}
        <circle cx="100" cy="100" r="88" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="76" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* 12 Gold Stars placed symmetrically around the blue ring */}
        {stars.map((star) => (
          <g key={star.key} transform={`translate(${star.cx}, ${star.cy})`}>
            {/* 5-pointed Gold Star */}
            <polygon
              points="0,-4 1.2,-1.2 4.2,-1.2 1.8,0.6 2.7,3.6 0,1.8 -2.7,3.6 -1.8,0.6 -4.2,-1.2 -1.2,-1.2"
              fill="#EAB308"
              stroke="#CA8A04"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Stylized Modern Apex "A" Arrowhead Logo */}
        <g transform="translate(100, 72) scale(1.15)">
          {/* Futuristic chevron splits into two sleek wings */}
          <path
            d="M 0 -22 L 20 18 L 10 18 L 0 -4 L -10 18 L -20 18 Z"
            fill="#0EA5E9"
            className="drop-shadow-[0_0_4px_rgba(14,165,233,0.6)]"
          />
          <path
            d="M 0 -13 L 13 13 L 8 13 L 0 -3 L -8 13 L -13 13 Z"
            fill="#0284C7"
          />
        </g>

        {/* A-PEX Text */}
        <text
          x="100"
          y="126"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="23"
          letterSpacing="4"
        >
          A-PEX
        </text>

        {/* FITNESS CENTER Text */}
        <text
          x="100"
          y="150"
          textAnchor="middle"
          fill="#38BDF8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="12.5"
          letterSpacing="1.2"
        >
          FITNESS CENTER
        </text>
      </svg>
    </div>
  );
}
