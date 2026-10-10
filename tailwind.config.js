/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        paper: '#F3EEE6',
        foam: '#E7E0D4',
        ink: '#14161C',
        panel: '#1C1F27',
        brass: '#C6A15A',
        brassInk: '#2A2112',
        clay: '#8E3B32',
        pine: '#1E6B5C',
        mist: '#5C564E',
      },
    },
  },
  plugins: [],
};
