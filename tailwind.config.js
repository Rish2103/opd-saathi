/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        brand: {
          navy: 'var(--brand-navy)',
          teal: 'var(--brand-teal)',
          tealHover: 'var(--brand-teal-hover)',
          tealSoft: 'var(--brand-teal-soft)',
        },
        status: {
          emergency: 'var(--status-emergency)',
          emergencyBg: 'var(--status-emergency-bg)',
          emergencyBorder: 'var(--status-emergency-border)',
          warning: 'var(--status-warning)',
          warningBg: 'var(--status-warning-bg)',
          warningBorder: 'var(--status-warning-border)',
          success: 'var(--status-success)',
          successBg: 'var(--status-success-bg)',
          successBorder: 'var(--status-success-border)',
        },
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
        mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
