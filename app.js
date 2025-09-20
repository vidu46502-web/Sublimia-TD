// app.js
// No inline JS: this file controls animations, particles and the start flow.

// Wrap everything to avoid global leakage
(() => {
    const root = document.getElementById('root');
    const title = document.getElementById('sublimia');
    const startBtn = document.getElementById('startBtn');
    const overlay = document.getElementById('overlay');
    const screen = document.getElementById('screen');
    const screenTitle = document.getElementById('screenTitle');
    const screenBody = document.getElementById('screenBody');
    const backBtn = document.getElementById('backBtn');
    const toggleAccount = document.getElementById('toggleAccount');
    const particlesCanvas = document.getElementById('particles');
    const bolt = document.getElementById('bolt');
    const startDot = startBtn.querySelector('.start-dot');

    // utilities
    const q = sel => document.querySelector(sel);

    // Progressive letter timing: read --i from inline style or set fallback
    function animateTitle() {
        const letters = Array.from(title.querySelectorAll('span'));
        letters.forEach((el, idx) => {
            const i = parseFloat(el.style.getPropertyValue('--i')) || idx;
            // stagger slightly with easing
            setTimeout(() => {
                el.classList.add('in');
            }, i * 110);
        });

        // after a small delay, toggle a class to set final state (CSS transitions)
        setTimeout(() => {
            title.classList.add('play');
            startBtn.classList.add('play');
        }, letters.length * 110 + 180);
    }

    // lightning flicker: animate stroke opacity/width with subtle flicker
    function flickerBolt() {
        if (!bolt) return;
        const base = { dash: '0 1000', stroke: 10 };
        let t = 0;
        function tick() {
            const flick = Math.random() > 0.84;
            if (flick) {
                bolt.style.strokeWidth = (8 + Math.random() * 10).toFixed(1);
                bolt.style.opacity = (0.65 + Math.random() * 0.5).toFixed(2);
                bolt.style.filter = `drop-shadow(0 12px ${12 + Math.random() * 18}px rgba(180,220,255,0.09))`;
            } else {
                bolt.style.strokeWidth = '9';
                bolt.style.opacity = '0.95';
            }
            t += 1;
            // less frequently as time passes
            setTimeout(tick, 300 + Math.random() * 900);
        }
        tick();
    }

    /***********************
     * Particles: star-fall
     *
     * We draw ephemeral falling stars that leave trails and 'burst' into glow.
     ************************/
    function initParticles() {
        const canvas = particlesCanvas;
        const ctx = canvas.getContext('2d');
        let w = canvas.width = innerWidth;
        let h = canvas.height = innerHeight;
        const DPR = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(DPR, DPR);

        let particles = [];

        function spawn() {
            // spawn a star at random x top area with random velocity
            const x = Math.random() * w;
            const y = -8;
            const vx = (Math.random() - 0.5) * 1.2;
            const vy = 1.6 + Math.random() * 2.2;
            const size = 1 + Math.random() * 2.6;
            const life = 1400 + Math.random() * 1600;
            particles.push({
                x, y, vx, vy, size, life, age: 0, glow: Math.random() > 0.86
            });
        }

        function resize() {
            w = canvas.width = innerWidth;
            h = canvas.height = innerHeight;
            canvas.width = w * DPR;
            canvas.height = h * DPR;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        window.addEventListener('resize', resize);

        // spawn rate control
        let spawnAccum = 0;
        function update(dt) {
            // spawn more when mouse is near top to create dynamic feel
            spawnAccum += dt;
            const rate = 0.004; // spawn per ms
            while (spawnAccum > 1 / rate) {
                spawn();
                spawnAccum -= 1 / rate;
            }
            // update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * (dt * 0.06);
                p.y += p.vy * (dt * 0.06);
                p.age += dt;
                // gravity effect
                p.vy += 0.0009 * dt;
                // slight sway
                p.x += Math.sin((p.age + i) * 0.002) * 0.18;
                if (p.age > p.life || p.y > h + 30) {
                    // create a burst for glows
                    if (p.glow) {
                        createGlow(p.x, p.y, p.size);
                    }
                    particles.splice(i, 1);
                }
            }
        }

        let glows = [];
        function createGlow(x, y, baseSize) {
            glows.push({
                x, y, r: baseSize * 8 + Math.random() * 12, a: 0.8 + Math.random() * 0.2, life: 700 + Math.random() * 900, age: 0
            });
        }

        function render() {
            ctx.clearRect(0, 0, w, h);
            // soft background tint
            ctx.globalCompositeOperation = 'lighter';
            // draw glows
            for (let i = glows.length - 1; i >= 0; i--) {
                const g = glows[i];
                g.age += tickDelta;
                const prog = g.age / g.life;
                if (prog >= 1) { glows.splice(i, 1); continue; }
                const alpha = g.a * (1 - prog);
                const radius = g.r * (0.6 + prog * 0.9);
                const gradient = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, radius);
                gradient.addColorStop(0, `rgba(255,245,210,${alpha})`);
                gradient.addColorStop(0.35, `rgba(150,210,255,${alpha * 0.45})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(g.x, g.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // draw particles as streaks
            particles.forEach(p => {
                const trailLen = p.size * 6;
                const px = p.x, py = p.y;
                // gradient for star
                const g = ctx.createLinearGradient(px - p.vx * trailLen, py - p.vy * trailLen, px, py);
                g.addColorStop(0, 'rgba(255,240,180,0)');
                g.addColorStop(0.6, 'rgba(255,240,200,0.6)');
                g.addColorStop(1, 'rgba(255,250,230,1)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(px, py, p.size * 1.8, p.size * 0.9, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
                ctx.fill();

                // tiny star sparkle
                if (Math.random() > 0.98) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = '#fff6e1';
                    ctx.arc(px + Math.random() * 2, py + Math.random() * 2, Math.max(0.5, p.size * 0.6), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            });

            ctx.globalCompositeOperation = 'source-over';
        }

        // main loop
        let last = performance.now();
        let accum = 0;
        window.tickDelta = 16;
        function frame(now) {
            tickDelta = Math.min(40, now - last);
            last = now;
            update(tickDelta);
            render();
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    // start button click: animate transition and choose destination
    function openFlow() {
        // micro animation: swell the scene
        root.style.transition = 'transform .85s cubic-bezier(.2,.9,.27,1), opacity .9s ease';
        root.style.transform = 'scale(1.06) translateY(-3vh)';
        root.style.opacity = '0.06';

        // little ripple on the bolt
        bolt && (bolt.style.filter = 'drop-shadow(0 36px 60px rgba(180,220,255,0.12))');

        // simulate loading transition
        setTimeout(() => {
            const hasAccount = localStorage.getItem('hasAccount') === 'true';
            if (hasAccount) {
                showOverlay('Welcome back', 'We are launching the game… (placeholder). In a full build this would transition to the actual gameplay scene.');
            } else {
                showOverlay('Create your account', 'No account found. Redirecting to the registration screen (placeholder).');
            }
        }, 900);
    }

    function showOverlay(title, body) {
        screenTitle.textContent = title;
        screenBody.textContent = body;
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
        // subtle content animation
        screen.animate([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.27,1)' });
    }

    function hideOverlay() {
        overlay.classList.remove('visible');
        overlay.setAttribute('aria-hidden', 'true');
        root.style.transform = '';
        root.style.opacity = '';
        bolt && (bolt.style.filter = '');
    }

    // dev toggle for account existence (keeps things self-contained)
    if (toggleAccount) {
        toggleAccount.addEventListener('click', () => {
            const cur = localStorage.getItem('hasAccount') === 'true';
            localStorage.setItem('hasAccount', (!cur).toString());
            toggleAccount.textContent = (!cur) ? 'Unset Account (dev)' : 'Set Account (dev)';
            toggleAccount.blur();
        });
    }

    // attach events
    startBtn.addEventListener('click', (e) => {
        // accessibility: announce pressed
        startBtn.setAttribute('aria-pressed', 'true');
        startBtn.classList.add('active');
        // micro animation
        startBtn.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.02)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.27,1)' });
        // open flow
        openFlow();
    });

    backBtn.addEventListener('click', () => {
        hideOverlay();
    });

    // keyboard: press Enter on start to activate
    startBtn.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); startBtn.click(); } });

    // init animations and particles after paint
    window.addEventListener('load', () => {
        // small delay before title for a cinematic entrance
        setTimeout(() => {
            animateTitle();
            flickerBolt();
        }, 420);

        // initialize particles unless reduced motion requested
        const mm = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!mm.matches) initParticles();
    });

    // accessibility: close overlay with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) {
            hideOverlay();
        }
    });

})();
