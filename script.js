// ═══ REVEAL ═══
const reveal = document.getElementById('reveal-screen');
const main = document.getElementById('main');

reveal.addEventListener('click', () => {
  reveal.classList.add('out');
  setTimeout(() => {
    reveal.style.display = 'none';
    main.classList.remove('hide');
    main.classList.add('show');
    startParticles();
  }, 700);
});



// ═══ PARTICLES — subtle dots ═══
function startParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  const ctx = c.getContext('2d');

  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize();
  addEventListener('resize', resize);

  const dots = [];
  const N = Math.min(50, ~~(innerWidth * innerHeight / 25000));

  for (let i = 0; i < N; i++) {
    dots.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.2 + .4,
      dx: (Math.random() - .5) * .15,
      dy: (Math.random() - .5) * .15,
      o: Math.random() * .3 + .05,
    });
  }

  (function loop() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const d of dots) {
      d.x += d.dx; d.y += d.dy;
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
  })();
}

// ═══ AUDIO ═══
(function () {
  const a = document.getElementById('audio');
  const pp = document.getElementById('pp');
  const fill = document.getElementById('fill');
  const cur = document.getElementById('cur');
  const dur = document.getElementById('dur');
  const prog = document.getElementById('prog');
  const vol = document.getElementById('vol');
  const bars = document.getElementById('bars');
  
  // Достаем элементы стартового экрана и главной карточки
  const reveal = document.getElementById('reveal-screen');
  const main = document.getElementById('main');

  if (!a || !pp) return;

  a.volume = .15;
  bars.classList.add('paused');

  const fmt = s => {
    if (isNaN(s)) return '0:00';
    const m = ~~(s / 60), sec = ~~(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  };

  a.addEventListener('loadedmetadata', () => dur.textContent = fmt(a.duration));
  a.addEventListener('timeupdate', () => {
    if (!a.duration) return;
    const p = (a.currentTime / a.duration) * 100;
    fill.style.width = p + '%';
    cur.textContent = fmt(a.currentTime);
  });

  // Удобная функция для переключения UI плеера
  const setPlayingUI = (isPlaying) => {
    if (isPlaying) {
      pp.querySelector('.ico-play').classList.add('hide');
      pp.querySelector('.ico-pause').classList.remove('hide');
      bars.classList.remove('paused');
    } else {
      pp.querySelector('.ico-play').classList.remove('hide');
      pp.querySelector('.ico-pause').classList.add('hide');
      bars.classList.add('paused');
    }
  };

  // --- НОВАЯ ЛОГИКА АВТОЗАПУСКА ---
  if (reveal && main) {
    reveal.addEventListener('click', () => {
      // Скрываем стартовую заглушку и показываем контент
      reveal.classList.add('out');
      main.classList.remove('hide');
      main.classList.add('show');
      
      // Запускаем музыку
      a.play();
      setPlayingUI(true);
    });
  }

  pp.addEventListener('click', () => {
    if (a.paused) {
      a.play();
      setPlayingUI(true);
    } else {
      a.pause();
      setPlayingUI(false);
    }
  });

  prog.addEventListener('click', e => {
    const pct = (e.clientX - prog.getBoundingClientRect().left) / prog.offsetWidth;
    a.currentTime = pct * a.duration;
  });

  vol.addEventListener('input', e => { a.volume = e.target.value / 100; });
})();
