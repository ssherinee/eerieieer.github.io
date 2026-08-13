// capture-photo.js
// Countdown, then draw one composited frame to the output canvas and
// export it as a JPEG blob.

const PBCapturePhoto = (() => {

  function runCountdown(countdownEl, seconds = 3) {
    return new Promise(resolve => {
      let count = seconds;
      countdownEl.textContent = count;
      countdownEl.style.display = 'flex';
      const intervalId = setInterval(() => {
        count--;
        if (count > 0) {
          countdownEl.textContent = count;
        } else {
          clearInterval(intervalId);
          countdownEl.style.display = 'none';
          resolve();
        }
      }, 1000);
    });
  }

  function grabFrame(canvas, ctx, videoEl) {
    PBCompositor.drawComposite(ctx, videoEl, { mirror: true });
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  // Full flow: countdown -> flash -> capture -> resolve with a JPEG Blob
  async function capture({ canvas, ctx, videoEl, countdownEl, flashEl }) {
    await runCountdown(countdownEl);
    const blob = await grabFrame(canvas, ctx, videoEl);
    if (flashEl) {
      flashEl.classList.remove('flash');
      void flashEl.offsetWidth; // restart animation
      flashEl.classList.add('flash');
    }
    return blob;
  }

  return { capture, runCountdown };
})();
