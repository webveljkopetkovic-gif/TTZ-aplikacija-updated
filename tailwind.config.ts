import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        card: '#F3F3EF',
        line: '#E4E4DE',
        ink: '#151515',
        muted: '#5E5E66',
        brand: '#ABF92C',
        'brand-text': '#3A6B00',
        chart: '#4F8A00',
        danger: '#B42A18',
      },
      fontFamily: { sans: ['Outfit', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '24px', 'card-lg': '28px' },
      minHeight: { btn: '44px' },
    },
  },
  plugins: [],
} satisfies Config
