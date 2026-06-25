/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'Courier New', 'Courier', 'monospace'],
      },
      colors: {
        crt: {
          green: '#00ff66',
          dim: '#00aa44',
          darkgreen: '#001a08',
          bg: '#050d06',
          red: '#ff2a2a',
          redDim: '#880000',
          yellow: '#ffcc00'
        }
      },
      animation: {
        flicker: 'flicker 0.2s infinite',
        pulseSlow: 'pulseSlow 2s infinite',
        typewriter: 'typewriter 1s steps(40) 1s 1 normal both',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.98' },
          '50%': { opacity: '1.0' }
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1.0' }
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      }
    },
  },
  plugins: [],
}
