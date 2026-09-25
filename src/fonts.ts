// Local Geist and Geist Mono (variable woff2 from the official `geist` npm
// package, SIL OFL). loadFont() holds rendering until each face is ready.
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT_MONO, FONT_SANS} from './config/type.ts';

export const fontsReady = Promise.all([
  loadFont({family: FONT_SANS, url: staticFile('fonts/Geist-Variable.woff2'), weight: '100 900', display: 'block'}),
  loadFont({family: FONT_MONO, url: staticFile('fonts/GeistMono-Variable.woff2'), weight: '100 900', display: 'block'}),
]);
