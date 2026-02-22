/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        telegram: {
          bg: '#17212b',
          sidebar: '#0e1621',
          message: '#182533',
          'message-out': '#2b5278',
          accent: '#6ab2f2',
          text: '#f5f5f5',
          'text-secondary': '#708499',
          border: '#1f2f3f',
          hover: '#1e2c3a',
          input: '#242f3d',
        },
        crm: {
          new: '#3b82f6',
          contacted: '#f59e0b',
          testing: '#8b5cf6',
          'test-done': '#06b6d4',
          agreed: '#10b981',
          paid: '#22c55e',
          working: '#6366f1',
        },
      },
    },
  },
  plugins: [],
}
