
const PBCamera = (() => {
  let currentStream = null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('camera needs a secure connection. try upload instead.');
  }
  async function start(videoEl) {
    stop(); // make sure any previous stream is released first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
      audio: false
    });
    currentStream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  }

  function stop() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
  }

  return { start, stop };
})();
