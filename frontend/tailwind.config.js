/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FEFDFB',
          100: '#FAF8F4',
          200: '#F5F0E8',
          300: '#EDE6D8',
          400: '#E0D5C1',
        },
        terracotta: {
          400: '#D4845A',
          500: '#C4703F',
          600: '#A85D34',
          700: '#8C4D2B',
        },
        charcoal: {
          800: '#2A2A2A',
          900: '#1A1A1A',
          950: '#111111',
        },
        ocean: {
          400: '#4A90A4',
          500: '#2E7D96',
          600: '#1B6B82',
        },
        marine: {
          success: '#4CAF50',
          warning: '#FF9800',
          danger: '#F44336',
          info: '#2196F3',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'heading': ['2rem', { lineHeight: '1.2' }],
        'subheading': ['1.25rem', { lineHeight: '1.5' }],
        'label': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      spacing: {
        'section': '8rem',
        'section-sm': '5rem',
      },
      maxWidth: {
        'content': '1200px',
        'narrow': '800px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
