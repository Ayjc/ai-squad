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
        'bg-primary': '#0A0A0B',        // 更深的基础黑
        'bg-secondary': '#1A1B1E',      // 卡片/次级背景
        'bg-surface': '#24262B',        // 悬浮层/输入框
        'bg-surface-card': '#1A1B1E',   // alias for compatibility
        'bg-surface-hover': '#24262B',  // 悬停背景
        'bg-elevated': '#2D2F35',       // 最亮的表面层

        'border': '#2D3139',            // 统一边框
        'border-default': '#2D3139',    // alias for compatibility
        'border-subtle': '#1E2027',     // 微妙分割线
        'border-focus': '#3D4451',      // 焦点/悬停状态

        'text-primary': '#E8EAED',      // 主文本
        'text-secondary': '#9195A0',    // 次级文本
        'text-tertiary': '#6B6F7B',     // 禁用/提示文本
        'text-inverse': '#0A0A0B',      // 反色文本

        // 功能色
        'accent': '#5B9FD8',            // 蓝色主题色
        'accent-hover': '#6AAAE3',      // 悬停状态
        'accent-muted': 'rgba(91, 159, 216, 0.12)',

        'success': '#4CAF70',           // 绿色
        'success-muted': 'rgba(76, 175, 112, 0.12)',

        'warning': '#C89A3F',           // 琥珀色
        'warning-muted': 'rgba(200, 154, 63, 0.12)',

        'error': '#E85D5D',             // 红色
        'error-muted': 'rgba(232, 93, 93, 0.12)',

        // AI 角色专属色
        'codex': '#3D9B7A',             // OpenAI 绿
        'claude': '#C17A33',            // Anthropic 橙
        'gemini': '#5F8FC9',            // Google 蓝
        'opencode': '#8571C4',          // 紫色
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
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 15px rgba(88, 166, 255, 0.5)',
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
