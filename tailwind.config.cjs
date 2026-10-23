module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dappa palette. Plum is the brand, coral is only ever money leaking out.
        plum: {
          50: '#F6F1F5',
          100: '#ECE1EA',
          200: '#D5BFD2',
          300: '#B792B2',
          400: '#945B8C',
          500: '#6A1B5F',
          600: '#591750',
          700: '#481241',
          800: '#370E31',
          900: '#280A24',
        },
        coral: {
          50: '#FEF1F2',
          100: '#FCE0E2',
          200: '#FABEC3',
          300: '#F69299',
          500: '#F15560',
          600: '#D44B54',
          700: '#B74149',
          800: '#91333A',
        },
        paper: '#FBF6F1',
        sand: '#F3EDE6',
        ink: '#1A1A1A',
      },
      fontFamily: {
        InterTight: ['"Inter Tight"', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
