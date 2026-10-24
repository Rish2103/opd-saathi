/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F7FA',
        surface: '#FFFFFF',
        subtle: '#E8EEF5',
        'border-subtle': '#CBD5E1',
        'border-strong': '#94A3B8',
        ink: {
          primary: '#0F172A',
          secondary: '#334155',
          muted: '#475569',
        },
        brand: {
          primary: '#0B2545',
          navy: '#0B2545',
          teal: '#0D6E6E',
          tealHover: '#095252',
          tealSoft: '#E6F4F4',
        },
        status: {
          serving: '#15803D',
          next: '#B45309',
          emergency: '#B91C1C',
          emergencyBg: '#FEF2F2',
          emergencyBorder: '#F87171',
          warning: '#B45309',
          warningBg: '#FFFBEB',
          warningBorder: '#FBBF24',
          success: '#15803D',
          successBg: '#F0FDF4',
          successBorder: '#4ADE80',
        },
      },
      boxShadow: {
        card: '0 2px 8px rgba(11, 37, 69, 0.08)',
      },
      fontFamily: {
        sans: [
          'Noto Sans',
          'Noto Sans Devanagari',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        devanagari: [
          'Noto Sans Devanagari',
          'Noto Sans',
          'system-ui',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Mono', 'Courier New', 'monospace'],
        token: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
