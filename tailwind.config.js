/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色调
        'bg-primary': '#0D1117',      // 深空黑
        'bg-secondary': '#161B22',    // 深灰 (卡片)
        'border-default': '#30363D',  // 边框灰
        'text-primary': '#E6EDF3',    // 亮白
        'text-secondary': '#8B949E',  // 次级灰

        // 功能色
        'accent': '#58A6FF',          // 科技蓝
        'success': '#3FB950',         // 翠绿
        'warning': '#D29922',         // 琥珀
        'error': '#F85149',           // 珊瑚红

        // AI 角色专属色
        'codex': '#10A37F',           // OpenAI 绿
        'claude': '#D97706',          // Anthropic 橙
        'gemini': '#4285F4',          // Google 蓝
        'opencode': '#8B5CF6',        // 紫色
        'droid': '#EC4899',           // 粉红
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
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
