/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff00e5',
          green: '#39ff14',
          yellow: '#f0ff00',
          purple: '#bf00ff',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          heavy: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        neon: '0 0 15px rgba(0, 240, 255, 0.3)',
        'neon-magenta': '0 0 15px rgba(255, 0, 229, 0.3)',
        'neon-green': '0 0 15px rgba(57, 255, 20, 0.3)',
        glow: '0 0 30px rgba(0, 240, 255, 0.15)',
      },
    },
  },
  plugins: [],
};
