// compositor.js
// Draws whatever source (live <video> or a static <img>) into a canvas,
// mirrored and "cover"-fitted, then lays your frame.png on top.
// Because frame.png has a transparent window, the source shows through
// automatically wherever the frame is transparent -- no manual masking needed.

const PBCompositor = (() => {
  const CANVAS_W = 1280;
  const CANVAS_H = 720;

  let frameImg = null;
  let frameLoaded = loadFrame();

  function loadFrame() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { frameImg = img; resolve(img); };
      img.onerror = reject;
      img.src = 'assets/frame.png';
    });
  }

  // Draws `source` (video or image element) into ctx using "cover" fit
  // (fills the whole target box, cropping overflow, no distortion).
  function drawCover(ctx, source, targetW, targetH) {
    const sW = source.videoWidth || source.naturalWidth || source.width;
    const sH = source.videoHeight || source.naturalHeight || source.height;
    if (!sW || !sH) return;

    const targetAspect = targetW / targetH;
    const sAspect = sW / sH;
    let sx, sy, sw, sh;

    if (sAspect > targetAspect) {
      sh = sH; sw = sH * targetAspect; sx = (sW - sw) / 2; sy = 0;
    } else {
      sw = sW; sh = sW / targetAspect; sx = 0; sy = (sH - sh) / 2;
    }
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }

  // Main entry point: composite `source` + frame.png into ctx at (w x h).
  // mirror=true flips horizontally (natural "selfie" view for a live camera).
  function drawComposite(ctx, source, { w = CANVAS_W, h = CANVAS_H, mirror = true } = {}) {
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    drawCover(ctx, source, w, h);
    ctx.restore();

    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, h);
    }
  }

  return { CANVAS_W, CANVAS_H, frameLoaded, drawComposite };
})();
