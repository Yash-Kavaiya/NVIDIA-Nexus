/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nvidia: {
          black: '#0A0A0A',
          dark: '#141414',
          gray: '#1E1E1E',
          'gray-light': '#2A2A2A',
          'gray-medium': '#666666',
          green: '#76B900',
          'green-bright': '#00FF9F',
          'green-dark': '#5A8F00',
          white: '#FFFFFF',
          'text-secondary': '#B3B3B3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #76B900, 0 0 10px #76B900' },
          '100%': { boxShadow: '0 0 20px #76B900, 0 0 30px #76B900' },
        },
      },
    },
  },
  plugins: [],
}
