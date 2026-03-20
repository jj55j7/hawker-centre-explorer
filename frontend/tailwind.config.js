/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        hawker: {
          red:    '#C0392B',
          orange: '#E67E22',
          warm:   '#F5F0E8',
          dark:   '#1A1208',
          card:   '#FFFDF7',
          muted:  '#8B7355',
          border: '#E8DFC8',
        },
      },
    },
  },
  plugins: [],
}

// /** @type {import('tailwindcss').Config} */
// export default {
//   content: [],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }

