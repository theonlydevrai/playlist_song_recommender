/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep black backgrounds
        bg: {
          DEFAULT: '#0a0a0a',
          surface1: '#0f0f0f',
          surface2: '#141414',
        },
        // Grey palette
        grey: {
          primary: '#404040',
          secondary: '#9a9a9a',
          tertiary: '#707070',
          border: '#404040',
        },
        // Text colors
        text: {
          primary: '#f5f5f5',
          secondary: '#b0b0b0',
          disabled: '#5a5a5a',
        },
        // Accent colors
        accent: {
          blue: '#3b82f6',
          pink: '#FB7185',
        },
      },
      backgroundColor: {
        'surface-1': 'rgba(15, 15, 15, 0.95)',
        'surface-2': 'rgba(20, 20, 20, 0.95)',
      },
      borderColor: {
        'subtle': 'rgba(64, 64, 64, 0.2)',
        'default': '#404040',
      },
    },
  },
  plugins: [],
}
