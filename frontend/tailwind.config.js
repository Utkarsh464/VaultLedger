/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep space dark theme
        void: {
          900: '#020408',
          800: '#060d15',
          700: '#0a1628',
          600: '#0f2040',
        },
        // Electric cyan/teal accent
        arc: {
          400: '#00e5ff',
          500: '#00c8e0',
          600: '#00a8bc',
        },
        // Gold accent for money
        aurum: {
          300: '#ffd873',
          400: '#ffbb33',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Danger red
        plasma: {
          400: '#ff4d6d',
          500: '#e63950',
        },
        // Success green
        verdant: {
          400: '#00e676',
          500: '#00c853',
        },
        // Glass surfaces
        glass: {
          50: 'rgba(255,255,255,0.03)',
          100: 'rgba(255,255,255,0.06)',
          200: 'rgba(255,255,255,0.10)',
          300: 'rgba(255,255,255,0.15)',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(0,229,255,0.04)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E\")",
        'radial-glow': 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.12) 0%, transparent 70%)',
        'gold-glow': 'radial-gradient(ellipse at 50% 50%, rgba(255,187,51,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'arc': '0 0 20px rgba(0,229,255,0.25), 0 0 60px rgba(0,229,255,0.1)',
        'aurum': '0 0 20px rgba(255,187,51,0.25), 0 0 60px rgba(255,187,51,0.1)',
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card': '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04)',
      },
      animation: {
        'pulse-arc': 'pulse-arc 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        'pulse-arc': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,229,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,229,255,0.6), 0 0 80px rgba(0,229,255,0.2)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
