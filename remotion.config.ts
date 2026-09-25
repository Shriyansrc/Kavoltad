// Remotion CLI configuration for the Kavolt 20-second film.
// Render settings live here so `npx remotion render` and the npm scripts agree.
import {existsSync} from 'node:fs';
import {Config} from '@remotion/cli/config';

// Lossless PNG frames keep Geist type and Kavey's edges clean before x264.
Config.setVideoImageFormat('png');
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(18);
Config.setColorSpace('bt709');
Config.setAudioBitrate('256k');
Config.setOverwriteOutput(true);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 3));
Config.setChromiumOpenGlRenderer('swangle');

// The cloud container blocks Remotion's Chrome download host, so a local
// Chromium headless shell is used when present. Override with REMOTION_BROWSER.
const localShell =
  process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (existsSync(localShell)) {
  Config.setBrowserExecutable(localShell);
}
