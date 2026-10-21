/** Tessera — Tailwind configuration
 *  Rebuild css/styles.css after changing classes (see README, step 9). */
module.exports = {
  content: ['./index.html', './tests.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',      // page background
        coal: '#131313',     // raised panels
        graphite: '#1D1D1D', // inner surfaces
        bone: '#F2F0EA',     // main text
        mute: '#97948C',     // secondary text
        signal: '#FFD000',   // brand yellow: actions and emphasis only
        line: 'rgba(242, 240, 234, 0.12)'
      },
      fontFamily: {
        display: ['Archivo', '"Arial Black"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        sans: ['"Instrument Sans"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
