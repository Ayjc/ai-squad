/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm Minimal Light theme
        'bg-primary': '#F7F4EF',
        'bg-secondary': '#EFE9E1',
        'bg-surface': '#FFFFFF',
        'bg-surface-card': '#FFFFFF',
        'bg-surface-hover': '#F5EFE7',
        'bg-elevated': '#FFFFFF',

        'border': '#D8CEC3',
        'border-default': '#D8CEC3',
        'border-subtle': '#E6DED4',
        'border-focus': '#B9AB9B',

        'text-primary': '#2C2A27',
        'text-secondary': '#5E5952',
        'text-tertiary': '#7A736A',
        'text-inverse': '#F7F4EF',

        'accent': '#2E7A76',
        'accent-hover': '#276B68',
        'accent-muted': 'rgba(46, 122, 118, 0.12)',

        'success': '#3B8E5F',
        'success-muted': 'rgba(59, 142, 95, 0.12)',

        'warning': '#B7853B',
        'warning-muted': 'rgba(183, 133, 59, 0.12)',

        'error': '#BF5B53',
        'error-muted': 'rgba(191, 91, 83, 0.12)',

        // AI 角色专属色
        'codex': '#3F8B70',
        'claude': '#B67A3A',
        'gemini': '#4E7FAB',
        'opencode': '#7563B0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '128': '32rem',
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(44, 42, 39, 0.08)',
        'DEFAULT': '0 10px 24px -18px rgba(44, 42, 39, 0.24), 0 2px 8px rgba(44, 42, 39, 0.08)',
        'md': '0 10px 24px -18px rgba(44, 42, 39, 0.24), 0 2px 8px rgba(44, 42, 39, 0.08)',
        'lg': '0 16px 36px -24px rgba(44, 42, 39, 0.28), 0 6px 14px rgba(44, 42, 39, 0.12)',
        'xl': '0 24px 48px -30px rgba(44, 42, 39, 0.3), 0 8px 18px rgba(44, 42, 39, 0.14)',
        'glow': '0 0 18px rgba(46, 122, 118, 0.28)',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'ease-in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'progress': 'progress 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        progress: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
