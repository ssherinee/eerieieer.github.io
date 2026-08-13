(() => {
  // ---------- DOM refs ----------
  const screens = {
    home: document.getElementById('screen-home'),
    capture: document.getElementById('screen-capture'),
    final: document.getElementById('screen-final')
  };

  const startBtn = document.getElementById('startBtn');
  const backHomeBtn = document.getElementById('backHomeBtn');
  const modeTabs = Array.from(document.querySelectorAll('.mode-tab'));

  const videoEl = document.getElementById('liveVideo');
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const countdownEl = document.getElementById('countdownOverlay');
  const flashEl = document.getElementById('flashOverlay');
  const captureHint = document.getElementById('captureHint');

  const uploadInput = document.getElementById('uploadInput');
  const shutterBtn = document.getElementById('shutterBtn');
  const uploadPickBtn = document.getElementById('uploadPickBtn');
  const useUploadBtn = document.getElementById('useUploadBtn');

  const resultImg = document.getElementById('resultImg');
  const downloadBtn = document.getElementById('downloadBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const homeBtn = document.getElementById('homeBtn');

  // ---------- State ----------
  let currentMode = 'photo';      
  let uploadedImg = null;          
  let previewLoopId = null;
  let busy = false;                
  let resultBlob = null;
  let resultMime = null;

  // ---------- Screen switching ----------
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ---------- Live preview loop (photo/gif modes) ----------
  function startPreviewLoop() {
    stopPreviewLoop();
    const loop = () => {
      if (currentMode === 'upload') {
        if (uploadedImg) PBCompositor.drawComposite(ctx, uploadedImg, { mirror: false });
      } else if (videoEl.readyState >= 2) {
        PBCompositor.drawComposite(ctx, videoEl, { mirror: true });
      }
      previewLoopId = requestAnimationFrame(loop);
    };
    previewLoopId = requestAnimationFrame(loop);
  }

  function stopPreviewLoop() {
    if (previewLoopId) cancelAnimationFrame(previewLoopId);
    previewLoopId = null;
  }

  // ---------- Mode switching ----------
  async function setMode(mode) {
    if (busy) return;
    currentMode = mode;
    uploadedImg = null;

    modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));

    shutterBtn.hidden = mode === 'upload';
    uploadPickBtn.hidden = mode !== 'upload';
    useUploadBtn.hidden = true;
    captureHint.textContent = '';

    if (mode === 'upload') {
      PBCamera.stop();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      captureHint.textContent = 'Choose an image from your device.';
    } else {
      shutterBtn.textContent = mode === 'photo' ? 'Take Photo' : 'Record GIF';
      try {
        await PBCamera.start(videoEl);
      } catch (err) {
        captureHint.textContent = 'Camera access failed: ' + err.message;
      }
    }
  }

  // ---------- Entering / leaving the capture screen ----------
  async function enterCaptureScreen() {
    showScreen('capture');
    await PBCompositor.frameLoaded;
    startPreviewLoop();
    await setMode('photo');
  }

  function leaveCaptureScreen() {
    stopPreviewLoop();
    PBCamera.stop();
  }

  // ---------- Capture actions ---------- //
  async function onShutterClick() {
    if (busy) return;
    busy = true;
    shutterBtn.disabled = true;

    try {
      if (currentMode === 'photo') {
        const blob = await PBCapturePhoto.capture({ canvas, ctx, videoEl, countdownEl, flashEl });
        finishCapture(blob, 'image/jpeg');
      } else if (currentMode === 'gif') {
        const blob = await PBCaptureGif.capture({
          videoEl,
          countdownEl,
          onProgress: msg => { captureHint.textContent = msg; }
        });
        finishCapture(blob, 'image/gif');
      }
    } catch (err) {
      captureHint.textContent = 'Something went wrong: ' + err.message;
    } finally {
      busy = false;
      shutterBtn.disabled = false;
    }
  }

  function onUploadPickClick() {
    uploadInput.value = '';
    uploadInput.click();
  }

  function onFileChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      uploadedImg = img;
      PBCompositor.drawComposite(ctx, uploadedImg, { mirror: false });
      useUploadBtn.hidden = false;
      captureHint.textContent = 'Looks good? Use this photo, or choose a different one.';
    };
    img.src = URL.createObjectURL(file);
  }

  function onUseUploadClick() {
    PBCompositor.drawComposite(ctx, uploadedImg, { mirror: false });
    canvas.toBlob(blob => finishCapture(blob, 'image/jpeg'), 'image/jpeg', 0.92);
  }

  function finishCapture(blob, mime) {
    resultBlob = blob;
    resultMime = mime;
    resultImg.src = URL.createObjectURL(blob);
    leaveCaptureScreen();
    showScreen('final');
  }

  function onDownloadClick() {
    if (!resultBlob) return;
    const ext = resultMime === 'image/gif' ? 'gif' : 'jpg';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `photobooth-${Date.now()}.${ext}`;
    a.click();
  }

  function onRetakeClick() {
    resultBlob = null;
    resultMime = null;
    enterCaptureScreen();
  }

  // ---------- Wire up events ----------
  startBtn.addEventListener('click', enterCaptureScreen);
  backHomeBtn.addEventListener('click', () => { leaveCaptureScreen(); showScreen('home'); });
  modeTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

  shutterBtn.addEventListener('click', onShutterClick);
  uploadPickBtn.addEventListener('click', onUploadPickClick);
  uploadInput.addEventListener('change', onFileChosen);
  useUploadBtn.addEventListener('click', onUseUploadClick);

  downloadBtn.addEventListener('click', onDownloadClick);
  retakeBtn.addEventListener('click', onRetakeClick);
  homeBtn.addEventListener('click', () => showScreen('home'));
})();
