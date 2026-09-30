import React from 'react';

interface LogoProps {
  size?: number | string;
  showText?: boolean;
  className?: string;
  textColor?: string;
  goldColor?: string;
  onBlue?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 40,
  showText = true,
  className = '',
  textColor,
  goldColor = '#C9A227',
  onBlue = false,
}) => {
  const stemClass = onBlue ? 'text-white' : 'text-[#0A1F44] dark:text-white';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="proctusLogoGold" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={goldColor} />
            <stop offset="100%" stopColor="#E6C86E" />
          </linearGradient>
          <filter id="subtleLogoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#C9A227" floodOpacity="0.3" />
          </filter>
        </defs>
        {/* Monogramme 'P' stylisé : Courbe boursière et Flèche ascendante */}
        <g filter="url(#subtleLogoShadow)">
          {/* Hampe verticale gauche */}
          <path
            d="M 28 85 L 28 26"
            stroke={onBlue ? '#FFFFFF' : 'currentColor'}
            strokeWidth="9"
            strokeLinecap="round"
            className={stemClass}
          />
          {/* Flèche vers le haut au sommet de la hampe gauche */}
          <path
            d="M 20 30 L 28 14 L 36 30 Z"
            fill={onBlue ? '#FFFFFF' : 'currentColor'}
            className={stemClass}
          />
          {/* Courbe droite ascendante Or (#C9A227) */}
          <path
            d="M 28 22 C 58 20 74 34 74 48 C 74 62 56 70 28 70"
            fill="none"
            stroke="url(#proctusLogoGold)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Spark / Sommet d'impulsion boursière */}
          <circle cx="66" cy="38" r="3.5" fill={onBlue ? '#FFFFFF' : '#C9A227'} />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-wider text-xl uppercase ${
              textColor || (onBlue ? 'text-white' : 'text-[#0A1F44] dark:text-white')
            }`}
            style={{ letterSpacing: '0.08em' }}
          >
            PROCTUS
          </span>
          <span className="text-[9px] tracking-widest uppercase font-semibold text-[#C9A227] mt-0.5">
            Finance Cohort
          </span>
        </div>
      )}
    </div>
  );
};
