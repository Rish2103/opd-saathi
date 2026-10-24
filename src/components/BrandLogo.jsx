import React from 'react';

/**
 * Original OPD Saathi Brand Identity Mark.
 * Combines a clinical shield, luminous medical cross, and forward patient-flow pathway arc.
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
      className={`group inline-flex items-center gap-2.5 text-left focus:outline-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary via-[#0F3A5D] to-brand-teal shadow-md ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-[1.03] ${
          compact ? 'h-8 w-8 rounded-xl' : 'h-9 w-9'
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className={compact ? 'h-5 w-5' : 'h-6 w-6'}
        >
          <path
            d="M28 15C28 13.8954 28.8954 13 30 13H34C35.1046 13 36 13.8954 36 15V23H44C45.1046 23 46 23.8954 46 25V29C46 30.1046 45.1046 31 44 31H36V39C36 40.1046 35.1046 41 34 41H30C28.8954 41 28 40.1046 28 39V31H20C18.8954 31 18 30.1046 18 29V25C18 23.8954 18.8954 23 20 23H28V15Z"
            fill="#5EEAD4"
          />
          <path
            d="M16 46C22.5 50.5 31.5 51.5 41 48.5C44.5 47.4 47.5 45.5 49.5 43.5"
            stroke="#FFFFFF"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M44.5 42.5L50 43L48.5 48.5"
            stroke="#5EEAD4"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="flex items-center">
          <span
            className={`font-extrabold tracking-tight text-brand-primary whitespace-nowrap ${
              compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base'
            } leading-tight`}
          >
            {title}
          </span>
        </span>
        {subtitle ? (
          <span
            className={`block text-ink-secondary font-medium leading-[1.18] tracking-[-0.01em] mt-0.5 ${
              compact
                ? 'text-[9.5px] sm:text-[10px] whitespace-normal sm:whitespace-nowrap'
                : 'text-[9.5px] sm:text-[10px] xl:text-[10.5px] whitespace-normal sm:whitespace-nowrap'
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </Tag>
  );
}
