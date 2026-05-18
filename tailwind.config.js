/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  darkMode: ['class', '[data-contrast="high"]'],
  theme: {
    extend: {
      colors: {
        // Palette teal — légèrement réajustée pour matcher la maquette
        teal: {
          50:  '#EEF6F4',
          100: '#D5EAE6',
          200: '#A8D3CC',
          300: '#6FB6AC',
          400: '#3D998D',
          500: '#1F7D72',
          600: '#176860',
          700: '#11514B',
          800: '#0B3936',
          900: '#062321',
        },
        pink: {
          50:  '#FDE8F4',
          100: '#FBC4E3',
          200: '#F68AC1',
          300: '#EF509F',
          400: '#E82E88',
          500: '#E4197F',
          600: '#CB1570',
          700: '#A21159',
          800: '#780D42',
          900: '#4E082C',
        },
        // Nouvelle palette crème : fond + bordures + accent doux
        cream: {
          50:  '#FBF8F2',
          100: '#F5EFE3',
          200: '#EDE3CE',
          300: '#E0D2B0',
          400: '#C8B485',
          500: '#A9925E',
          600: '#7C6A45',
          700: '#554930',
          800: '#322A1C',
          900: '#19150E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle de typographie scalable via --font-scale (A- / A+)
        'fluid-xs': 'calc(0.75rem * var(--font-scale, 1))',
        'fluid-sm': 'calc(0.875rem * var(--font-scale, 1))',
        'fluid-base': 'calc(1rem * var(--font-scale, 1))',
        'fluid-lg': 'calc(1.125rem * var(--font-scale, 1))',
        'fluid-xl': 'calc(1.25rem * var(--font-scale, 1))',
        'fluid-2xl': 'calc(1.5rem * var(--font-scale, 1))',
        'fluid-3xl': 'calc(1.875rem * var(--font-scale, 1))',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(17, 81, 75, 0.06), 0 1px 2px rgba(17, 81, 75, 0.04)',
        card: '0 4px 14px rgba(17, 81, 75, 0.06)',
        focus: '0 0 0 3px rgba(31, 125, 114, 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'in': 'fade-in 0.25s ease-out',
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in-from-bottom-4': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-right-4': 'slide-in-from-right 0.3s ease-out',
        'zoom-in-95': 'zoom-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
