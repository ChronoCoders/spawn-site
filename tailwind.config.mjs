/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rust: '#C1440E',
        rust2: '#E05520',
        bg: '#080808',
        bg2: '#0F0F0F',
        bg3: '#161616',
        text: '#EFEFEF',
        muted: '#777777',
        dim: '#333333',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
