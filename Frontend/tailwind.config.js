/** @type {import('tailwindcss').Config} */

const apaxBrandColors = {
  'apax-green-light': 'var(--apax-green-light)',
  'apax-green': 'var(--apax-green)',
  'apax-green-10': 'var(--apax-green-10)',
  'apax-border-green': 'var(--apax-border-green)',
  'apax-text': 'var(--apax-text)',
  'apax-gray': 'var(--apax-gray)',
  'apax-ring': 'var(--apax-ring)',
  'apax-bg-gray': 'var(--apax-bg-gray)',
  'apax-card-bg': 'var(--apax-card-bg)',
  'apax-button-hover': 'var(--apax-button-hover)',
  'apax-green-button-hover': 'var(--apax-green-button-hover)',
  'apax-red': 'var(--apax-red)',
  'apax-bg-red': 'var(--apax-bg-red)',
  'apax-red-hover': 'var(--apax-red-hover)',
  'apax-yellow': 'var(--apax-yellow)',
  'apax-bg-yellow': 'var(--apax-bg-yellow)',
  'apax-yellow-hover': 'var(--apax-yellow-hover)',
  'apax-checkbox': 'var(--apax-checkbox)',
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  'apax-green-dark': 'var(--apax-green-dark)',
  'apax-border-green-light': 'var(--apax-border-green-light)',
  'apax-superadmin-widget-bg': 'var(--apax-superadmin-widget-bg)',
  'apax-superadmin-text-green': 'var(--apax-superadmin-text-green)',
  'apax-superadmin-text-black': 'var(--apax-superadmin-text-black)',
  'apax-green-dark-mode': '#255F38',
  'apax-border-dark-mode': '#333333',
  'apax-text-dark-mode': '#F0F0F0',
  'apax-bg-seconday-dark-mode': '#232323',
  'apax-gray-dark-mode': '#121212',
  'apax-bg-card-dark-mode': '#121212',
  'apax-card-border-dark-mode': '#222222',
  'apax-card-iconbg': '#252525',
  'apax-bg-hover-dark-mode': '#353535',
  'apax-bg-button-dark-mode': '#33632E',
  'apax-placeholder-outline-dark-mode': '#636161',
  'apax-border-light-mode': '#DCE7DB',
  'apax-text-light-mode': '#BDBDBD',
};

/** Same palette under legacy `restro-*` names (cached bundles / mixed deploys). */
const restroBrandColors = Object.fromEntries(
  Object.entries(apaxBrandColors).map(([key, value]) => [
    key.replace(/^apax-/, 'restro-'),
    value,
  ])
);

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...apaxBrandColors,
        ...restroBrandColors,
      },
    },
  },
  plugins: [require('daisyui'), require('tailwind-scrollbar')],
  daisyui: {
    themes: ['light', 'black'],
    darkTheme: 'black',
  },
};
