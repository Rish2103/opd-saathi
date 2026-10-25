import React from 'react';

/**
 * Original OPD Saathi Brand Identity Mark.
 * Combines a tactile 3D espresso emblem, medical cross, and forward patient pathway arc.
 */
export default function BrandLogo({
  title = 'OPD Saathi',
  subtitle = '',
  compact = false,
  onClick
}) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`group inline-flex max-w-full items-center gap-2.5 text-left focus:outline-none ${
        onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-100' : ''
      }`}
    >
      <span
        className={`relative inline-flex shrink-0 items-center justify-center bg-[#1E1915] border border-[#C84B31]/60 border-b-2 border-b-[#0D0A08] shadow-sm ${
          compact ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={compact ? 'h-5 w-5' : 'h-5 w-5'}
        >
          <path
            d="M28 15C28 13.8954 28.8954 13 30 13H34C35.1046 13 36 13.8954 36 15V23H44C45.1046 23 46 23.8954 46 25V29C46 30.1046 45.1046 31 44 31H36V39C36 40.1046 35.1046 41 34 41H30C28.8954 41 28 40.1046 28 39V31H20C18.8954 31 18 30.1046 18 29V25C18 23.8954 18.8954 23 20 23H28V15Z"
            fill="#F5A623"
          />
          <path
            d="M16 46C22.5 50.5 31.5 51.5 41 48.5C44.5 47.4 47.5 45.5 49.5 43.5"
            stroke="#FFFDF9"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M44.5 42.5L50 43L48.5 48.5"
            stroke="#EB5E3E"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="flex items-center gap-2">
          <span
            className={`font-extrabold tracking-tight text-brand-primary whitespace-nowrap ${
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-[17px]'
            } leading-tight`}
          >
            {title}
          </span>
        </span>
        {subtitle ? (
          <span
            className={`block text-ink-secondary font-medium leading-snug tracking-normal mt-0.5 break-words ${
              compact ? 'text-[11px]' : 'text-[11px] sm:text-xs'
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </Tag>
  );
}
