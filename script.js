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

  let particlesStarted = false;
  let revealDone = false;

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

  function tryPlayAudio() {
    if (!audio) return;

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.then(() => {
        setPlayingUI(true);
      }).catch(() => {
        setPlayingUI(false);
      });
    } else {
      setPlayingUI(!audio.paused);
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

    audio.addEventListener('play', () => setPlayingUI(true));
    audio.addEventListener('pause', () => setPlayingUI(false));
    audio.addEventListener('ended', () => setPlayingUI(false));
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
