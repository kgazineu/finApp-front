/** @type {import('tailwindcss').Config} */
module.exports = {
  // inclui os tokens visuais compartilhados (front-shared/src/ui.ts)
  content: ['./src/**/*.{ts,tsx}', '../front-shared/src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // o app é só tema claro (app.json userInterfaceStyle); 'media' quebra ao fixar o tema na web
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
};
