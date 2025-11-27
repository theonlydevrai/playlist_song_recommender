/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm slate backgrounds - soft on eyes
        surface: {
          950: '#1a1d23',
          900: '#22262e',
          850: '#2a2f38',
          800: '#343a45',
          700: '#424957',
          600: '#525b6b',
          500: '#6b7589',
          400: '#8891a5',
          300: '#a8b0c0',
        },
        // Coral/Salmon accent
        accent: {
          coral: '#ff7f6e',
          coralLight: '#ffa599',
          coralDark: '#e65c4a',
        },
        // Teal/Mint 
        mint: {
          DEFAULT: '#4ecdc4',
          light: '#7ee8e1',
          dark: '#2eb5ad',
        },
        // Sky blue
        sky: {
          DEFAULT: '#64b5f6',
          light: '#90caf9',
          dark: '#42a5f5',
        },
        // Warm amber
        amber: {
          DEFAULT: '#ffb74d',
          light: '#ffd180',
          dark: '#ffa726',
        },
        // Lavender
        lavender: {
          DEFAULT: '#b39ddb',
          light: '#d1c4e9',
        },
        // Text colors - warmer whites
        text: {
          primary: '#f0f2f5',
          secondary: '#b8bcc8',
          muted: '#8891a5',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-warm': 'linear-gradient(135deg, #ff7f6e 0%, #ffb74d 100%)',
        'gradient-cool': 'linear-gradient(135deg, #4ecdc4 0%, #64b5f6 100%)',
        'gradient-mixed': 'linear-gradient(135deg, #ff7f6e 0%, #4ecdc4 50%, #64b5f6 100%)',
      },
      boxShadow: {
        'glow-coral': '0 4px 20px -4px rgba(255, 127, 110, 0.35)',
        'glow-coral-lg': '0 8px 30px -4px rgba(255, 127, 110, 0.4)',
        'glow-mint': '0 4px 20px -4px rgba(78, 205, 196, 0.35)',
        'glow-mint-lg': '0 8px 30px -4px rgba(78, 205, 196, 0.4)',
        'soft': '0 4px 20px -4px rgba(0, 0, 0, 0.3)',
        'soft-lg': '0 8px 30px -4px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
