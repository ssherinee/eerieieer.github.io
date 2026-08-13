// capture-gif.js
// Countdown, then burst-capture composited frames at a fixed interval and
// encode them into an animated GIF using gif.js (runs in a Web Worker,
// so encoding doesn't freeze the UI).
//
// GIF frames are captured at a smaller resolution than the photo canvas --
// full 1280x720 GIF encoding is slow and produces huge files, and a GIF is
// a lightweight/fun keepsake, not a high-res deliverable.

const PBCaptureGif = (() => {
  const GIF_W = 640;
  const GIF_H = 360;
  const FRAME_COUNT = 16;
  const FRAME_INTERVAL_MS = 150; // ~2.4s of capture
  const GIF_DELAY_MS = 150;      // playback speed per frame

  // Offscreen canvas used to render each GIF frame at GIF_W x GIF_H
  const offscreen = document.createElement('canvas');
  offscreen.width = GIF_W;
  offscreen.height = GIF_H;
  const offCtx = offscreen.getContext('2d');

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Full flow: countdown -> burst capture -> encode -> resolve with a GIF Blob
  async function capture({ videoEl, countdownEl, onProgress }) {
    await PBCapturePhoto.runCountdown(countdownEl);

    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      PBCompositor.drawComposite(offCtx, videoEl, { w: GIF_W, h: GIF_H, mirror: true });
      frames.push(offCtx.getImageData(0, 0, GIF_W, GIF_H));
      if (onProgress) onProgress(`Capturing ${i + 1}/${FRAME_COUNT}...`);
      await delay(FRAME_INTERVAL_MS);
    }

    if (onProgress) onProgress('Encoding GIF...');

    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: GIF_W,
        height: GIF_H,
        workerScript: 'js/vendor/gif.worker.js'
      });

      frames.forEach(frameData => {
        offCtx.putImageData(frameData, 0, 0);
        gif.addFrame(offCtx, { copy: true, delay: GIF_DELAY_MS });
      });

      gif.on('finished', blob => resolve(blob));
      gif.on('abort', () => reject(new Error('GIF encoding aborted')));
      gif.render();
    });
  }

  return { capture };
})();
