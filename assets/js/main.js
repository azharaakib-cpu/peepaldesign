/* ==========================================================================
   PEEPAL DESIGN — "THE CONTACT SHEET"
   Motion is one authored idea: an undeveloped frame comes up in the tray.
   Everything below degrades to fully-readable static content without JS.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ------------------------------------------------------------- DEVELOP */
  var devs = $$('.develop');
  devs.forEach(function (el) {
    var d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('developed');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    devs.forEach(function (el) { io.observe(el); });
  } else {
    devs.forEach(function (el) { el.classList.add('developed'); });
  }

  /* --------------------------------------------------------------- LOUPE */
  /* The cursor loupe belongs to the hero banner only. Everywhere else the
     pointer gets no follow effect, so it is switched off the moment the
     cursor leaves the hero rather than trailing down the whole page. */
  var loupe = $('#loupe');
  var heroEl = $('#hero');
  if (loupe && heroEl && !reduced && window.matchMedia('(pointer:fine)').matches) {
    var lx = window.innerWidth / 2, ly = window.innerHeight / 2, tx = lx, ty = ly, lraf = 0;
    var heroBottom = 0, heroTop = 0;
    var measureHero = function () {
      heroTop = heroEl.offsetTop;
      heroBottom = heroTop + heroEl.offsetHeight;
    };
    measureHero();

    /* The scrim over the hero artwork is masked around this point, so the loupe
       raises local exposure on the backdrop as well as casting its own glow.
       Parking it far off-canvas restores the flat resting scrim. */
    var parkScrim = function () {
      heroEl.style.setProperty('--hx', '-999px');
      heroEl.style.setProperty('--hy', '-999px');
    };

    var moveLoupe = function () {
      lx += (tx - lx) * 0.14;
      ly += (ty - ly) * 0.14;
      loupe.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      /* the loupe is fixed to the viewport, the scrim is absolute inside the
         hero — so the y has to be carried into the hero's own coordinates */
      heroEl.style.setProperty('--hx', lx.toFixed(0) + 'px');
      heroEl.style.setProperty('--hy', (ly + window.pageYOffset - heroTop).toFixed(0) + 'px');
      if (Math.abs(tx - lx) > 0.4 || Math.abs(ty - ly) > 0.4) { lraf = requestAnimationFrame(moveLoupe); }
      else { lraf = 0; }
    };

    window.addEventListener('pointermove', function (e) {
      /* cached against scroll position, so no layout read per move */
      var overHero = (window.pageYOffset + e.clientY) <= heroBottom;
      if (!overHero) { loupe.classList.remove('on'); parkScrim(); return; }
      tx = e.clientX; ty = e.clientY;
      loupe.classList.add('on');
      if (!lraf) lraf = requestAnimationFrame(moveLoupe);
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      loupe.classList.remove('on');
      parkScrim();
    });

    var hrt;
    window.addEventListener('resize', function () {
      clearTimeout(hrt); hrt = setTimeout(measureHero, 140);
    }, { passive: true });
  }

  /* --------------------------------------------------- HERO CONTACT SHEET */
  var sheet = $('#sheet');
  if (sheet && sheet.getContext) {
    (function () {
      var ctx = sheet.getContext('2d');
      var buf = document.createElement('canvas');
      var bctx = buf.getContext('2d');
      var mask = document.createElement('canvas');
      var mctx = mask.getContext('2d');
      var MR = 300;                    // loupe radius in CSS px
      var dpr = 1, W = 0, H = 0;
      var px = -9999, py = -9999, hasPointer = false;
      var scrollOff = 0, started = 0;
      var frames = [];

      function rng(seed) {
        return function () {
          seed |= 0; seed = seed + 0x6D2B79F5 | 0;
          var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }

      /* one small abstract exposure inside a frame */
      function drawExposure(c, x, y, w, h, seed) {
        var r = rng(seed);
        var g = c.createLinearGradient(x, y, x, y + h);
        var base = 24 + r() * 26;
        g.addColorStop(0, 'rgb(' + (base + 22) + ',' + (base + 22) + ',' + (base + 25) + ')');
        g.addColorStop(1, 'rgb(' + base + ',' + base + ',' + (base + 3) + ')');
        c.fillStyle = g;
        c.fillRect(x, y, w, h);

        var kind = Math.floor(r() * 5);
        c.save();
        c.beginPath(); c.rect(x, y, w, h); c.clip();

        if (kind === 0) {                                   // stacked message bars
          for (var i = 0; i < 5; i++) {
            var bw = w * (0.3 + r() * 0.5);
            c.fillStyle = 'rgba(232,233,236,' + (0.06 + r() * 0.14).toFixed(3) + ')';
            c.fillRect(x + w * 0.1 + (i % 2 ? w * 0.16 : 0), y + h * 0.16 + i * h * 0.15, bw, h * 0.075);
          }
        } else if (kind === 1) {                            // analysis grid
          var cols = 3 + Math.floor(r() * 3), rows = 3 + Math.floor(r() * 3);
          for (var a = 0; a < cols; a++) for (var b = 0; b < rows; b++) {
            c.fillStyle = 'rgba(199,212,228,' + (0.03 + r() * 0.16).toFixed(3) + ')';
            c.fillRect(x + a * (w / cols) + 2, y + b * (h / rows) + 2, w / cols - 4, h / rows - 4);
          }
        } else if (kind === 2) {                            // horizon / field
          var hz = y + h * (0.4 + r() * 0.3);
          c.fillStyle = 'rgba(232,233,236,0.07)';
          c.fillRect(x, hz, w, y + h - hz);
          c.beginPath();
          c.arc(x + w * (0.25 + r() * 0.5), hz - h * 0.16, h * 0.1, 0, 6.2832);
          c.fillStyle = 'rgba(244,243,240,0.16)'; c.fill();
        } else if (kind === 3) {                            // node graph
          c.strokeStyle = 'rgba(199,212,228,0.16)'; c.lineWidth = 1;
          var pts = [];
          for (var n = 0; n < 6; n++) pts.push([x + w * (0.15 + r() * 0.7), y + h * (0.15 + r() * 0.7)]);
          c.beginPath();
          for (var m = 1; m < pts.length; m++) { c.moveTo(pts[m - 1][0], pts[m - 1][1]); c.lineTo(pts[m][0], pts[m][1]); }
          c.stroke();
          c.fillStyle = 'rgba(232,233,236,0.3)';
          pts.forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 2, 0, 6.2832); c.fill(); });
        } else {                                            // portrait silhouette
          c.fillStyle = 'rgba(232,233,236,0.10)';
          c.beginPath();
          c.arc(x + w / 2, y + h * 0.42, h * 0.13, 0, 6.2832); c.fill();
          c.beginPath();
          c.ellipse(x + w / 2, y + h * 0.92, w * 0.26, h * 0.28, 0, Math.PI, 0);
          c.fill();
        }
        c.restore();

        c.strokeStyle = 'rgba(244,243,240,0.09)';
        c.lineWidth = 1;
        c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }

      function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        var r = sheet.getBoundingClientRect();
        W = Math.max(r.width, 320); H = Math.max(r.height, 400);
        sheet.width = W * dpr; sheet.height = H * dpr;
        buf.width = W * dpr; buf.height = H * dpr;
        mask.width = MR * 2 * dpr; mask.height = MR * 2 * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var target = W < 700 ? 118 : 168;
        var cols = Math.max(3, Math.round(W / target));
        var fw = W / cols;
        var fh = fw * 1.16;
        var rows = Math.ceil((H + fh * 2) / fh);
        var gap = 4;

        bctx.clearRect(0, 0, W, H);
        frames = [];
        for (var j = 0; j < rows; j++) {
          for (var i = 0; i < cols; i++) {
            var x = i * fw, y = j * fh - fh * 0.5;
            drawExposure(bctx, x + gap, y + gap, fw - gap * 2, fh - gap * 2, i * 977 + j * 131 + 7);
            frames.push({ x: x + gap, y: y + gap, w: fw - gap * 2, h: fh - gap * 2 });
          }
          /* edge code stamped between rows */
          bctx.save();
          bctx.fillStyle = 'rgba(41,171,226,0.34)';
          bctx.font = '600 8px Archivo, sans-serif';
          bctx.fillText('PPL · 12A · ' + String(j + 1).padStart(2, '0') + 'A', 6, j * fh - fh * 0.5 + 10);
          bctx.restore();
        }

      }

      function render(now) {
        if (!started) started = now;
        ctx.clearRect(0, 0, W, H);

        ctx.save();
        ctx.translate(0, -scrollOff);

        /* base sheet — undeveloped */
        ctx.globalAlpha = 0.30;
        ctx.drawImage(buf, 0, 0, W, H);
        ctx.globalAlpha = 1;

        /* the loupe raises local exposure */
        if (hasPointer && !reduced) {
          var mx = px, my = py + scrollOff;
          mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          mctx.clearRect(0, 0, MR * 2, MR * 2);
          mctx.globalCompositeOperation = 'source-over';
          mctx.drawImage(buf,
            (mx - MR) * dpr, (my - MR) * dpr, MR * 2 * dpr, MR * 2 * dpr,
            0, 0, MR * 2, MR * 2);
          mctx.globalCompositeOperation = 'destination-in';
          var g = mctx.createRadialGradient(MR, MR, 0, MR, MR, MR);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(0.55, 'rgba(0,0,0,0.72)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          mctx.fillStyle = g;
          mctx.fillRect(0, 0, MR * 2, MR * 2);
          mctx.globalCompositeOperation = 'source-over';

          ctx.globalAlpha = 0.85;
          ctx.drawImage(mask, mx - MR, my - MR, MR * 2, MR * 2);
          ctx.globalAlpha = 1;
        }

        ctx.restore();
        raf = requestAnimationFrame(render);
      }

      var raf = 0;
      build();
      raf = requestAnimationFrame(render);

      window.addEventListener('pointermove', function (e) {
        var r = sheet.getBoundingClientRect();
        px = e.clientX - r.left; py = e.clientY - r.top;
        hasPointer = px > -MR && px < W + MR && py > -MR && py < H + MR;
      }, { passive: true });
      window.addEventListener('pointerleave', function () { hasPointer = false; });

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { build(); }, 180);
      }, { passive: true });

      /* pause when the hero is offscreen */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(render); }
          else { cancelAnimationFrame(raf); raf = 0; }
        }, { threshold: 0 }).observe(sheet);
      }

      window.__sheetScroll = function (v) { scrollOff = v * 0.14; };
    })();
  }

  /* -------------------------------------------------- PLATE FRAME NUMBERS */
  /* A real sheet indexes every exposure, and the selected ones are never
     consecutive — you shot around the frame that worked. */
  $$('.print .print__plate').forEach(function (plate, i) {
    var s = document.createElement('span');
    s.className = 'print__frame';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '12A · ' + String(4 + i * 3).padStart(2, '0');
    plate.appendChild(s);
  });

  /* ------------------------------------------------------ SCROLL SYSTEMS */
  var nav = $('#nav');
  var navProgress = $('#navProgress');
  var toTop = $('#toTop');
  var bgWash = reduced ? null : $('#bgWash');
  var lastY = 0, sTick = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var doc = document.documentElement.scrollHeight - window.innerHeight;
    var p = doc > 0 ? clamp(y / doc, 0, 1) : 0;

    if (navProgress) navProgress.style.width = (p * 100).toFixed(2) + '%';
    if (nav) {
      if (y > 240 && y > lastY + 4) {
        nav.classList.add('up');
        /* the panel is taller than the bar, so a hidden nav would leave an open
           dropdown stranded over the page content */
        closeAllMenus();
      } else if (y < lastY - 4 || y < 240) {
        nav.classList.remove('up');
      }
    }
    /* nothing to return to until the hero is behind you. toggle() with a force
       argument is a no-op when the state already matches, so this is free on
       every other frame of a scroll. */
    if (toTop) toTop.classList.toggle('on', y > window.innerHeight * 0.9);

    /* The wash drifts against the page across the whole scroll — ±22% of a
       viewport, inside the layer's 30% bleed so no edge can show. Driven off
       progress rather than raw offset, so the travel is the same on a short
       viewport as a tall one. Transform only: this stays on the compositor. */
    if (bgWash) {
      bgWash.style.transform =
        'translate3d(0,' + ((0.5 - p) * 0.44 * window.innerHeight).toFixed(1) + 'px,0)';
      /* and it turns colour as you descend — but only through the cool half of
         the wheel. From the brand cyan at ~200deg this runs green-teal at the
         top to indigo at the foot; a full rotation would put oranges and
         magentas on a page whose whole argument is one reserved accent.
         Measured across the entire sweep: the dimmest text holds 4.74-4.79:1,
         so the turn costs no legibility. */
      bgWash.style.filter = 'hue-rotate(' + (-45 + p * 120).toFixed(1) + 'deg)';
    }

    if (window.__sheetScroll) window.__sheetScroll(y);

    lastY = y;
    sTick = false;
  }
  window.addEventListener('scroll', function () {
    if (!sTick) { sTick = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* -------------------------------------------------------- RETURN TO TOP */
  /* The plate is a real anchor so it works without this script, but the native
     smooth scroll to #top is cancelled the moment the document height changes,
     and lazy imagery here does exactly that — a click from the footer stalled
     less than halfway up. Driving the tween ourselves always lands. */
  if (toTop) {
    toTop.addEventListener('click', function (ev) {
      var from = window.pageYOffset || document.documentElement.scrollTop;
      ev.preventDefault();

      /* focus has to travel with the viewport, or a keyboard user reads the top
         of the page while Tab still resumes from the footer. :focus-visible
         keeps the ring off for pointer users. */
      var land = function () {
        var first = $('.nav .logo');
        if (first) first.focus({ preventScroll: true });
      };

      if (reduced || from < 2) { window.scrollTo(0, 0); land(); return; }

      var t0 = performance.now();
      var dur = Math.min(1100, 420 + from * 0.1);
      var done = false;
      var abort = function () { done = true; release(); };
      var release = function () {
        ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
          window.removeEventListener(t, abort);
        });
      };
      /* the reader always outranks the animation */
      ['wheel', 'touchstart', 'keydown'].forEach(function (t) {
        window.addEventListener(t, abort, { passive: true });
      });

      requestAnimationFrame(function step(now) {
        if (done) return;
        var k = clamp((now - t0) / dur, 0, 1);
        /* cubic ease-out on the distance still to travel */
        window.scrollTo(0, Math.round(from * Math.pow(1 - k, 3)));
        if (k < 1) { requestAnimationFrame(step); }
        else { done = true; release(); land(); }
      });
    });
  }

  /* ---------------------------------------------------- EXPOSURE COUNTER */
  var counter = $('#counter');
  if (counter) {
    var run = function () {
      $$('.counter__n', counter).forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        /* the approved copy groups only at five figures: 1200+ but 10,000+ */
        var fmt = function (v) { return target >= 10000 ? v.toLocaleString('en-US') : String(v); };
        if (reduced) { el.textContent = fmt(target) + suffix; return; }
        var t0 = performance.now(), dur = 1900;
        (function step(now) {
          var k = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(2, -10 * k);
          el.textContent = fmt(Math.round(target * (k === 1 ? 1 : e))) + suffix;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { run(); cio.disconnect(); }
      }, { threshold: 0.4 });
      cio.observe(counter);
    } else { run(); }
  }

  /* ------------------------------------------------------------ NAV MENU */
  /* The services panel is full-width and hangs below the bar, so reaching it —
     especially its promo card at the far right — means travelling through the
     header itself. Scoping the close to each nav item shut the menu in transit.
     The header is the boundary instead: anywhere inside it counts as still in
     the menu, and only leaving it, or arriving at something in the bar that
     owns no panel, dismisses. */
  var menuShutTimer = 0;
  function cancelMenuShut() { clearTimeout(menuShutTimer); }
  function scheduleMenuShut() {
    clearTimeout(menuShutTimer);
    menuShutTimer = setTimeout(closeAllMenus, 220);
  }

  $$('.nav__item.has-menu').forEach(function (item) {
    var btn = $('.nav__link', item);
    var panel = $('.dropdown', item);
    if (!btn || !panel) return;
    var close = function () {
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    };
    var open = function () {
      $$('.nav__item.has-menu.open').forEach(function (o) {
        if (o !== item) { o.classList.remove('open'); $('.nav__link', o).setAttribute('aria-expanded', 'false'); $('.dropdown', o).hidden = true; }
      });
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
    };
    /* On a hover-capable pointer the panel is already open from mouseenter, so a
       plain toggle here would close it on the very gesture that revealed it.
       Hover owns open/close there; click only has to serve touch and keyboard. */
    var hoverCapable = window.matchMedia('(hover: hover)').matches;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (hoverCapable && item.classList.contains('open')) return;
      item.classList.contains('open') ? close() : open();
    });
    if (hoverCapable) {
      item.addEventListener('mouseenter', function () { cancelMenuShut(); open(); });
    }
    item.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) close();
    });
  });
  function closeAllMenus() {
    clearTimeout(menuShutTimer);
    $$('.nav__item.has-menu.open').forEach(function (o) {
      o.classList.remove('open');
      $('.nav__link', o).setAttribute('aria-expanded', 'false');
      $('.dropdown', o).hidden = true;
    });
  }

  if (nav && window.matchMedia('(hover: hover)').matches) {
    /* the panel is a DOM descendant of the header even though it paints below
       it, so this does not fire while the pointer is inside the panel */
    nav.addEventListener('mouseenter', cancelMenuShut);
    nav.addEventListener('mouseleave', scheduleMenuShut);
    /* anything in the bar that has no panel of its own dismisses on arrival */
    $$('.nav__item:not(.has-menu), .nav__cta, .logo').forEach(function (el) {
      el.addEventListener('mouseenter', closeAllMenus);
    });
  }
  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllMenus();
  });

  var burger = $('#burger'), mobileMenu = $('#mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      mobileMenu.hidden = open;
    });
    /* Second level. One panel open at a time: the services panel is seventeen
       rows on its own, and three open at once turns the menu into a list you
       scroll past rather than one you read. Collapsing on close means the menu
       always reopens on the same six rows it started with. */
    var mmToggles = $$('.mm__toggle', mobileMenu);

    function shutPanels() {
      mmToggles.forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = true;
      });
    }

    mmToggles.forEach(function (t) {
      t.addEventListener('click', function () {
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        var wasOpen = t.getAttribute('aria-expanded') === 'true';
        shutPanels();
        if (!wasOpen) {
          t.setAttribute('aria-expanded', 'true');
          if (panel) panel.hidden = false;
        }
      });
    });

    /* Buttons are not in this list, so opening a panel never closes the menu. */
    $$('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
        mobileMenu.hidden = true;
        shutPanels();
      });
    });
  }

  /* ---------------------------------------------------- SERVICES SCROLL */
  /* The sticky plate follows the reading position: whichever service is
     crossing the middle of the viewport owns the exposure. A narrow band as
     the observer root means exactly one item can be active at a time.

     svcPinActive (set by SERVICES PIN, below) mutes this observer while
     index.html's copy of the section is pinned — once the section itself has
     stopped moving there is no "crossing the viewport" left to observe, and
     the pin drives setSvc off its own scroll progress instead. careers.html
     shares this exact block and never sets the flag, so its behaviour here is
     completely unchanged. */
  var svcPinActive = false;
  var svcItems = $$('.svc__item');
  var svcShots = $$('.svc__shot');
  var svcStamp = $('#svcStamp');
  var svcCol = $('.svc__col');       /* the clipped window, once pinned */
  var svcTrack = $('[data-svc-track]');  /* what actually moves inside it */
  if (svcItems.length && svcShots.length) {
    var svcNames = svcItems.map(function (el) {
      var h = $('h3', el); return h ? h.textContent.trim() : '';
    });

    function setSvc(i) {
      svcItems.forEach(function (el, n) { el.classList.toggle('is-active', n === i); });
      svcShots.forEach(function (el, n) { el.classList.toggle('is-on', n === i); });
      if (svcStamp) svcStamp.innerHTML = String(i + 1).padStart(2, '0') + ' &middot; ' + svcNames[i];
      /* svcCol.clientHeight is one item's height (see the pinned .svc__item
         rule in CSS, which the window is sized to match) — read live rather
         than duplicating that number here so the two can't drift apart. */
      if (svcPinActive && svcTrack) {
        svcTrack.style.transform = 'translateY(' + (-i * svcCol.clientHeight) + 'px)';
      }
    }

    if ('IntersectionObserver' in window) {
      var svcIO = new IntersectionObserver(function (entries) {
        if (svcPinActive) return;
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var i = parseInt(e.target.getAttribute('data-svc'), 10);
            if (!isNaN(i)) setSvc(i);
          }
        });
      }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
      svcItems.forEach(function (el) { svcIO.observe(el); });
    } else {
      svcItems.forEach(function (el) { el.classList.add('is-active'); });
    }
    /* Careers' "Working here" list (client request, 2026-08-14): a left item
       should light up only once it is actually centred in the band, not the
       instant the page loads — item one was arriving pre-lit before the reader
       had scrolled anywhere near the section. Skipping the initial setSvc(0)
       leaves every item at its resting .42 opacity until the observer above
       fires for real, which happens the moment the section's first item
       crosses the centre band.
       Gated on html.careers rather than deleting the call outright: the home
       page's "What we do" shares this exact module and was built to highlight
       Research immediately, which nobody has asked to change. */
    if (!document.documentElement.classList.contains('careers')) {
      setSvc(0);
    }

    /* ------------------------------------------------------- SERVICES PIN */
    /* index.html only — .svc-pin doesn't exist on careers.html's markup, so
       this whole block no-ops there. Same shape as the CLIENTS REEL pin
       further down: measure, decide whether it's safe to pin (wide viewport,
       motion allowed), and if so hold the section centred in the viewport for
       a fixed scroll distance. Unlike the logo reel there's no natural
       "content width" to size that distance from — nothing here overflows —
       so it's a flat multiple of the viewport height instead, chosen to give
       each of the four items a comfortable, unhurried dwell. */
    var svcPin = $('[data-svc-pin]');
    if (svcPin) {
      var svcSticky = $('.svc-pin__sticky', svcPin);
      var svcMax = 0, svcTop = 0;

      var layoutSvcPin = function () {
        var fits = !reduced && window.innerWidth >= 860;
        svcPin.classList.toggle('is-pinned', fits);
        svcPinActive = fits;
        if (!fits) {
          svcSticky.style.top = '';
          svcPin.style.height = '';
          if (svcTrack) svcTrack.style.transform = '';
          svcMax = 0;
          return;
        }
        svcTop = Math.max(0, (window.innerHeight - svcSticky.offsetHeight) / 2);
        svcSticky.style.top = svcTop + 'px';
        svcMax = window.innerHeight * 1.6;
        svcPin.style.height = (svcMax + svcSticky.offsetHeight) + 'px';
      };

      var updateSvcPin = function () {
        if (!svcMax) return;
        var progress = clamp((svcTop - svcPin.getBoundingClientRect().top) / svcMax, 0, 1);
        var idx = Math.min(svcItems.length - 1, Math.floor(progress * svcItems.length));
        setSvc(idx);
      };

      layoutSvcPin();
      updateSvcPin();
      window.addEventListener('scroll', updateSvcPin, { passive: true });

      var svcRT;
      window.addEventListener('resize', function () {
        clearTimeout(svcRT);
        svcRT = setTimeout(function () { layoutSvcPin(); updateSvcPin(); }, 160);
      }, { passive: true });
    }
  }

  /* The careers section-title scroll-size effect (SECTION TITLES) that lived
     here — big and uppercase until centred, then settling to 1.6rem — was
     removed 2026-08-14 along with the CSS driving it, in favour of matching
     blog.html's plain, unscaled section titles. Nothing else on the page
     depended on the reading-line math it used, so removal was clean. */

  /* ---------------------------------------------------- CAREERS HERO PEEK */
  /* A plain wrap-around carousel, not the testimonial reel's clone-based one —
     that machinery exists to keep a centred card's neighbours visible on both
     sides, which does not apply to a full-bleed banner with no visible
     neighbours. Advancing past the last slide can just jump back to the first.
     Same restraint as the reel: autoplay yields to the reader (pauses on
     hover, on keyboard focus inside it, off screen) and never starts at all
     under reduced motion — the dots stay fully working either way, since they
     are the real control, not a decoration on top of one. */
  var peek = $('[data-carousel]');
  if (peek) {
    var pTrack = $('.peek__track', peek);
    var pSlides = $$('.peek__slide', peek);
    var pDots = $$('.peek__dot', peek);
    if (pTrack && pSlides.length > 1) {
      var pIdx = 0;
      var pTimer = null, pHover = false, pFocus = false, pOnScreen = false;
      var P_DWELL = 5000;

      function pGo(i) {
        pIdx = (i + pSlides.length) % pSlides.length;
        pTrack.style.transform = 'translate3d(' + (-pIdx * 100) + '%,0,0)';
        pDots.forEach(function (d, n) {
          var on = n === pIdx;
          d.classList.toggle('is-on', on);
          d.setAttribute('aria-selected', String(on));
        });
      }
      function pShouldRun() { return !reduced && !pHover && !pFocus && pOnScreen; }
      function pStart() {
        if (pTimer || !pShouldRun()) return;
        pTimer = setInterval(function () { pGo(pIdx + 1); }, P_DWELL);
      }
      function pStop() {
        clearInterval(pTimer);
        pTimer = null;
      }
      function pSync() { if (pShouldRun()) pStart(); else pStop(); }

      pDots.forEach(function (d, n) {
        d.addEventListener('click', function () {
          pGo(n);
          /* a manual pick still yields to a hover/focus already in progress;
             pSync only restarts the clock if nothing is currently holding it */
          pStop();
          pSync();
        });
      });
      peek.addEventListener('mouseenter', function () { pHover = true; pSync(); });
      peek.addEventListener('mouseleave', function () { pHover = false; pSync(); });
      peek.addEventListener('focusin', function () { pFocus = true; pSync(); });
      peek.addEventListener('focusout', function () { pFocus = false; pSync(); });

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          pOnScreen = entries[0].isIntersecting;
          pSync();
        }, { threshold: 0.2 }).observe(peek);
      } else {
        pOnScreen = true;
      }

      pGo(0);
      pSync();
    }
  }

  /* -------------------------------------------------------- SCHEDULING */
  /* Cal.com inline embed. Loaded only when a real link is set and only as the
     section is approached — it pulls third-party script + iframe, so it should
     cost nothing on first paint. Themed from the site's own tokens.

     Written per-element rather than once for the page: index.html now carries
     two calendars, the one in the closing section and the one in the contact
     sheet, and they cannot share a Cal namespace or a mount id. A booker marked
     data-cal-defer skips the observer and parks its loader in deferredBookers
     for whoever owns it — a sheet is never on screen, so it would otherwise
     wait for an intersection that never comes. */
  var deferredBookers = [];   /* [{el, load}] — one-shot, drained by wakeBookers */
  var calSeq = 0;

  function wakeBookers(root) {
    deferredBookers = deferredBookers.filter(function (rec) {
      if (!root.contains(rec.el)) return true;
      rec.load();
      return false;
    });
  }

  function initBooker(booker) {
    var calLink = booker.getAttribute('data-cal-link') || '';
    var ns = booker.getAttribute('data-cal-namespace') || 'default';
    var mount = $('.booker__panel', booker);
    var ready = mount && calLink && !/REPLACE-ME/.test(calLink);
    var hostId = 'calMount-' + (++calSeq);

    if (!ready && mount) {
      /* only reachable with no link configured — this copy is for whoever is
         building the site, so it must never sit in the visitor-facing state */
      mount.classList.remove('is-loading');
      mount.innerHTML = '<div class="booker__await">'
        + '<span class="booker__code">Scheduling link to supply</span>'
        + '<p>Put a Cal.com link in <code>data-cal-link</code> on this element '
        + 'and the live calendar takes over this panel.</p></div>';
    }

    if (ready) {
      var load = function () {
        mount.innerHTML = '';
        mount.classList.add('is-live', 'is-loading');

        /* Cal gives no ready callback through the embed stub, so watch for the
           iframe it injects and release the reserved height once it lands. */
        var settle = new MutationObserver(function () {
          if (mount.querySelector('iframe')) {
            mount.classList.remove('is-loading');
            settle.disconnect();
          }
        });
        settle.observe(mount, { childList: true, subtree: true });
        setTimeout(function () { settle.disconnect(); mount.classList.remove('is-loading'); }, 12000);
        var host = document.createElement('div');
        host.id = hostId;
        host.style.width = '100%';
        host.style.height = 'auto';
        host.style.overflow = 'auto';
        mount.appendChild(host);

        /* Cal's documented loader stub */
        (function (C, A, L) {
          var p = function (a, ar) { a.q.push(ar); };
          var d = C.document;
          C.Cal = C.Cal || function () {
            var cal = C.Cal; var ar = arguments;
            if (!cal.loaded) {
              cal.ns = {}; cal.q = cal.q || [];
              d.head.appendChild(d.createElement('script')).src = A;
              cal.loaded = true;
            }
            if (ar[0] === L) {
              var api = function () { p(api, arguments); };
              var namespace = ar[1];
              api.q = api.q || [];
              if (typeof namespace === 'string') {
                cal.ns[namespace] = cal.ns[namespace] || api;
                p(cal.ns[namespace], ar);
                p(cal, ['initNamespace', namespace]);
              } else { p(cal, ar); }
              return;
            }
            p(cal, ar);
          };
        })(window, 'https://app.cal.com/embed/embed.js', 'init');

        window.Cal('init', ns, { origin: 'https://app.cal.com' });
        window.Cal.config = window.Cal.config || {};
        window.Cal.config.forwardQueryParams = true;

        window.Cal.ns[ns]('inline', {
          elementOrSelector: '#' + hostId,
          config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'auto' },
          calLink: calLink
        });

        /* client-supplied embed config, 2026-08-11 */
        window.Cal.ns[ns]('ui', {
          cssVarsPerTheme: { light: { 'cal-brand': '#1CB4C6' } },
          hideEventTypeDetails: true,
          layout: 'month_view'
        });
      };

      if (booker.hasAttribute('data-cal-defer')) {
        deferredBookers.push({ el: booker, load: load });
      } else if ('IntersectionObserver' in window) {
        var bio = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { load(); bio.disconnect(); }
        }, { rootMargin: '400px 0px' });
        bio.observe(booker);
      } else { load(); }
    }
  }

  $$('.booker').forEach(initBooker);

  /* --------------------------------------------------- TESTIMONIAL REEL */
  /* The strip advances one frame-set at a time and wraps, so it can run on its
     own. Only the current set is developed — the same selection idea the work
     grid uses. Autoplay yields to the reader: it pauses on hover, on keyboard
     focus, when the section is off screen, and never starts under reduced
     motion, where the arrows still work. */
  var reel = $('#reelTrack');
  if (reel) {
    var groups = $$('.reel__group', reel);
    var real = groups.length;                 /* how many are actual testimonials */
    var idx = 0;
    var btns = $$('.reel__btn');
    var DWELL = 6000;
    var SLIDE = 850;                          /* must match .reel__track's transition */
    var timer = null, hovering = false, focused = false, onScreen = false;

    /* A modulo wrap slid the whole strip backwards to return to the first
       testimonial, which reads as a rewind rather than a loop. The set is
       cloned on BOTH sides instead — [copy][real][copy] — so the track can keep
       travelling one way and reset across a seam with the transition off, and
       so the focused card always has a neighbour to its left as well as its
       right. Without the leading copy, centring the first slide would leave
       dead space down the left edge. */
    var offset = 0;                           /* where the real set starts */
    if (real > 1 && !reduced) {
      var lead = document.createDocumentFragment();
      groups.forEach(function (g) { lead.appendChild(cloneSlide(g)); });
      reel.insertBefore(lead, groups[0]);
      groups.forEach(function (g) { reel.appendChild(cloneSlide(g)); });
      groups = $$('.reel__group', reel);
      offset = real;
      idx = offset;
    }
    function cloneSlide(g) {
      var c = g.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', 'true');
      c.removeAttribute('aria-label');
      return c;
    }

    function layout(animate) {
      if (!groups.length) return;
      reel.style.transition = animate === false ? 'none' : '';
      var g = groups[idx];
      /* Centre the focused card in the frame rather than flushing it left. The
         track's own inline padding is NOT subtracted here — the left-aligned
         version needed it, but the centring term already absorbs it, and
         taking it off twice pushed the card off-centre by 2x the gutter. */
      var frame = reel.parentElement.clientWidth;
      var slack = Math.max(0, (frame - g.offsetWidth) / 2);
      var x = g.offsetLeft - reel.offsetLeft - slack;
      reel.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
      groups.forEach(function (el, i) {
        var cur = i === idx;
        el.classList.toggle('is-current', cur);
        /* off-slides are decorative until they come round; clones never announce */
        if (!el.hasAttribute('data-clone')) el.setAttribute('aria-hidden', cur ? 'false' : 'true');
      });
    }

    var snapping = false;
    function reseat(to) {
      snapping = true;
      setTimeout(function () {
        idx = to;
        layout(false);
        void reel.offsetWidth;                /* commit before restoring transition */
        reel.style.transition = '';
        snapping = false;
      }, SLIDE + 30);
    }
    function go(d) {
      if (snapping) return;
      var loops = groups.length > real;
      idx += (d > 0 ? 1 : -1);
      if (!loops) { idx = (idx + real) % real; layout(true); return; }
      layout(true);
      /* landed on a clone that mirrors a real slide — swap to the real one unseen */
      if (idx >= offset + real) reseat(offset);
      else if (idx < offset) reseat(offset + real - 1);
    }

    function canPlay() { return !reduced && onScreen && !hovering && !focused && groups.length > 1; }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      stop();
      if (canPlay()) timer = setInterval(function () { go(1); }, DWELL);
    }
    function bump() { play(); }   /* restart the dwell after a manual move */

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        go(parseInt(b.getAttribute('data-dir'), 10));
        bump();
      });
    });

    reel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); bump(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(-1); bump(); e.preventDefault(); }
    });

    var wrap = reel.parentElement;
    ['pointerenter', 'pointerleave'].forEach(function (evt) {
      wrap.addEventListener(evt, function () {
        hovering = (evt === 'pointerenter');
        play();
      });
    });
    wrap.addEventListener('focusin', function () { focused = true; play(); });
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) { focused = false; play(); }
    });

    /* swipe */
    var sx = 0, sy = 0, tracking = false;
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      sx = e.clientX; sy = e.clientY; tracking = true;
    }, { passive: true });
    reel.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); bump(); }
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        onScreen = en[0].isIntersecting;
        play();
      }, { threshold: 0.25 }).observe(wrap);
    } else { onScreen = true; play(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else play();
    });

    var rrt;
    window.addEventListener('resize', function () {
      clearTimeout(rrt);
      rrt = setTimeout(layout, 140);
    }, { passive: true });

    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  }

  /* --------------------------------------------------------- CASE FILTERS */
  /* Portfolio page only. Selecting a tag is the page's version of circling a
     frame: the chosen set stays, the rest leave. Tabs carry two states only,
     active and inactive, at the client's request — an earlier build marked tags
     that matched nothing as a third, dimmed state. Choosing an empty tag still
     lands on a stated empty state rather than a blank page. */
  /* Two lists run on this now — the portfolio's case studies and the careers
     page's job openings. The row names the list it governs and the item class it
     filters, so adding a third needs markup and nothing here. */
  $$('[data-filters]').forEach(function (filterRow) {
    var list = document.getElementById(filterRow.getAttribute('data-filters'));
    if (!list) return;
    var itemSel = filterRow.getAttribute('data-filter-item') || '.case';
    var filts = $$('.filt', filterRow);
    var items = $$(itemSel, list);
    var emptyMsg = filterRow.getAttribute('data-filter-empty')
      ? document.getElementById(filterRow.getAttribute('data-filter-empty')) : null;

    /* Paging is optional and owned here rather than by a second module, because
       both decide what is visible and two owners of `hidden` would fight. A row
       without data-page-size behaves exactly as before — one page, everything
       matching is shown — which is what the portfolio wants. */
    var pageSize = parseInt(filterRow.getAttribute('data-page-size'), 10) || 0;
    /* the count reads '9 roles' on careers and '9 pieces' on the blog — one
       module, so the noun comes from the markup rather than the module */
    var noun = filterRow.getAttribute('data-pager-noun') || 'roles';
    var pager = filterRow.getAttribute('data-pager')
      ? document.getElementById(filterRow.getAttribute('data-pager')) : null;
    var cat = 'all', page = 1, q = '';
    var search = filterRow.getAttribute('data-filter-search')
      ? document.getElementById(filterRow.getAttribute('data-filter-search')) : null;

    var ARROW = function (dir) {
      return '<svg viewBox="0 0 16 10" aria-hidden="true"><path d="' +
        (dir < 0 ? 'M15 5H1M6 1 1 5l5 4' : 'M1 5h14M10 1l5 4-5 4') +
        '" fill="none" stroke="currentColor" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    };

    function matching() {
      return items.filter(function (c) {
        var cats = (c.getAttribute('data-cats') || '').split(/\s+/);
        if (!(cat === 'all' || cats.indexOf(cat) > -1)) return false;
        /* the chips narrow by function, the field narrows by words — they
           compound rather than override, so "design" + "writer" finds nothing
           rather than quietly dropping one of the two */
        if (!q) return true;
        return (c.textContent || '').toLowerCase().indexOf(q) > -1;
      });
    }

    /* 1 … 4 5 6 … 12 — the ends, the neighbours, and an ellipsis for the rest,
       so the control stays one line however long the list grows */
    function pageList(total) {
      if (total <= 7) {
        var all = []; for (var i = 1; i <= total; i++) all.push(i); return all;
      }
      var out = [1], lo = Math.max(2, page - 1), hi = Math.min(total - 1, page + 1);
      if (lo > 2) out.push('…');
      for (var k = lo; k <= hi; k++) out.push(k);
      if (hi < total - 1) out.push('…');
      out.push(total);
      return out;
    }

    function drawPager(total, count) {
      if (!pager) return;
      pager.innerHTML = '';
      if (total <= 1) { pager.hidden = true; return; }
      pager.hidden = false;

      var mk = function (label, opts) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pager__b';
        b.innerHTML = label;
        if (opts.aria) b.setAttribute('aria-label', opts.aria);
        if (opts.current) b.setAttribute('aria-current', 'page');
        if (opts.disabled) b.disabled = true;
        if (opts.go) b.addEventListener('click', function () { go(opts.go); });
        return b;
      };

      pager.appendChild(mk(ARROW(-1), {
        aria: 'Previous page', disabled: page === 1, go: page - 1 }));
      pageList(total).forEach(function (n) {
        if (n === '…') {
          var s = document.createElement('span');
          s.className = 'pager__gap'; s.textContent = '…';
          s.setAttribute('aria-hidden', 'true');
          pager.appendChild(s);
          return;
        }
        pager.appendChild(mk(String(n), {
          aria: 'Page ' + n, current: n === page, go: n }));
      });
      pager.appendChild(mk(ARROW(1), {
        aria: 'Next page', disabled: page === total, go: page + 1 }));

      var c = document.createElement('span');
      c.className = 'pager__count';
      c.textContent = 'Page ' + page + ' of ' + total + ' · ' + count + ' ' + noun;
      pager.appendChild(c);
    }

    function render() {
      var m = matching();
      var total = pageSize ? Math.max(1, Math.ceil(m.length / pageSize)) : 1;
      if (page > total) page = total;
      if (page < 1) page = 1;

      items.forEach(function (c) { c.hidden = true; });
      var from = pageSize ? (page - 1) * pageSize : 0;
      var to = pageSize ? from + pageSize : m.length;
      m.slice(from, to).forEach(function (c) { c.hidden = false; });

      filts.forEach(function (f) {
        var sel = f.getAttribute('data-cat') === cat;
        f.classList.toggle('is-on', sel);
        f.setAttribute('aria-pressed', sel ? 'true' : 'false');
      });
      if (emptyMsg) {
        emptyMsg.hidden = m.length > 0;
        var named = emptyMsg.querySelector('[data-empty-term]');
        if (named) named.textContent = q ? '\u201c' + search.value.trim() + '\u201d' : 'this function';
      }
      drawPager(total, m.length);
    }

    function go(n) {
      page = n;
      render();
      /* keep the top of the list in view — paging from the foot of a long page
         would otherwise leave the reader looking at the pager and nothing else */
      if (list.getBoundingClientRect().top < 0) {
        list.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
      }
    }

    var apply = function (c) { cat = c; page = 1; render(); };

    filts.forEach(function (f) {
      f.addEventListener('click', function () { apply(f.getAttribute('data-cat')); });
    });
    var reset = $('.cases__reset');
    if (reset) reset.addEventListener('click', function () { apply('all'); });

    if (search) {
      var st;
      search.addEventListener('input', function () {
        /* typing should not re-render on every keystroke of a long word */
        clearTimeout(st);
        st = setTimeout(function () {
          q = search.value.trim().toLowerCase();
          page = 1;
          render();
        }, 140);
      });
      /* the native clear button fires 'search', not 'input', in Safari */
      search.addEventListener('search', function () {
        q = search.value.trim().toLowerCase(); page = 1; render();
      });
    }

    render();
  });

  /* ------------------------------------------------------ CASE SECTION NAV */
  /* Case study page only. Marks the section you are reading in the sticky tab
     row — the same selection idea the rest of the site runs on, applied to
     position rather than pointer. Anchors work without this; the highlight is
     all the script adds.

     Deliberately NOT an IntersectionObserver band. The first attempt shrank the
     root to a 4% strip sitting above centre, so a short section scrolled to the
     middle of the viewport fell straight through the gap and nothing lit up.
     Picking the last section whose top has crossed a reading line always
     resolves to exactly one, at any section length. */
  var csNav = $('#csNav');
  if (csNav) {
    var csTabs = $$('.csnav__tab', csNav);
    var csSecs = [], csFor = [];
    csTabs.forEach(function (t) {
      var sec = document.getElementById((t.getAttribute('href') || '').replace('#', ''));
      if (sec) { csSecs.push(sec); csFor.push(t); }
    });

    if (csSecs.length) {
      var csTick = false;
      var csPick = -1;

      /* Clicking a tab whose target sits beside other targets is a selection,
         not a jump — the chosen frame gets circled, the site's one gesture. The
         anchor still does the scrolling, so this only adds the mark.

         The test is a shared top edge, measured, not a shared parent. The case
         study page's nine sections are all children of one <article>, so a
         parent test would fire there too and stamp a meaningless class on every
         section. Stacked sections never share a top; grid neighbours always do. */
      csFor.forEach(function (t, i) {
        t.addEventListener('click', function () {
          csPick = i;
          var card = csSecs[i], top = card.getBoundingClientRect().top;
          var row = csSecs.filter(function (s) {
            return Math.abs(s.getBoundingClientRect().top - top) < 2;
          });
          if (row.length > 1) {
            row.forEach(function (s) { s.classList.toggle('is-pick', s === card); });
          }
          requestAnimationFrame(csSpy);
        });
      });

      var csSpy = function () {
        /* The line sits just under the sticky tab row, not a third of the way
           down. At 0.34 a short section anchor-jumped to the top had already
           been overtaken by the next one's top edge, so clicking "Brief"
           highlighted "Challenge". Paired with scroll-margin-top on the
           sections so the jump itself clears the sticky row. */
        var line = window.innerHeight * 0.18;
        var at = 0, tops = [];
        for (var i = 0; i < csSecs.length; i++) {
          /* getBoundingClientRect, not offsetTop. The training page points tabs
             at cards nested several levels down, and offsetTop is measured from
             the nearest positioned ancestor — one position:relative anywhere in
             between would silently compare a local offset against page scroll. */
          tops[i] = csSecs[i].getBoundingClientRect().top;
          if (tops[i] <= line) at = i;
        }
        /* Side-by-side targets. The training page's Level 1/2/3 tabs point at
           three cards in one grid row, so on a wide screen all three share a
           top edge and the line above can only ever resolve to the last of
           them — two of the four tabs would never light, and clicking them
           would appear to do nothing. Where a run of targets starts at the same
           height, the row is read as one and the explicit pick owns it. */
        var lo = at, hi = at;
        while (lo > 0 && Math.abs(tops[lo - 1] - tops[at]) < 2) lo--;
        while (hi < csSecs.length - 1 && Math.abs(tops[hi + 1] - tops[at]) < 2) hi++;
        if (hi > lo) at = (csPick >= lo && csPick <= hi) ? csPick : lo;

        csFor.forEach(function (t, i) { t.classList.toggle('is-here', i === at); });
        csTick = false;
      };
      window.addEventListener('scroll', function () {
        if (!csTick) { csTick = true; requestAnimationFrame(csSpy); }
      }, { passive: true });
      window.addEventListener('resize', csSpy, { passive: true });
      csSpy();
    }
  }

  /* ------------------------------------------------------- STICKY TAB BARS */
  /* The portfolio's filter row and the training page's section row both sit open
     on the sheet in the page and take a dark band only once they lock to the top.
     CSS can hold the bar there but cannot tell that it has arrived, so this marks
     it. Reading the rect against the stick offset is exact and needs no sentinel
     element — the bar is stuck precisely when its top has reached the offset.
     Nothing else on the page depends on the class, so a page with neither bar
     simply skips this. */
  /* .filters came off this list when the portfolio row stopped being sticky —
     a bar that never sticks does not need a stuck state computed for it. */
  var stickBars = $$('.csnav--open');
  if (stickBars.length) {
    var stickTick = false;
    var stickScan = function () {
      stickBars.forEach(function (bar) {
        var top = parseFloat(getComputedStyle(bar).top) || 0;
        bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= top + 0.5);
      });
      stickTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!stickTick) { stickTick = true; requestAnimationFrame(stickScan); }
    }, { passive: true });
    window.addEventListener('resize', stickScan, { passive: true });
    stickScan();
  }

  /* -------------------------------------------------------- SECTION DRIFT */
  /* Training pages. The section header travels a little against the section it
     names — low on the way in, high on the way out — so a new fold announces
     itself before you read the words. It replaced the hairline rules that used
     to separate sections, so this is doing real work, not ornament.

     Position is read from the section, not accumulated from scroll deltas, so
     it stays correct after an anchor jump, a resize, or an accordion opening
     above it. Transform only, one rAF per scroll, and skipped entirely when the
     reader has asked for reduced motion — the CSS pins transform to none there
     as well, so nothing is left half-applied. */
  var drifts = $$('[data-drift]');
  if (drifts.length && !reduced) {
    var dTick = false;
    var drift = function () {
      var vh = window.innerHeight;
      for (var i = 0; i < drifts.length; i++) {
        var sec = drifts[i].parentNode;
        var r = sec.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) continue;   /* off screen, leave it */
        var p = (vh - r.top) / (vh + r.height);            /* 0 entering, 1 leaving */
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        drifts[i].style.transform = 'translate3d(0,' + ((0.5 - p) * 26).toFixed(1) + 'px,0)';
      }
      dTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!dTick) { dTick = true; requestAnimationFrame(drift); }
    }, { passive: true });
    window.addEventListener('resize', drift, { passive: true });
    drift();
  }

  /* ------------------------------------------------------ EXPANDING PANEL */
  /* The agenda's dark container hugs the content column at rest and reaches the
     page edges as the section rises. Only a custom property is written; the CSS
     spends it on an absolutely positioned background, so nothing in the document
     reflows and the copy inside never shifts under the reader.

     Progress is read from the section's position, not accumulated from scroll
     deltas, so it survives an anchor jump, a resize, or a module opening above
     it. Measured off the panel's own width, which does not change — the pseudo
     is what grows — so the maximum stays stable frame to frame. */
  var panels = $$('[data-expand]');
  if (panels.length && !reduced) {
    var pTick = false;
    var expand = function () {
      var vh = window.innerHeight, vw = document.documentElement.clientWidth;
      for (var i = 0; i < panels.length; i++) {
        var r = panels[i].getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        /* 0 as the top edge enters at the foot of the viewport, 1 by the time it
           has travelled two thirds of the way up */
        var prog = (vh - r.top) / (vh * 0.66);
        prog = prog < 0 ? 0 : prog > 1 ? 1 : prog;
        var max = Math.max(0, (vw - r.width) / 2);
        panels[i].style.setProperty('--bleed', (max * prog).toFixed(1) + 'px');
      }
      pTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!pTick) { pTick = true; requestAnimationFrame(expand); }
    }, { passive: true });
    window.addEventListener('resize', expand, { passive: true });
    expand();
  }

  /* -------------------------------------------------------- VERTICAL TABS */
  /* The careers page's application process. A real tablist rather than four
     buttons: roving tabindex so Tab lands on the group once and the arrow keys
     move within it, Home and End jump to the ends, and only the selected panel
     is in the accessibility tree. Without JS every panel but the first is
     hidden by the markup, so the page still states the first step. */
  $$('[data-vtabs]').forEach(function (group) {
    var tabs = $$('.vtab', group);
    var panels = $$('.vpanel', group);
    if (!tabs.length || tabs.length !== panels.length) return;

    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, last = tabs.length - 1, to = -1;
        /* the list is vertical on a wide screen and horizontal once stacked, so
           both axes move — matching whichever way it is actually drawn */
        if (k === 'ArrowDown' || k === 'ArrowRight') to = i === last ? 0 : i + 1;
        else if (k === 'ArrowUp' || k === 'ArrowLeft') to = i === 0 ? last : i - 1;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = last;
        if (to > -1) { e.preventDefault(); select(to, true); }
      });
    });
  });

  /* -------------------------------------------------------------- SIGN-UP */
  /* The careers page's mailing-list form. There is no list behind it yet, so it
     says so rather than showing a tick and dropping the address — the one thing
     a subscribe box must never do. It still validates properly, so the failure
     the visitor sees is the real one and not a rejected email masquerading as an
     outage. When a list exists: give the <form> a real action and a method, and
     delete the block marked below. */
  $$('[data-signup]').forEach(function (form) {
    var input = $('input[type="email"]', form);
    var msg = $('.signup__msg', form);
    if (!input || !msg) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v || !input.checkValidity()) {
        msg.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      /* ---- delete from here once the form posts somewhere real ---- */
      msg.innerHTML = 'Sign-ups are not connected yet, so nothing was sent. ' +
                      '<a href="index.html#contact">Get in touch</a> and we will add you to the list.';
      /* ---- to here ---- */
    });

    /* clear the notice as soon as they start again */
    input.addEventListener('input', function () { msg.textContent = ''; });
  });

  /* ------------------------------------------------------ SHEET (MODAL) */
  /* One controller for every modal on the site. A sheet is any element with
     [data-sheet]; anything with [data-sheet-open="<name>"] opens it and
     anything with [data-sheet-close] inside it closes it, so a new modal is
     markup only — see DESIGN.md → Components → Sheet.

     The behaviour that is not negotiable, and is therefore here rather than
     left to each caller: it enters from the bottom, it stands 90% tall, it
     closes on the icon, on Escape and on the scrim, it traps focus while open
     and hands focus back to whatever opened it, and the page behind it stops
     scrolling. Everything outside is marked inert where the browser has it —
     the manual Tab wrap below is the floor for the browsers that do not. */

  var docEl = document.documentElement;
  var openSheet = null, lastFocus = null;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
                  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function outerRegions(sheet) {
    return $$('body > *').filter(function (el) { return el !== sheet; });
  }

  function show(sheet, opener) {
    if (openSheet) return;
    openSheet = sheet;
    lastFocus = opener || document.activeElement;

    /* The scrollbar's width is handed to CSS before the bar is taken away, so
       the fixed header can hold its right edge instead of jumping outward by
       that much. On overlay-scrollbar platforms this measures 0 and nothing
       moves either way. */
    var sw = window.innerWidth - docEl.clientWidth;
    docEl.style.setProperty('--lockpad', (sw > 0 ? sw : 0) + 'px');
    docEl.classList.add('sheet-locked');

    sheet.hidden = false;
    if ('inert' in HTMLElement.prototype) {
      outerRegions(sheet).forEach(function (el) { el.inert = true; });
    }
    /* two frames: one to get the element laid out at translateY(100%), the
       next to change it — one frame alone lands mid-layout and the panel
       simply appears in place */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    });

    var first = $('[data-sheet-focus]', sheet) || $(FOCUSABLE, sheet);
    if (first) first.focus({ preventScroll: true });
    /* the opener rides along: a sheet reused across many triggers — the job
       sheet — needs to know which one it was */
    sheet.dispatchEvent(new CustomEvent('sheet:open', { detail: { opener: lastFocus } }));
  }

  function hide(sheet) {
    if (openSheet !== sheet) return;
    openSheet = null;
    sheet.classList.remove('is-open');

    if ('inert' in HTMLElement.prototype) {
      outerRegions(sheet).forEach(function (el) { el.inert = false; });
    }

    var done = function () {
      sheet.hidden = true;
      docEl.classList.remove('sheet-locked');
      docEl.style.removeProperty('--lockpad');
    };
    var panel = $('.sheet__panel', sheet);
    if (!panel || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); }
    else {
      var settled = false;
      var fin = function () { if (settled) return; settled = true; panel.removeEventListener('transitionend', fin); done(); };
      panel.addEventListener('transitionend', fin);
      setTimeout(fin, 700);          /* transitionend does not fire on a display:none race */
    }

    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  document.addEventListener('keydown', function (e) {
    if (!openSheet) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(openSheet); return; }
    if (e.key !== 'Tab') return;

    var items = $$(FOCUSABLE, openSheet).filter(function (el) {
      return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-sheet-open]');
    if (opener) {
      var target = $('[data-sheet="' + opener.getAttribute('data-sheet-open') + '"]');
      if (target) {
        e.preventDefault();
        /* the mobile menu is the sheet's most likely opener and must not be
           left standing behind it */
        var mm = $('#mobileMenu'), bg = $('#burger');
        if (mm && !mm.hidden) {
          mm.hidden = true;
          if (bg) { bg.setAttribute('aria-expanded', 'false'); bg.setAttribute('aria-label', 'Open menu'); }
        }
        show(target, opener);
      }
      return;
    }

    if (openSheet && e.target.closest('[data-sheet-close]')) { hide(openSheet); }
  });

  /* --------------------------------------------------- SHEET: GET IN TOUCH */
  /* Built here rather than pasted into nine documents. It is identical on every
     page, it cannot work without JS anyway, and nine hand-kept copies of a form
     is nine chances for them to drift apart. The "Get in touch" links keep their
     href to the contact section, so with JS off they still go somewhere real. */

  var CONTACT_SHEET =
    '<div class="sheet" data-sheet="contact" hidden>' +
      '<div class="sheet__scrim" data-sheet-close></div>' +
      '<div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheetContactH">' +
        '<div class="sheet__head">' +
          '<div>' +
            '<p class="sheet__over">Get in touch</p>' +
            '<h2 class="sheet__h" id="sheetContactH">Book a call, or <em>tell us what you\'re working on</em></h2>' +
          '</div>' +
          '<button class="sheet__x" type="button" data-sheet-close data-sheet-focus aria-label="Close">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +

        '<div class="sheet__tabs" role="tablist" aria-label="How to reach us">' +
          '<button class="filt is-on" type="button" role="tab" id="sheetTabBook" aria-controls="sheetPaneBook" aria-selected="true">Book a call</button>' +
          '<button class="filt" type="button" role="tab" id="sheetTabAsk" aria-controls="sheetPaneAsk" aria-selected="false" tabindex="-1">Send an enquiry</button>' +
        '</div>' +

        '<div class="sheet__panels">' +
          '<div class="sheet__pane" id="sheetPaneBook" role="tabpanel" aria-labelledby="sheetTabBook" tabindex="0">' +
            '<div class="booker" data-cal-defer' +
                 ' data-cal-link="theghost-writer-wucmfa/30min"' +
                 ' data-cal-namespace="30min-sheet">' +
              '<div class="booker__panel is-loading">' +
                '<div class="booker__await"><span class="booker__code">Opening the calendar</span></div>' +
              '</div>' +
              '<div class="booker__cue">' +
                '<svg class="booker__clock" viewBox="0 0 20 20" aria-hidden="true">' +
                  '<circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
                  '<path d="M10 5.6V10l3 1.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
                '</svg>' +
                '<span class="booker__cue-body">' +
                  '<span class="booker__cue-title">Book a 30-minute intro call</span>' +
                  '<span class="booker__cue-note">Pick a time that suits you — no forms, no back-and-forth.</span>' +
                '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="sheet__pane" id="sheetPaneAsk" role="tabpanel" aria-labelledby="sheetTabAsk" tabindex="0" hidden>' +
            '<form class="fields" data-enquiry novalidate>' +
              '<label class="fld"><span class="fld__l">Your name <span class="req">*</span></span>' +
                '<input class="fld__i" name="name" type="text" autocomplete="name" required></label>' +
              '<label class="fld"><span class="fld__l">Work email <span class="req">*</span></span>' +
                '<input class="fld__i" name="email" type="email" autocomplete="email" required></label>' +
              '<label class="fld"><span class="fld__l">Company</span>' +
                '<input class="fld__i" name="company" type="text" autocomplete="organization"></label>' +
              '<label class="fld"><span class="fld__l">What can we help with?</span>' +
                '<select class="fld__i" name="topic">' +
                  '<option>User research</option>' +
                  '<option>UX design</option>' +
                  '<option>UX training</option>' +
                  '<option>LEGO&reg; Serious Play</option>' +
                  '<option>Something else</option>' +
                '</select></label>' +
              '<label class="fld fld--wide"><span class="fld__l">Tell us about it <span class="req">*</span></span>' +
                '<textarea class="fld__i" name="message" rows="5" required ' +
                  'placeholder="What are you building, who is it for, and what do you need to find out?"></textarea></label>' +
              '<div class="fields__act">' +
                '<button class="btn btn--mark" type="submit">Send enquiry</button>' +
                '<p class="fields__note">We reply within two working days.</p>' +
              '</div>' +
              '<p class="fields__msg" role="status" aria-live="polite"></p>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  if (!$('[data-sheet="contact"]')) {
    var holder = document.createElement('div');
    holder.innerHTML = CONTACT_SHEET;
    var contactSheet = holder.firstChild;
    document.body.appendChild(contactSheet);

    initBooker($('.booker', contactSheet));

    /* the calendar is third-party weight — it is not fetched until someone has
       actually asked to see it */
    contactSheet.addEventListener('sheet:open', function () { wakeBookers(contactSheet); });

    /* Every "Get in touch" on the site, plus (client request, 2026-08-24)
       every inner-page primary/secondary CTA that used to just link to
       index.html#contact — hero and pitch buttons across all service and
       training pages, whatever their own label ("Assess your organisation",
       "Add UX talent", ...), not just the ones literally titled "Get in
       touch". a.btn[href="index.html#contact"] catches all of those in one
       rule: every such anchor on the site is .btn-classed already (checked),
       so this never picks up a plain nav/footer link by accident. The
       homepage's OWN in-page CTAs are untouched by this — they scroll to the
       real #contact section with a bare href="#contact", a different string,
       so they never match here and keep their native anchor behaviour.
       Kept as a selector list rather than an attribute on every matching
       anchor across nine-plus files; new markup should use
       data-sheet-open="contact" and is picked up by the delegated handler. */
    $$('.nav__cta, .mm__cta, .contact__act .btn, a.btn[href="index.html#contact"]').forEach(function (el) {
      el.setAttribute('data-sheet-open', 'contact');
    });

    /* TABS — two panes, roving tabindex, arrows and Home/End, same as .vtabs */
    var sTabs = $$('[role="tab"]', contactSheet);
    var sPanels = $('.sheet__panels', contactSheet);
    var showPane = function (i, moveFocus) {
      sTabs.forEach(function (tab, n) {
        var on = n === i;
        tab.classList.toggle('is-on', on);
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !on;
      });
      /* the panes share one scroller, so without this the enquiry form opens
         part-scrolled at whatever depth the calendar was left at */
      sPanels.scrollTop = 0;
      if (moveFocus) sTabs[i].focus();
    };
    sTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { showPane(i); });
      tab.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
              : e.key === 'Home' ? 0 : e.key === 'End' ? sTabs.length - 1 : -1;
        if (n < 0 && e.key !== 'Home') return;
        e.preventDefault();
        showPane((n + sTabs.length) % sTabs.length, true);
      });
    });
    /* the enquiry form's fallback link needs to reach the booking tab */
    contactSheet.addEventListener('click', function (e) {
      if (e.target.closest('[data-goto-book]')) { e.preventDefault(); showPane(0, true); }
    });
  }

  /* The enquiry form. Same rule as the careers sign-up: there is no endpoint
     behind it yet, so it must not show a tick and drop the message. It says
     plainly that nothing was sent and points at the calendar, which is live —
     the visitor leaves with a way to reach us either way. No address is
     invented here; none is recorded anywhere in this build.
     When an endpoint exists: give the <form> an action and method, and delete
     the block marked below. */
  $$('[data-enquiry]').forEach(function (form) {
    var msg = $('.fields__msg', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[required]', form).filter(function (f) { return !f.checkValidity(); })[0];
      if (bad) {
        msg.textContent = bad.value.trim()
          ? 'That email address does not look right — please check it.'
          : 'Please fill in your name, email and a short note.';
        bad.focus();
        return;
      }
      /* ---- delete from here once the form posts somewhere real ---- */
      msg.innerHTML = 'This form is not connected yet, so nothing was sent. ' +
                      '<button type="button" data-goto-book>Book a call instead</button> — ' +
                      'that calendar is live and goes straight into our diary.';
      /* ---- to here ---- */
    });

    $$('.fld__i', form).forEach(function (f) {
      f.addEventListener('input', function () { if (msg.textContent) msg.textContent = ''; });
    });
  });

  /* -------------------------------------------------- SHEET: JOB DETAIL */
  /* One sheet serving six roles. The detail copy lives in a <template> inside
     each <article class="job">, not in a JS object here: it is client-reviewable
     copy and belongs in the document with the rest of it. A template's content
     sits outside textContent, so the filter and search over the job list never
     see it — the results stay predictable. */
  var jobSheet = $('[data-sheet="job"]');
  if (jobSheet) {
    var jobFn = $('[data-job-fn]', jobSheet);
    var jobTitle = $('[data-job-title]', jobSheet);
    var jobMeta = $('[data-job-meta]', jobSheet);
    var jobBody = $('[data-job-body]', jobSheet);

    jobSheet.addEventListener('sheet:open', function (e) {
      var art = e.detail && e.detail.opener ? e.detail.opener.closest('.job') : null;
      if (!art) return;
      var tpl = $('.jd__src', art);

      jobTitle.textContent = ($('.job__t', art) || {}).textContent || 'Open role';
      jobFn.textContent = tpl ? tpl.getAttribute('data-fn') : 'Open role';
      jobMeta.innerHTML = ($('.job__meta', art) || {}).innerHTML || '';

      jobBody.innerHTML = '';
      if (tpl) jobBody.appendChild(tpl.content.cloneNode(true));
      $('.sheet__panels', jobSheet).scrollTop = 0;
    });
  }

  /* DROP ZONE — a real file lands on a real input. The drag handlers only
     duplicate what the input does natively; the point of them is that the whole
     dashed area is a target, not just the 1px the browser would give a file
     field. Validation is on extension and size, because MIME type on a .doc is
     whatever the sending OS felt like that day. */
  var CV_OK = /\.(pdf|docx?|rtf)$/i;
  var CV_MAX = 8 * 1024 * 1024;

  $$('[data-drop]').forEach(function (zone) {
    var input = $('.drop__in', zone);
    var got = $('.drop__got', zone);
    var nameOut = $('[data-drop-name]', zone);
    var clear = $('[data-drop-clear]', zone);
    var msg = zone.closest('form') ? $('.fields__msg', zone.closest('form')) : null;
    if (!input) return;

    function say(t) { if (msg) msg.textContent = t; }

    function take(file) {
      zone.classList.remove('is-bad');
      if (!file) return;
      if (!CV_OK.test(file.name)) {
        zone.classList.add('is-bad');
        say('That looks like ' + (file.name.split('.').pop() || 'an unknown file') +
            '. Please send a PDF or a Word document.');
        input.value = '';
        return;
      }
      if (file.size > CV_MAX) {
        zone.classList.add('is-bad');
        say('That file is ' + (file.size / 1048576).toFixed(1) + ' MB. The limit is 8 MB.');
        input.value = '';
        return;
      }
      nameOut.textContent = file.name + '  ·  ' + (file.size / 1024).toFixed(0) + ' KB';
      got.hidden = false;
      zone.classList.add('has-file');
      say('');
    }

    input.addEventListener('change', function () { take(input.files[0]); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        /* dragleave fires crossing onto a child, so only drop the state when
           the pointer has actually left the zone's box */
        if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('is-over');
      });
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-over');
      var file = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
      if (!file) return;
      /* put it on the input for real, so the field is genuinely populated and
         a native form post would carry it */
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      } catch (err) { /* older engines: the file is still read below */ }
      take(file);
    });

    if (clear) clear.addEventListener('click', function () {
      input.value = '';
      got.hidden = true;
      zone.classList.remove('has-file', 'is-bad');
      say('');
      input.focus();
    });
  });

  /* The application form. Same rule as the sign-up and the enquiry: no endpoint
     behind it, so it must not take someone's CV and show a tick. It names what
     it has — including the file — so the failure is unmistakable.
     When an endpoint exists: give the <form> an action, a method and
     enctype="multipart/form-data", and delete the block marked below. */
  $$('[data-apply]').forEach(function (form) {
    var msg = $('.fields__msg', form);
    var zone = $('[data-drop]', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[required]', form).filter(function (f) { return !f.checkValidity(); })[0];
      if (bad) {
        if (bad.type === 'file') {
          msg.textContent = 'Please attach your CV — a PDF or Word document.';
          zone.classList.add('is-bad');
        } else {
          msg.textContent = bad.value.trim()
            ? 'That email address does not look right — please check it.'
            : 'Please fill in your name and email.';
        }
        bad.focus();
        return;
      }
      /* ---- delete from here once the form posts somewhere real ---- */
      var f = form.cv.files[0];
      msg.innerHTML = 'Applications are not connected yet, so nothing was sent' +
                      (f ? ' — including <strong>' + f.name.replace(/[<>&]/g, '') + '</strong>' : '') +
                      '. Please do not resubmit. Until this is wired up, ' +
                      '<a href="index.html#contact">get in touch</a> and we will take it from there.';
      /* ---- to here ---- */
    });

    $$('.fld__i', form).forEach(function (f) {
      f.addEventListener('input', function () { if (msg.textContent) msg.textContent = ''; });
    });
  });

  /* ------------------------------------------------------ ARTICLE CONTENTS */
  /* The rail marks the heading the reader is in, on the same reading line the
     case-study nav uses — position read off getBoundingClientRect each frame
     rather than accumulated from deltas, so it cannot drift. Anchor clicks are
     left to the browser: the headings carry scroll-margin-top for the fixed
     header, which is all a jump needs. */
  var toc = $('#toc');
  if (toc) {
    var tocLinks = $$('a', toc);
    var heads = tocLinks.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    }).filter(Boolean);

    if (heads.length === tocLinks.length && heads.length) {
      var ticking = false;
      var markToc = function () {
        ticking = false;
        var line = window.innerHeight * 0.28;
        var at = 0;
        heads.forEach(function (h, i) {
          if (h.getBoundingClientRect().top <= line) at = i;
        });
        /* above the first heading nothing is marked — the reader is still in
           the standfirst and marking section one there would be a lie */
        var before = heads[0].getBoundingClientRect().top > line;
        tocLinks.forEach(function (a, i) {
          a.classList.toggle('is-here', !before && i === at);
        });
      };
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(markToc);
      }, { passive: true });
      window.addEventListener('resize', markToc);
      markToc();
    }
  }

  /* ---------------------------------------------------------------- FAQ */
  /* The FAQ's rows are independent — two questions can be open at once, and on
     that page that is what you want. A row inside a [data-qa-group] is not: the
     training agenda is a sequence you step through, and four open modules is the
     wall of text the accordion was there to avoid. */
  $$('.qa').forEach(function (qa) {
    var btn = $('.qa__q', qa);
    var panel = $('.qa__a', qa);
    if (!btn || !panel) return;
    if (!panel.id) panel.id = 'qa-' + Math.random().toString(36).slice(2, 8);
    btn.setAttribute('aria-controls', panel.id);
    btn.addEventListener('click', function () {
      var group = qa.closest('[data-qa-group]');
      if (group) {
        $$('.qa', group).forEach(function (other) {
          if (other === qa) return;
          other.classList.remove('open');
          var ob = $('.qa__q', other);
          if (ob) ob.setAttribute('aria-expanded', 'false');
        });
      }
      var open = qa.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ------------------------------------------------------------ THE PLATE */
  var map = $('#worldMap');
  if (map && map.getContext) {
    (function () {
      var ctx = map.getContext('2d');

      /* coarse landmass outlines in [lon, lat] — stylised, not survey-grade */
      var LAND = [
        [[-168,66],[-160,71],[-140,70],[-125,70],[-110,68],[-95,70],[-85,73],[-75,78],[-60,76],[-55,68],[-62,60],[-78,62],[-80,55],[-64,48],[-60,45],[-70,42],[-75,36],[-81,28],[-82,25],[-90,29],[-97,26],[-105,22],[-115,30],[-125,40],[-130,52],[-140,60],[-155,58]],
        [[-92,17],[-84,15],[-77,8],[-79,9],[-83,12],[-88,16]],
        [[-81,8],[-75,11],[-60,11],[-52,5],[-50,0],[-44,-3],[-35,-6],[-38,-13],[-48,-25],[-54,-34],[-58,-39],[-63,-42],[-66,-50],[-70,-55],[-73,-50],[-71,-40],[-72,-30],[-70,-20],[-76,-14],[-81,-6],[-80,0],[-78,5]],
        [[-17,15],[-16,21],[-10,27],[0,32],[10,37],[20,32],[32,31],[35,25],[40,15],[45,11],[51,12],[48,5],[41,-2],[40,-10],[37,-17],[35,-24],[30,-30],[25,-34],[18,-34],[14,-23],[12,-16],[9,-1],[3,6],[-8,4],[-13,9]],
        [[-10,37],[-9,43],[-2,43],[0,48],[-5,50],[-4,58],[5,58],[10,64],[15,68],[24,70],[30,68],[40,66],[45,60],[40,52],[36,45],[28,41],[23,40],[15,40],[12,38],[16,42],[12,45],[6,44],[0,40],[-6,36]],
        [[30,68],[50,72],[70,73],[90,76],[110,75],[130,72],[145,70],[160,70],[170,66],[179,66],[179,60],[170,60],[162,58],[155,52],[142,45],[135,42],[130,35],[122,30],[120,22],[110,18],[105,10],[100,5],[103,1],[97,5],[94,16],[90,22],[80,15],[77,8],[72,20],[68,24],[62,25],[57,25],[50,30],[45,38],[40,40],[35,45],[30,50],[28,58]],
        [[113,-22],[115,-34],[129,-32],[138,-35],[147,-38],[150,-34],[153,-28],[146,-19],[142,-11],[135,-12],[130,-11],[125,-14],[118,-20]],
        [[-45,60],[-52,68],[-58,76],[-45,83],[-25,82],[-20,72],[-30,66]],
        [[-7,50],[-6,55],[-3,58],[0,55],[1,51],[-5,49]],
        [[129,32],[134,34],[139,36],[141,42],[146,45],[143,41],[138,34],[132,31]],
        [[166,-46],[174,-41],[178,-37],[173,-34],[168,-44]],
        [[43,-12],[50,-15],[50,-25],[45,-25]]
      ];

      /* The Bridged Global partner studios — peers, not spokes. Supplied by the
         client 2026-08-11. `lx/ly` nudge each label clear of its neighbours.
         INFERRED CITIES (client gave country only): Chicago, London, Hamburg,
         Tokyo carried over from the approved chip list; Shanghai chosen for
         XPLUSX China. Confirm before launch. */
      var CITIES = [
        { n:'Chicago',   studio:'Bold Insight',  country:'United States', url:'https://boldinsight.com/',
          la:41.88, lo:-87.63,  lx:-11, ly:1,  al:'right' },
        { n:'London',    studio:'Bold Insight',  country:'United Kingdom', url:'https://boldinsight.com/',
          la:51.51, lo:-0.13,   lx:-11, ly:-9, al:'right' },
        { n:'Hamburg',   studio:'uintent',       country:'Germany',       url:'https://www.uintent.com/',
          la:53.55, lo:9.99,    lx:11,  ly:-9, al:'left'  },
        { n:'Pune',      studio:'Peepal Design', country:'India',         url:'https://peepaldesign.com/',
          la:18.52, lo:73.86,   lx:-11, ly:-2, al:'right' },
        { n:'Bangalore', studio:'Peepal Design', country:'India',         url:'https://peepaldesign.com/',
          la:12.97, lo:77.59,   lx:12,  ly:8,  al:'left'  },
        { n:'Shanghai',  studio:'XPLUSX',        country:'China',         url:'https://www.xplusx.net/',
          la:31.23, lo:121.47,  lx:-12, ly:8,  al:'right' },
        { n:'Tokyo',     studio:'UIsm',          country:'Japan',         url:'https://uism.co.jp/',
          la:35.68, lo:139.69,  lx:11,  ly:-2, al:'left'  },
        { n:'Singapore', studio:'XPLUSX',        country:'Singapore',     url:'https://www.xplusx.net/',
          la:1.35,  lo:103.82,  lx:11,  ly:8,  al:'left'  }
      ];

      var LAT_TOP = 82, LAT_BOT = -56;
      var W = 0, H = 0, dpr = 1, dots = [], pts = [], t0 = 0, raf = 0, visible = false;
      /* Peepal Design, Bangalore — the studio whose site this is */
      var DEFAULT_CITY = 4;
      var sel = DEFAULT_CITY, hoverI = -1, mx = -1, my = -1;
      var cycleTimer = null, hoveringMap = false, CITY_DWELL = 4200;

      var tagEls = $$('.city', $('#cityTags'));
      var card = $('#cityCard');
      var cName = $('#cityCardName'), cCountry = $('#cityCardCountry');
      var cLink = $('#cityCardLink'), cLinkText = $('#cityCardLinkText');

      function proj(lo, la, w, h) {
        return [ (lo + 180) / 360 * w, (LAT_TOP - la) / (LAT_TOP - LAT_BOT) * h ];
      }
      function inPoly(x, y, poly) {
        var hit = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) hit = !hit;
        }
        return hit;
      }

      function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        var r = map.getBoundingClientRect();
        W = Math.max(r.width, 300); H = W / 2;
        map.width = W * dpr; map.height = H * dpr;
        map.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var step = W < 620 ? 6 : 8;
        dots = [];
        for (var x = step / 2; x < W; x += step) {
          for (var y = step / 2; y < H; y += step) {
            var lo = x / W * 360 - 180;
            var la = LAT_TOP - (y / H) * (LAT_TOP - LAT_BOT);
            for (var k = 0; k < LAND.length; k++) {
              if (inPoly(lo, la, LAND[k])) { dots.push([x, y]); break; }
            }
          }
        }
        pts = CITIES.map(function (c) {
          var p = proj(c.lo, c.la, W, H);
          return { x: p[0], y: p[1], c: c };
        });
      }

      /* nearest pin within a forgiving radius */
      function hitTest(x, y) {
        var best = -1, bestD = 20 * 20;
        for (var i = 0; i < pts.length; i++) {
          var dx = pts[i].x - x, dy = pts[i].y - y, d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      }

      function syncCard() {
        if (!card) return;
        var has = sel > -1;
        card.classList.toggle('is-on', has);
        var c = has ? CITIES[sel] : null;
        /* the studio is the real subject; the city locates it */
        if (cName) cName.textContent = has ? c.studio : 'Select a studio';
        if (cCountry) cCountry.textContent = has ? (c.n + ', ' + c.country)
                                                 : 'Pick a pin on the map, or a name below.';
        if (cLink) {
          cLink.hidden = !has;
          cLink.setAttribute('href', has && c.url ? c.url : '#global');
          cLink.setAttribute('target', '_blank');
          cLink.setAttribute('rel', 'noopener');
          if (cLinkText) cLinkText.textContent = has && c.url ? 'Visit site' : 'Website to confirm';
          cLink.classList.toggle('is-todo', !(has && c.url));
        }
        tagEls.forEach(function (b, i) {
          var on = i === sel;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }

      /* the tour keeps moving on its own, but never over the top of someone
         who is reading: it holds while the pointer is on the map or the tags,
         and a manual pick restarts the dwell rather than being overridden */
      function canCycle() { return !reduced && visible && !hoveringMap && pts.length > 1; }
      function stopCycle() { if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; } }
      function playCycle() {
        stopCycle();
        if (!canCycle()) return;
        cycleTimer = setInterval(function () {
          sel = (sel + 1) % CITIES.length;
          syncCard();
          if (!raf) raf = requestAnimationFrame(draw);
        }, CITY_DWELL);
      }

      function select(i) {
        sel = i;                          /* one studio is always current */
        syncCard();
        playCycle();
        if (!raf) { raf = requestAnimationFrame(draw); }
      }

      function draw(now) {
        if (!t0) t0 = now;
        var el = (now - t0) / 1000;
        ctx.clearRect(0, 0, W, H);

        /* the machine-made grid — silver gelatin */
        ctx.fillStyle = 'rgba(199,212,228,0.46)';
        for (var i = 0; i < dots.length; i++) {
          ctx.fillRect(dots[i][0] - 1, dots[i][1] - 1, 2, 2);
        }

        /* the cursor raises local exposure over the plate, as in the hero */
        if (mx > -1 && !reduced) {
          var g = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
          g.addColorStop(0, 'rgba(41,171,226,0.16)');
          g.addColorStop(0.55, 'rgba(41,171,226,0.05)');
          g.addColorStop(1, 'rgba(41,171,226,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(mx, my, 130, 0, 6.2832); ctx.fill();
        }

        ctx.font = '640 10px Archivo, system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        for (var c = 0; c < pts.length; c++) {
          var q = pts[c], city = q.c;
          var appear = reduced ? 1 : clamp((el - 0.15 - c * 0.07) / 0.6, 0, 1);
          if (appear <= 0) continue;

          var isSel = c === sel;
          var isHov = c === hoverI;
          var dim = (sel > -1 && !isSel) ? 0.34 : 1;   /* selection dims the rest */
          var pulse = reduced ? 0 : (Math.sin(el * 1.6 + c * 0.8) * 0.5 + 0.5);

          /* halo */
          var haloR = (isSel ? 16 : isHov ? 12 : 5 + pulse * 5) * appear;
          ctx.beginPath();
          ctx.arc(q.x, q.y, haloR, 0, 6.2832);
          ctx.fillStyle = 'rgba(41,171,226,' + (0.2 * dim * appear).toFixed(3) + ')';
          ctx.fill();

          /* selection ring */
          if (isSel) {
            ctx.beginPath();
            ctx.arc(q.x, q.y, 11 * appear, 0, 6.2832);
            ctx.strokeStyle = 'rgba(95,198,238,0.95)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }

          /* core */
          ctx.beginPath();
          ctx.arc(q.x, q.y, (isSel ? 3.6 : 2.6) * appear, 0, 6.2832);
          ctx.fillStyle = isSel
            ? 'rgba(159,224,247,' + appear.toFixed(2) + ')'
            : 'rgba(95,198,238,' + (dim * appear).toFixed(2) + ')';
          ctx.fill();

          /* leader + label */
          var tx2 = q.x + city.lx, ty2 = q.y + city.ly;
          ctx.globalAlpha = appear * (isSel || isHov ? 1 : dim);
          ctx.beginPath();
          ctx.moveTo(q.x + (city.lx > 0 ? 4 : -4), q.y);
          ctx.lineTo(tx2 - (city.lx > 0 ? 3 : -3), ty2);
          ctx.strokeStyle = 'rgba(199,212,228,0.28)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = city.al;
          ctx.fillStyle = isSel ? 'rgba(244,243,240,0.98)'
                        : isHov ? 'rgba(232,233,236,0.9)'
                                : 'rgba(199,212,228,0.62)';
          ctx.fillText(city.n.toUpperCase(), tx2, ty2);
          ctx.globalAlpha = 1;
        }

        var animating = !reduced && visible;
        if (animating) raf = requestAnimationFrame(draw); else raf = 0;
      }

      build();
      syncCard();

      /* pointer: hover highlight + the plate's own loupe */
      map.addEventListener('pointermove', function (e) {
        var r = map.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
        var h = hitTest(mx, my);
        if (h !== hoverI) {
          hoverI = h;
          map.style.cursor = h > -1 ? 'pointer' : 'default';
        }
        if (!raf) raf = requestAnimationFrame(draw);
      }, { passive: true });

      map.addEventListener('pointerenter', function () { hoveringMap = true; stopCycle(); });
      map.addEventListener('pointerleave', function () {
        mx = my = -1; hoverI = -1; hoveringMap = false;
        map.style.cursor = 'default';
        playCycle();
        if (!raf) raf = requestAnimationFrame(draw);
      });

      map.addEventListener('click', function (e) {
        var r = map.getBoundingClientRect();
        var h = hitTest(e.clientX - r.left, e.clientY - r.top);
        if (h > -1) select(h);
      });

      tagEls.forEach(function (b, i) {
        b.addEventListener('click', function () { select(i); });
        b.addEventListener('focus', function () { select(i); });
      });
      var tagWrap = $('#cityTags');
      if (tagWrap) {
        tagWrap.addEventListener('pointerenter', function () { hoveringMap = true; stopCycle(); });
        tagWrap.addEventListener('pointerleave', function () { hoveringMap = false; playCycle(); });
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          if (visible && !raf) { t0 = 0; raf = requestAnimationFrame(draw); }
          else if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
          if (visible) playCycle(); else stopCycle();
        }, { threshold: 0.15 }).observe(map);
      } else { visible = true; raf = requestAnimationFrame(draw); playCycle(); }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopCycle(); else playCycle();
      });

      var mrt;
      window.addEventListener('resize', function () {
        clearTimeout(mrt);
        mrt = setTimeout(function () { build(); t0 = 0; if (!raf) raf = requestAnimationFrame(draw); }, 180);
      }, { passive: true });
    })();
  }

  /* -------------------------------------------------------- THEME PICKER */
  /* Bottom-left FAB + swatch panel, built here and appended once per page —
     same reasoning as the contact sheet: identical on every page, needs JS
     to do anything, and nine-plus hand-kept copies is nine chances to drift.
     Choice persists via localStorage and is re-applied on every future page
     load; only --mark/--mark-hot/--mark-deep/--on-mark move, so the header
     logo (its own hardcoded colour, by design — see contact-sheet.css) never
     changes with the rest of the theme. */
  var THEME_KEY = 'peepal-theme';
  var THEME_CUSTOM_KEY = 'peepal-theme-custom';
  var THEMES = [
    { key: 'amber',   label: 'Amber',   mark: '#FFA54A', hot: '#FFC080', deep: '#B37434', onMark: '#2B1607' },
    { key: 'cyan',    label: 'Cyan',    mark: '#1CB4C6', hot: '#5FC6EE', deep: '#137FB4', onMark: '#04202B' },
    { key: 'rose',    label: 'Rose',    mark: '#FF6FA3', hot: '#FF9ABE', deep: '#B34E72', onMark: '#330019' },
    { key: 'emerald', label: 'Emerald', mark: '#34D399', hot: '#71E0B7', deep: '#24946B', onMark: '#03140D' },
    { key: 'blue',    label: 'Blue',    mark: '#5B9EFF', hot: '#8CBBFF', deep: '#406FB3', onMark: '#041226' }
  ];

  function applyTheme(theme) {
    var root = document.documentElement.style;
    root.setProperty('--mark', theme.mark);
    root.setProperty('--mark-hot', theme.hot);
    root.setProperty('--mark-deep', theme.deep);
    root.setProperty('--on-mark', theme.onMark);
  }

  /* Wheel-picked colour has no hand-picked hot/deep/onMark of its own, so
     these are derived the same way the five presets' were: hot lightens
     ~30% toward white, deep darkens ~30% toward black. onMark picks dark or
     light text by the mark's own luminance, since an arbitrary hue (unlike
     the five presets, all mid-tone) can land anywhere from near-black to
     near-white. */
  function hexToRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var c = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return c.length === 1 ? '0' + c : c;
    }).join('');
  }
  function themeFromHex(hex) {
    var c = hexToRgb(hex);
    var hot = rgbToHex(c.r + (255 - c.r) * .3, c.g + (255 - c.g) * .3, c.b + (255 - c.b) * .3);
    var deep = rgbToHex(c.r * .7, c.g * .7, c.b * .7);
    var luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    var onMark = luminance > 0.6 ? '#1A1006' : '#FBF8F2';
    return { key: 'custom', label: 'Custom', mark: hex, hot: hot, deep: deep, onMark: onMark };
  }

  var savedThemeKey = null, savedCustomHex = null;
  try {
    savedThemeKey = localStorage.getItem(THEME_KEY);
    savedCustomHex = localStorage.getItem(THEME_CUSTOM_KEY);
  } catch (e) { /* storage may be blocked */ }
  var savedTheme = THEMES.filter(function (t) { return t.key === savedThemeKey; })[0];
  if (!savedTheme && savedThemeKey === 'custom' && savedCustomHex) savedTheme = themeFromHex(savedCustomHex);
  if (savedTheme) applyTheme(savedTheme);

  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'theme-fab';
  fab.setAttribute('aria-label', 'Choose theme colour');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML =
    '<svg viewBox="0 0 20 20" aria-hidden="true">' +
      '<circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M10 3v2.2M10 14.8V17M17 10h-2.2M5.2 10H3M15.1 4.9l-1.6 1.6M6.5 13.5l-1.6 1.6M15.1 15.1l-1.6-1.6M6.5 6.5L4.9 4.9" ' +
        'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>';

  var panel = document.createElement('div');
  panel.className = 'theme-panel';
  panel.innerHTML =
    '<span class="theme-panel__label">Theme colour</span>' +
    '<div class="theme-swatches"></div>';
  var swatchesWrap = $('.theme-swatches', panel);

  THEMES.forEach(function (theme) {
    var isActive = theme.key === (savedThemeKey || 'amber');
    var swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'theme-swatch' + (isActive ? ' is-active' : '');
    swatch.style.background = theme.mark;
    swatch.setAttribute('aria-label', theme.label);
    swatch.addEventListener('click', function () {
      applyTheme(theme);
      try { localStorage.setItem(THEME_KEY, theme.key); } catch (e) { /* storage may be blocked */ }
      $$('.theme-swatch', swatchesWrap).forEach(function (s) { s.classList.remove('is-active'); });
      swatch.classList.add('is-active');
    });
    swatchesWrap.appendChild(swatch);
  });

  var wheelSwatch = document.createElement('label');
  wheelSwatch.className = 'theme-swatch theme-swatch--wheel' + (savedThemeKey === 'custom' ? ' is-active' : '');
  wheelSwatch.setAttribute('aria-label', 'Custom colour, opens a colour wheel');
  var wheelInput = document.createElement('input');
  wheelInput.type = 'color';
  wheelInput.value = (savedThemeKey === 'custom' && savedCustomHex) ? savedCustomHex : '#FFA54A';
  wheelInput.addEventListener('input', function () {
    var theme = themeFromHex(wheelInput.value);
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, 'custom');
      localStorage.setItem(THEME_CUSTOM_KEY, wheelInput.value);
    } catch (e) { /* storage may be blocked */ }
    $$('.theme-swatch', swatchesWrap).forEach(function (s) { s.classList.remove('is-active'); });
    wheelSwatch.classList.add('is-active');
  });
  wheelSwatch.appendChild(wheelInput);
  swatchesWrap.appendChild(wheelSwatch);

  document.body.appendChild(panel);
  document.body.appendChild(fab);

  fab.addEventListener('click', function () {
    var open = panel.classList.toggle('is-open');
    fab.classList.toggle('is-on', open);
    fab.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('is-open') && !panel.contains(e.target) && !fab.contains(e.target)) {
      panel.classList.remove('is-open');
      fab.classList.remove('is-on');
      fab.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      panel.classList.remove('is-open');
      fab.classList.remove('is-on');
      fab.setAttribute('aria-expanded', 'false');
      fab.focus();
    }
  });

  /* ------------------------------------------------------- QQ RADAR HOVER */
  /* service-quantitative-qualitative-research.html only. Six invisible pie-
     slice <path> wedges sit over the chart, one per axis, each carrying the
     same data-row index as its spoke, its label, and the matching row in
     both (now visually hidden) comparison-table columns. Hovering a wedge
     toggles .is-active on every element sharing that index, scoped to
     .qq-compare so this can't collide with an unrelated data-row elsewhere
     on the page, and fills the chart's own center tip with that axis's
     label plus both columns' values — read live off the hidden table's text
     rather than duplicated here, so the table stays the one source of truth
     (and still what a screen reader announces). */
  var radar = $('[data-radar]');
  if (radar) {
    var qqCompare = radar.closest('.qq-compare');
    var qqWedges = $$('.qq-radar__wedge', radar);
    var qqSetActive = function (idx, on) {
      $$('.qq-compare [data-row="' + idx + '"]').forEach(function (el) {
        el.classList.toggle('is-active', on);
      });
    };
    var qqTip = $('[data-radar-tip]', radar);
    var qqTipLabel = qqTip && $('[data-tip-label]', qqTip);
    var qqTipQuant = qqTip && $('[data-tip-quant]', qqTip);
    var qqTipQual = qqTip && $('[data-tip-qual]', qqTip);
    qqWedges.forEach(function (w) {
      var idx = w.getAttribute('data-row');
      var axisLabel = $('.qq-radar__label[data-row="' + idx + '"]', radar);
      var quantVal = $('.qq-compare__col:not(.qq-compare__col--qual) [data-row="' + idx + '"] dd', qqCompare);
      var qualVal = $('.qq-compare__col--qual [data-row="' + idx + '"] dd', qqCompare);
      w.addEventListener('mouseenter', function () {
        qqSetActive(idx, true);
        if (!qqTip) return;
        if (qqTipLabel && axisLabel) qqTipLabel.textContent = axisLabel.textContent;
        if (qqTipQuant && quantVal) qqTipQuant.textContent = quantVal.textContent;
        if (qqTipQual && qualVal) qqTipQual.textContent = qualVal.textContent;
        qqTip.classList.add('is-visible');
      });
      w.addEventListener('mouseleave', function () {
        qqSetActive(idx, false);
        if (qqTip) qqTip.classList.remove('is-visible');
      });
    });
  }

  /* ---------------------------------------------------------- CLIENTS REEL */
  /* Trades vertical scroll for horizontal reveal, across the two rows
     data-clients-track now marks (2026-08-19; was one). The pin wrapper is
     made exactly as tall as the LONGER row's own overflow plus one viewport,
     so the sticky inner frame stays pinned for precisely as long as it takes
     that row to travel its full width — one scrolled pixel moves it one
     pixel, and the instant both rows clear, the pin's height runs out and the
     page scrolls on to Services under its own steam. No IO, no timer: it is
     a pure function of scroll position, recomputed on resize.

     Rows alternate direction — even-indexed rows travel right to left, odd
     left to right — and both start peeked rather than flush: a sliver of the
     next card is already cropped at the edge the moment this section is
     first reached, so the row reads as mid-scroll from frame one instead of
     announcing itself only once the reader starts scrolling. Each row ends
     flush and clean at progress 1 regardless of where it started.

     Opts out below 860px (sticky plus horizontal-scroll-jacking over touch
     input is unreliable, and mobile viewport height itself shifts as browser
     chrome shows/hides mid-gesture) and under prefers-reduced-motion. Either
     way .clients-pin stays a plain passthrough and every .clients row renders
     as the ordinary wrapped grid the CSS already gives it — the reel is
     strictly on top of a page that reads correctly without it. */
  var clientsPin = $('[data-clients-pin]');
  if (clientsPin) {
    var clientsSticky = $('.clients-pin__sticky', clientsPin);
    var clientsRows = $$('[data-clients-track]', clientsPin).map(function (track, i) {
      return { track: track, sign: i % 2 === 0 ? 1 : -1, max: 0, peek: 0 };
    });
    var clientsShared = 0;   /* the longer row's max, drives the pin's height */
    var clientsTop = 0;      /* the sticky frame's `top`, centred in the viewport */

    var layoutClients = function () {
      /* .clients wraps by default (see CSS), so its scrollWidth at rest is
         just the container width, not the true single-row width — forcing
         nowrap before measuring is what makes that number real. Left in place
         when the reel activates; cleared to fall back to the CSS wrap rule
         when it does not. */
      clientsRows.forEach(function (row) {
        row.track.style.flexWrap = 'nowrap';
        row.track.style.width = 'max-content';
      });
      var fits = !reduced && window.innerWidth >= 860 &&
        clientsRows.every(function (row) { return row.track.scrollWidth > clientsSticky.clientWidth; });
      clientsPin.classList.toggle('is-pinned', fits);
      if (!fits) {
        clientsRows.forEach(function (row) {
          row.track.style.flexWrap = '';
          row.track.style.width = '';
          row.track.style.transform = '';
          row.max = 0;
        });
        clientsSticky.style.top = '';
        clientsPin.style.height = '';
        clientsShared = 0;
        return;
      }
      clientsRows.forEach(function (row) {
        row.max = row.track.scrollWidth - clientsSticky.clientWidth;
        var card = $('.client-cell', row.track);
        /* The peek is a fraction of one card's own width, not a flat pixel
           count, so it scales sanely from the 134px mobile fallback card up
           to the 400px desktop one — a flat value tuned for one would either
           vanish or swallow the other. */
        row.peek = card ? card.getBoundingClientRect().width * 0.35 : 0;
      });
      clientsShared = Math.max.apply(null, clientsRows.map(function (row) { return row.max; }));
      /* Centred, not flush under the header (client request, 2026-08-19). The
         stuck DURATION only ever depends on wrapperHeight - stickyHeight, so
         moving `top` off 0 changes nothing about the height formula below —
         it only shifts *when* the stuck window opens, which updateClients'
         progress formula corrects for via clientsTop. */
      clientsTop = Math.max(0, (window.innerHeight - clientsSticky.offsetHeight) / 2);
      clientsSticky.style.top = clientsTop + 'px';
      clientsPin.style.height = (clientsShared + clientsSticky.offsetHeight) + 'px';
    };

    var updateClients = function () {
      if (!clientsShared) return;
      var progress = clamp((clientsTop - clientsPin.getBoundingClientRect().top) / clientsShared, 0, 1);
      clientsRows.forEach(function (row) {
        /* sign > 0 (right to left): -(peek + p*(max-peek)) runs -peek -> -max.
           sign < 0 (left to right): -(max-peek)*(1-p) runs -(max-peek) -> 0.
           Both start peek pixels short of their row's own flush position and
           land exactly flush at p=1, however p=1 was reached — the two rows
           don't need matching widths for this to land clean on both. */
        var tx = row.sign > 0
          ? -(row.peek + progress * (row.max - row.peek))
          : -(row.max - row.peek) * (1 - progress);
        row.track.style.transform = 'translateX(' + tx + 'px)';
      });
    };

    layoutClients();
    updateClients();
    window.addEventListener('scroll', updateClients, { passive: true });

    var clientsRT;
    window.addEventListener('resize', function () {
      clearTimeout(clientsRT);
      clientsRT = setTimeout(function () { layoutClients(); updateClients(); }, 160);
    }, { passive: true });

    /* The logos carry loading="lazy" and no width/height attributes, so the
       measurement above runs before most of the twenty-four have decoded —
       scrollWidth reads close to 0 for anything still pending, which can lock
       in fits:false permanently with no resize event to ever correct it.
       Re-laying out once every image has settled (loaded or errored to the
       text fallback) catches that; .complete is already true for anything
       cached, so this is a no-op there. */
    var clientsImgs = $$('.client-logo', clientsPin).filter(function (img) { return !img.complete; });
    var clientsPending = clientsImgs.length;
    if (clientsPending) {
      clientsImgs.forEach(function (img) {
        var settled = function () {
          img.removeEventListener('load', settled);
          img.removeEventListener('error', settled);
          if (--clientsPending <= 0) { layoutClients(); updateClients(); }
        };
        img.addEventListener('load', settled);
        img.addEventListener('error', settled);
      });
    }
  }

  /* ------------------------------------------------------- DATA VIEW TOGGLE */
  /* service-data-visualisation.html's Chart/Table pair. Generic on purpose —
     $$('[data-view-toggle]') so a later page can reuse the same markup
     contract (a .datademo__seg per view, a [data-view-panel] per view)
     without needing its own JS. */
  $$('[data-view-toggle]').forEach(function (wrap) {
    var segs = $$('.datademo__seg', wrap);
    var panels = $$('[data-view-panel]', wrap);
    segs.forEach(function (seg) {
      seg.addEventListener('click', function () {
        var view = seg.getAttribute('data-view');
        segs.forEach(function (s) {
          var on = s === seg;
          s.classList.toggle('is-active', on);
          s.setAttribute('aria-selected', String(on));
        });
        panels.forEach(function (p) {
          p.hidden = p.getAttribute('data-view-panel') !== view;
        });
      });
    });
  });

  /* -------------------------------------------------------- TOKEN PLAYGROUND */
  /* service-design-systems.html's "change a token, change everything" demo.
     Each [data-token] group sets its own CSS custom property directly on
     .tokendemo__preview; every sample component reads that property in CSS,
     so one click updates all of them at once — which is the entire point
     being demonstrated, not just described. */
  $$('[data-token-demo]').forEach(function (wrap) {
    var preview = $('.tokendemo__preview', wrap);
    if (!preview) return;
    $$('[data-token]', wrap).forEach(function (group) {
      var prop = group.getAttribute('data-token');
      var btns = $$('[data-value]', group);
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          preview.style.setProperty(prop, btn.getAttribute('data-value'));
          btns.forEach(function (b) {
            var on = b === btn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
          });
        });
      });
    });
  });

  /* ---------------------------------------------------- CONFIDENCE DEMO */
  /* service-ux-for-ai-product.html's "Anatomy of an interaction users
     trust". Regenerate cycles through four real confidence readings from
     the source PDF (88/74/61/52); the suggestion and reasoning hold steady
     through the first three (only the signal changes — that's the point),
     then genuinely swap to a deferred-to-a-human state at the lowest
     reading, matching the source's "graceful low confidence" behaviour. */
  $$('[data-confidence-demo]').forEach(function (wrap) {
    var states = [
      {
        pct: 88, label: 'High confidence', tier: 'hi',
        suggestion: 'Route this ticket to Billing — most likely a double charge.',
        reasons: ['Mentions charged twice', 'Recent payment error on account', 'Similar tickets resolved by Billing'],
        caption: 'High confidence — but the user can still override before it routes.'
      },
      {
        pct: 74, label: 'Moderate confidence', tier: 'mid',
        suggestion: 'Route this ticket to Billing — most likely a double charge.',
        reasons: ['Mentions charged twice', 'Recent payment error on account', 'Similar tickets resolved by Billing'],
        caption: 'Still actionable — worth a glance before it routes automatically.'
      },
      {
        pct: 61, label: 'Low confidence', tier: 'low',
        suggestion: 'Route this ticket to Billing — most likely a double charge.',
        reasons: ['Mentions charged twice', 'Recent payment error on account', 'Similar tickets resolved by Billing'],
        caption: 'Low enough that a person should confirm before this goes anywhere.'
      },
      {
        pct: 52, label: 'Very low confidence', tier: 'degraded',
        suggestion: 'Not confident enough to route automatically — flagged for a person to review.',
        reasons: [],
        caption: 'Graceful low confidence — the interface says so, and defers to a human.'
      }
    ];
    var regenBtn = $('[data-regenerate]', wrap);
    var badge = $('[data-badge]', wrap);
    var pctEl = $('[data-pct]', wrap);
    var labelEl = $('[data-label]', wrap);
    var barfill = $('[data-barfill]', wrap);
    var suggestionEl = $('[data-suggestion]', wrap);
    var reasoning = $('[data-reasoning]', wrap);
    var reasonsEl = $('[data-reasons]', wrap);
    var captionEl = $('[data-caption]', wrap);
    if (!regenBtn) return;
    var i = 0;
    var tiers = ['hi', 'mid', 'low', 'degraded'];
    function render() {
      var s = states[i];
      pctEl.textContent = s.pct + '%';
      labelEl.textContent = s.label;
      captionEl.textContent = s.caption;
      suggestionEl.textContent = s.suggestion;
      tiers.forEach(function (t) {
        badge.classList.toggle('confdemo__badge--' + t, t === s.tier);
        barfill.classList.toggle('confdemo__barfill--' + t, t === s.tier);
      });
      barfill.style.setProperty('--pct', s.pct / 100);
      reasoning.classList.toggle('is-empty', s.reasons.length === 0);
      reasonsEl.innerHTML = '';
      s.reasons.forEach(function (r) {
        var li = document.createElement('li');
        li.textContent = r;
        reasonsEl.appendChild(li);
      });
    }
    regenBtn.addEventListener('click', function () {
      i = (i + 1) % states.length;
      render();
    });
  });

  /* ------------------------------------------------------- AUTO CAROUSEL */
  /* service-usability-testing.html's #case-studies cover cards (client
     request, 2026-08-21) — auto-advances one card every 4.5s, plus manual
     prev/next arrows, both routed through goTo() so whichever one last
     moved the track, the other stays in sync via the same state (current).
     Loops in both directions rather than stopping at an end, and every step
     is an instant cut, not an animated scroll (client request, same day:
     "no front and back"; an animated version was tried and dropped — see
     the last paragraph). The dot indicators from the original build were
     removed later (client request, 2026-08-24: match the homepage
     testimonial carousel's arrows-only nav) — goTo() still tracks `current`
     for the arrows and the auto-timer to share, it just has no dots left to
     paint.

     Stop positions come from each card's own offsetLeft, clamped to the
     track's real (scrollWidth - clientWidth) and then deduplicated, rather
     than one stop per card. With close to three cards visible at once here,
     the browser has nowhere left to scroll once the third card reaches the
     end — its own offsetLeft and the fourth card's both clamp to the same
     maxScroll value, so the pair only ever produces one distinct position
     between them, not two. Building the stop list from what's actually
     reachable (instead of assuming card-count == stop-count) means current
     and scrollLeft can never disagree about how many stops exist, and every
     stop, including the last, is guaranteed reachable in one jump.

     scrollTo({behavior:'smooth'}) and a hand-rolled requestAnimationFrame
     version were both tried first and both verified live to silently never
     complete on this track — scrollLeft never left its start value under
     either, while a plain scrollLeft assignment to the same target lands
     immediately. rAF callbacks are throttled to near-zero in a
     backgrounded/inactive tab, which native smooth-scroll rides on too; a
     visitor who never switches away wouldn't hit this, but nothing here
     depends on the tab staying focused, so instant stepping is the version
     that's actually reliable. The timer pauses while the visitor's pointer
     or keyboard focus is inside the carousel, so it never fights a manual
     scroll, a drag, or a tab-through. */
  $$('[data-auto-carousel]').forEach(function (track) {
    var carousel = track.closest('.covercarousel') || track.parentElement;
    var cards = $$('.covercard', track);
    if (!cards.length) return;
    var prevBtn = $('[data-carousel-prev]', carousel);
    var nextBtn = $('[data-carousel-next]', carousel);

    var maxScroll = track.scrollWidth - track.clientWidth;
    var positions = [];
    cards.forEach(function (c) {
      var left = Math.min(c.offsetLeft - track.offsetLeft, maxScroll);
      if (!positions.length || left - positions[positions.length - 1] > 2) positions.push(left);
    });
    var n = positions.length;
    if (!n) return;

    var current = 0;
    function goTo(i) {
      current = (i + n) % n;
      track.scrollLeft = positions[current];
    }
    function step(dir) {
      goTo(current + dir);
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

    if (reduced) return;
    var paused = false;
    track.addEventListener('pointerenter', function () { paused = true; });
    track.addEventListener('pointerleave', function () { paused = false; });
    track.addEventListener('focusin', function () { paused = true; });
    track.addEventListener('focusout', function () { paused = false; });
    setInterval(function () {
      if (paused) return;
      step(1);
    }, 4500);
  });

})();
