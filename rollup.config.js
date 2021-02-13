import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default [
  // browser-friendly UMD build
  {
    input: 'src/main.js',
    output: {
      name: 'MetaPNG',
      file: pkg.main,
      format: 'umd',
    },
    plugins: [
      terser(),
    ],
  },

];
