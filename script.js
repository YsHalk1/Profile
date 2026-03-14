// ═══ REVEAL + PARTICLES + AUDIO ═══
(function () {
  const reveal = document.getElementById('reveal-screen');
  const main = document.getElementById('main');
  const audio = document.getElementById('audio');
  const pp = document.getElementById('pp');
  const fill = document.getElementById('fill');
  const cur = document.getElementById('cur');
  const dur = document.getElementById('dur');
  const prog = document.getElementById('prog');
  const vol = document.getElementById('vol');
  const bars = document.getElementById('bars');
  const bgVideos = document.querySelectorAll('video');
  const bg = document.querySelector('.bg');
  const visualizer = document.getElementById('visualizer');

  let visualizerCtx = null;
  let vizW = 0;
  let vizH = 0;

  let particlesStarted = false;
  let revealDone = false;
  let audioCtx = null;
  let analyser = null;
  let rafId = null;
  let sourceNode = null;
  let silenceFrames = 0;

  function startParticles() {
    if (particlesStarted) return;
    particlesStarted = true;

    const c = document.getElementById('particles');
    if (!c) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const dots = [];
    const N = Math.min(36, Math.floor((window.innerWidth * window.innerHeight) / 32000));

    for (let i = 0; i < N; i++) {
      dots.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.1 + 0.4,
        dx: (Math.random() - 0.5) * 0.12,
        dy: (Math.random() - 0.5) * 0.12,
        o: Math.random() * 0.22 + 0.04,
      });
    }

    function loop() {
      ctx.clearRect(0, 0, c.width, c.height);

      for (const d of dots) {
        d.x += d.dx;
        d.y += d.dy;

        if (d.x < 0) d.x = c.width;
        if (d.x > c.width) d.x = 0;
        if (d.y < 0) d.y = c.height;
        if (d.y > c.height) d.y = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.o})`;
        ctx.fill();
      }

      requestAnimationFrame(loop);
    }

    loop();
  }

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function setPlayingUI(isPlaying) {
    if (!pp || !bars) return;

    const playIcon = pp.querySelector('.ico-play');
    const pauseIcon = pp.querySelector('.ico-pause');

    if (playIcon) playIcon.classList.toggle('hide', isPlaying);
    if (pauseIcon) pauseIcon.classList.toggle('hide', !isPlaying);
    bars.classList.toggle('paused', !isPlaying);
  }

  function setupVisualizerCanvas() {
    if (!visualizer) return;
    if (!visualizerCtx) {
      visualizerCtx = visualizer.getContext('2d');
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = visualizer.getBoundingClientRect();
    const nextW = Math.max(1, Math.floor(rect.width * dpr));
    const nextH = Math.max(1, Math.floor(rect.height * dpr));

    if (visualizer.width !== nextW || visualizer.height !== nextH) {
      visualizer.width = nextW;
      visualizer.height = nextH;
      if (visualizerCtx) {
        visualizerCtx.setTransform(1, 0, 0, 1, 0, 0);
        visualizerCtx.scale(dpr, dpr);
      }
    }

    vizW = Math.max(1, rect.width);
    vizH = Math.max(1, rect.height);
  }

  function drawVisualizer(data) {
    if (!visualizerCtx || !vizW || !vizH || !data) return;

    const ctx = visualizerCtx;
    ctx.clearRect(0, 0, vizW, vizH);

    const barsCount = 52;
    const barW = vizW / barsCount;
    const centerY = vizH / 2;

    for (let i = 0; i < barsCount; i++) {
      const idx = Math.floor((i / barsCount) * data.length * 0.85);
      const amp = data[idx] / 255;
      const wave = 0.3 + Math.sin((i / barsCount) * Math.PI) * 0.7;
      const h = Math.max(2, amp * vizH * 0.55 * wave);
      const x = i * barW + barW * 0.15;
      const w = barW * 0.68;

      const alpha = 0.16 + amp * 0.45;
      ctx.fillStyle = `rgba(235, 244, 255, ${alpha.toFixed(3)})`;
      ctx.fillRect(x, centerY - h, w, h * 2);
    }

    const grad = ctx.createRadialGradient(vizW / 2, centerY, 1, vizW / 2, centerY, vizW * 0.52);
    grad.addColorStop(0, 'rgba(215,230,255,0.24)');
    grad.addColorStop(1, 'rgba(215,230,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vizW, vizH);
  }

  function clearVisualizer() {
    if (!visualizerCtx || !vizW || !vizH) return;
    visualizerCtx.clearRect(0, 0, vizW, vizH);
  }

  function setBgBrightness(v) {
    if (!bg) return;
    const value = Math.max(0.22, Math.min(0.95, v));
    document.documentElement.style.setProperty('--bg-brightness', value.toFixed(3));
  }

  function stopBgReactive() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    silenceFrames = 0;
    setBgBrightness(0.32);
    clearVisualizer();
  }

  function startBgReactive() {
    if (!audio || !bg || audio.paused || audio.ended) return;

    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }

    if (!sourceNode) {
      sourceNode = audioCtx.createMediaElementSource(audio);
    }

    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    if (rafId) return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyser || !audio || audio.paused) {
        stopBgReactive();
        return;
      }

      analyser.getByteFrequencyData(data);
      drawVisualizer(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }

      const energy = sum / (data.length * 255);
      const eased = Math.pow(energy, 0.7);
      const target = 0.30 + eased * 0.45;

      if (energy < 0.02) {
        silenceFrames += 1;
      } else {
        silenceFrames = 0;
      }

      setBgBrightness(silenceFrames > 10 ? 0.32 : target);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  function tryPlayAudio() {
    if (!audio) return;

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.then(() => {
        setPlayingUI(true);
        startBgReactive();
      }).catch(() => {
        setPlayingUI(false);
        stopBgReactive();
      });
    } else {
      setPlayingUI(!audio.paused);
      if (audio.paused) {
        stopBgReactive();
      } else {
        startBgReactive();
      }
    }
  }

  function enterSite() {
    if (revealDone) return;
    revealDone = true;

    if (reveal) reveal.classList.add('out');

    setTimeout(() => {
      if (reveal) reveal.style.display = 'none';
      if (main) {
        main.classList.remove('hide');
        main.classList.add('show');
      }

      startParticles();
      tryPlayAudio();
    }, 700);
  }

  if (reveal) {
    reveal.addEventListener('click', enterSite, { passive: true });
    reveal.addEventListener('touchend', enterSite, { passive: true });
  } else {
    if (main) {
      main.classList.remove('hide');
      main.classList.add('show');
    }
    startParticles();
  }

  setupVisualizerCanvas();
  window.addEventListener('resize', setupVisualizerCanvas);

  if (audio) {
    audio.volume = 0.15;
    setPlayingUI(false);

    audio.addEventListener('loadedmetadata', () => {
      if (dur) dur.textContent = fmt(audio.duration);
      if (cur) cur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const p = (audio.currentTime / audio.duration) * 100;
      if (fill) fill.style.width = `${p}%`;
      if (cur) cur.textContent = fmt(audio.currentTime);
    });

    audio.addEventListener('play', () => {
      setPlayingUI(true);
      startBgReactive();
    });
    audio.addEventListener('pause', () => {
      setPlayingUI(false);
      stopBgReactive();
    });
    audio.addEventListener('ended', () => {
      setPlayingUI(false);
      stopBgReactive();
    });
  }

  if (pp && audio) {
    pp.addEventListener('click', () => {
      if (audio.paused) {
        tryPlayAudio();
      } else {
        audio.pause();
      }
    });
  }

  if (prog && audio) {
    prog.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = prog.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = Math.max(0, Math.min(audio.duration, pct * audio.duration));
    });
  }

  if (vol && audio) {
    vol.addEventListener('input', (e) => {
      audio.volume = Number(e.target.value) / 100;
    });
  }

  // Telegram/WebView fallback для видео
  bgVideos.forEach((v) => {
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        v.classList.add('video-fallback');
      });
    }

    v.addEventListener('error', () => {
      v.classList.add('video-fallback');
    });
  });
})();
