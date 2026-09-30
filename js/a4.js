/* APATT site — design A4. Plain JS, no libraries.
   - Skin try-on (hover = try, click = choose, no scrolling). The chosen skin also picks which video set every clip plays (video/sNN/).
   - Clips: poster first (lazy), the video is fetched only when ▶ 再生 / 音を出す is pressed. ▶ 再生 = muted (motion only);
     sound only through 「音を出す」. Only one thing makes sound at a time. Leaving the screen stops it.
   - Every clip reads video/manifest.json per skin: events (the moment a button is pressed → hold + square + label + click),
     stages (APA-MIX 「いまここ」 arrow), zooms. See the comment at section 1.
   - APA-MIX tabs with BEFORE / AFTER (+ loudness match), the TRIM fader drawing, the gold scenes, the quick skin switch,
     the fixed top bar (sale band from window.APATT_SALE, folding menu), the folded MORE list.
   The page reads fine without JS (text and pictures; clips show nothing). */
(function () {
  'use strict';
  var root = document.documentElement;
  var SK = window.APATT_SKINS || [];
  var KEY = 'apatt-a4-skin';
  window.APATT_A4_OK = true;                 // the head script opens the skin gate by itself if this never runs
  // 260930 owner「ラベル貼っといてよ」: opened from this Mac (the private preview) → a fixed label so it is never taken for the public site.
  //   Only on 127.0.0.1 / localhost / *.localhost — never on the public address.
  if (/^(127\.0\.0\.1|localhost|\[::1\]|.*\.localhost)$/.test(location.hostname)) (function () {
    var lab = document.createElement('div');
    var d = new Date(document.lastModified || Date.now());
    lab.textContent = '確認用・まだ公開していません(このMacだけ) ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) + ' の版';
    lab.setAttribute('role', 'note');
    lab.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;padding:8px 14px;border-radius:999px;background:#d7263d;color:#fff;' +
      'font:700 13px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:.02em;box-shadow:0 4px 18px rgba(0,0,0,.35);pointer-events:none;max-width:calc(100vw - 24px)';
    (document.body || document.documentElement).appendChild(lab);
  })();
  var glideTo = null;                        // set in 5a (the smooth in-page move), used by the skin gate
  var SKIN_DIR = 'assets/v2/stills/skins/';
  var VIDEO_DIR = 'video/';
  var A4_AUDIO = 'audio/';
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  var hasIO = 'IntersectionObserver' in window;
  var chosen = typeof window.APATT_SKIN_CHOSEN === 'number' ? window.APATT_SKIN_CHOSEN : 2;
  var shown = chosen;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function db2g(db) { return Math.pow(10, db / 20); }
  function g2db(g) { return g > 1e-9 ? 20 * Math.log(g) / Math.LN10 : -200; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function onView(node, cb, opt) {
    if (!node) return;
    if (!hasIO) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting, e); }); }, opt || {}).observe(node);
  }
  var jsonCache = {};
  function getJSON(url) {
    if (!jsonCache[url]) {
      jsonCache[url] = fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      jsonCache[url].catch(function () {});
    }
    return jsonCache[url];
  }
  // the first number found under this key anywhere in the object (the audio list is made by someone else: be forgiving)
  function findNum(o, key, depth) {
    if (!o || typeof o !== 'object' || (depth || 0) > 5) return null;
    if (typeof o[key] === 'number') return o[key];
    for (var k in o) { var r = findNum(o[k], key, (depth || 0) + 1); if (r != null) return r; }
    return null;
  }
  function firstNum(o, keys) {
    if (!o) return null;
    for (var i = 0; i < keys.length; i++) { var v = o[keys[i]]; if (typeof v === 'number' && isFinite(v)) return v; if (typeof v === 'string' && v !== '' && isFinite(+v)) return +v; }
    return null;
  }

  var ICON = {
    snd: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h9v9h-9z" fill="currentColor"/></svg>',
    again: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.6-3.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.6 1.8v3.4H9.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ================= 0) Only one thing makes sound at a time ================= */
  var Motion = { trimStop: null };                   // the TRIM meters (section 5) register their stop here
  var Sound = {
    cur: null,
    claim: function (o) { if (this.cur && this.cur !== o) { var c = this.cur; this.cur = null; try { c.silence(); } catch (e) {} } this.cur = o; },
    release: function (o) { if (this.cur === o) this.cur = null; }
  };

  /* ================= 0b) Web Audio (BEFORE / AFTER and the TRIM riff) =================
     The AudioContext is made inside the first press of a sound button (iOS needs that). Never before. */
  var AE = (function () {
    var ctx = null, master = null, bufs = {}, fmt = null;
    function ensure() {
      if (!ctx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        try { ctx = new C(); } catch (e) { return null; }
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
      }
      if (ctx.state !== 'running' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function pickFmt() {
      var a = document.createElement('audio');
      return a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'm4a' : 'mp3';
    }
    function decode(ab) {
      return new Promise(function (res, rej) {
        var p;
        try { p = ctx.decodeAudioData(ab, res, rej); } catch (e) { rej(e); return; }
        if (p && p.then) p.then(res, rej);
      });
    }
    function load(path) {
      if (bufs[path]) return bufs[path];
      fmt = fmt || pickFmt();
      var get = function (f) {
        return fetch(path + '.' + f).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode);
      };
      bufs[path] = get(fmt).catch(function () { return get(fmt === 'm4a' ? 'mp3' : 'm4a'); });
      bufs[path].catch(function () { delete bufs[path]; });
      return bufs[path];
    }
    // 260930: a player that is not in use gives its decoded sound back (5 tabs × 3 versions would be ~200 MB on a phone)
    function drop(path) { delete bufs[path]; }
    return { ensure: ensure, load: load, drop: drop, ctx: function () { return ctx; }, master: function () { return master; } };
  })();

  // Versions of the same excerpt play together (sample-aligned); the weights pick what you hear.
  function Mixer(tracks) {
    this.t = {};
    for (var id in tracks) this.t[id] = { path: tracks[id], buf: null, g: null, src: null, lm: 0 };
    this.w = {}; this.lm = false; this.playing = false; this.t0 = 0; this.pos = 0; this.out = null; this.L = 0;
  }
  Mixer.prototype._graph = function () {
    var ctx = AE.ctx();
    if (!this.out) { this.out = ctx.createGain(); this.out.gain.value = 0; this.out.connect(AE.master()); }
    for (var id in this.t) { var tr = this.t[id]; if (!tr.g) { tr.g = ctx.createGain(); tr.g.gain.value = 0; tr.g.connect(this.out); } }
  };
  Mixer.prototype._len = function () {
    var L = 0;
    for (var id in this.t) { var b = this.t[id].buf; if (b) L = L ? Math.min(L, b.duration) : b.duration; }
    this.L = L;
  };
  Mixer.prototype.load = function (ids) {
    var self = this;
    return Promise.all(ids.map(function (id) {
      var tr = self.t[id];
      return AE.load(tr.path).then(function (b) { tr.buf = b; self._len(); });
    }));
  };
  Mixer.prototype._src = function (id, at) {
    var ctx = AE.ctx(), tr = this.t[id];
    if (!tr.buf || !this.L) return;
    if (tr.src) { try { tr.src.stop(); } catch (e) {} tr.src.disconnect(); tr.src = null; }
    var s = ctx.createBufferSource(); s.buffer = tr.buf;
    var p = (((at - this.t0) % this.L) + this.L) % this.L;
    s.loop = true; s.loopStart = 0; s.loopEnd = this.L;
    s.connect(tr.g); s.start(at, p);
    tr.src = s;
  };
  Mixer.prototype._target = function (id) { var tr = this.t[id]; return (this.w[id] || 0) * (this.lm ? db2g(tr.lm) : 1); };
  Mixer.prototype._gain = function (id, fade) {
    var ctx = AE.ctx(), tr = this.t[id]; if (!ctx || !tr.g) return;
    var now = ctx.currentTime, g = tr.g.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(this._target(id), now + (fade || 0.04));
  };
  Mixer.prototype.mix = function (w, fade) { this.w = w; if (!AE.ctx()) return; this._graph(); for (var id in this.t) this._gain(id, fade); };
  Mixer.prototype.setLM = function (on) { this.lm = on; if (AE.ctx() && this.out) for (var id in this.t) this._gain(id, 0.08); };
  Mixer.prototype.position = function () {
    if (!this.playing || !this.L) return this.pos;
    var t = AE.ctx().currentTime - this.t0; if (t < 0) t = 0;     // the ~50 ms before the sources start: stay at the start, not the end
    return ((t % this.L) + this.L) % this.L;
  };
  Mixer.prototype.start = function (p) {
    var ctx = AE.ensure(); if (!ctx || !this.L) return false;
    this._graph();
    var at = ctx.currentTime + 0.05;
    this.t0 = at - (p || 0);
    for (var id in this.t) if (this.t[id].buf) this._src(id, at);
    var og = this.out.gain; og.cancelScheduledValues(ctx.currentTime); og.setValueAtTime(0, ctx.currentTime); og.setValueAtTime(0, at); og.linearRampToValueAtTime(1, at + 0.03);
    this.playing = true;
    for (id in this.t) this._gain(id, 0.01);
    return true;
  };
  // 260930 owner「波形クリックしたらどこにでも飛べるように」: jump while playing (a 30 ms dip, the same place in every version)
  Mixer.prototype.seek = function (p) {
    var ctx = AE.ctx();
    if (!ctx || !this.playing || !this.L || !this.out) { this.pos = p; return; }
    var now = ctx.currentTime, og = this.out.gain, at = now + 0.03;
    og.cancelScheduledValues(now); og.setValueAtTime(og.value, now); og.linearRampToValueAtTime(0, at);
    for (var id in this.t) { var tr = this.t[id]; if (tr.src) { try { tr.src.stop(at + 0.005); } catch (e) {} tr.src = null; } }
    this.t0 = at - p;
    for (id in this.t) if (this.t[id].buf) this._src(id, at);
    og.linearRampToValueAtTime(1, at + 0.03);
  };
  Mixer.prototype.stop = function () {
    var ctx = AE.ctx(); if (!ctx || !this.playing) { this.playing = false; return; }
    this.pos = this.position(); this.playing = false;
    var now = ctx.currentTime, og = this.out.gain;
    og.cancelScheduledValues(now); og.setValueAtTime(og.value, now); og.linearRampToValueAtTime(0, now + 0.04);
    for (var id in this.t) { var tr = this.t[id]; if (tr.src) { try { tr.src.stop(now + 0.06); } catch (e) {} tr.src = null; } }
  };

  /* ================= 0c) The lists (made by the recording / audio people) ================= */
  var VMAN = null;                                   // video/manifest.json → {clips:{id:{w,h,dur,skins,note}}}
  var vmanReady = getJSON(VIDEO_DIR + 'manifest.json').then(function (m) { VMAN = (m && m.clips) || m || {}; }, function () { VMAN = {}; });
  var audioList = null;                               // audio/audio.json (LUFS-I, peaks, display_offset_db …)
  function a4Audio() { return audioList || (audioList = getJSON(A4_AUDIO + 'audio.json')); }
  // 音の数字は audio/audio.json だけから読む(EDM の曲の組も audio/ に移した。../assets/v2 の目録は読まない)
  function audioMeta(path) {
    var name = path.split('/').pop();
    return a4Audio().then(function (j) {
      var f = (j && j.files && j.files[name]) || (j && j[name]) || null;
      if (!f && j && Array.isArray(j.files)) j.files.forEach(function (x) { if (x && (x.name === name || x.id === name)) f = x; });
      var lufs = firstNum(f, ['lufs_i_file', 'lufs_in_file', 'lufs_i', 'lufs', 'LUFS-I', 'integrated_lufs', 'lufs_integrated', 'lufsI']);
      return { lufs: lufs, raw: f, list: j };
    });
  }
  // the files are ready only when audio/audio.json lists them
  function audioReady(path) { return listed(path); }
  var peaksCache = {};
  // two shapes of peaks: assets/v2 = {max[], min[], rms[] (linear), duration_s}; audio/ = {hop_s, n, peak_db[], rms_db[] (dBFS of the file)}
  function normPeaks(p) {
    if (!p) return p;
    if (!p.max && p.peak_db) {
      p.max = p.peak_db.map(function (d) { return db2g(d); });
      p.min = p.max.map(function (x) { return -x; });
      if (p.rms_db && !p.rms) p.rms = p.rms_db.map(function (d) { return db2g(d); });
      if (!p.duration_s && p.hop_s) p.duration_s = (p.n || p.peak_db.length) * p.hop_s;
    }
    return p;
  }
  // A4 files are asked for only when audio/audio.json mentions them (no 404s in the console while the audio is being made)
  function listed(path) {
    var name = path.split('/').pop();
    return a4Audio().then(function (j) { return JSON.stringify(j).indexOf(name) >= 0; }, function () { return false; });
  }
  function peaks(path) {
    if (!peaksCache[path]) {
      peaksCache[path] = listed(path).then(function (ok) {
        if (!ok) throw new Error('not listed');
        return fetch(path + '.peaks.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(normPeaks);
      });
      peaksCache[path].catch(function () {});
    }
    return peaksCache[path];
  }

  /* ================= 1) Clips: poster → ▶ 再生 (muted) / 音を出す ================= */
  /* What the page reads from video/manifest.json (made by the recording people):
       clips.<id>.w / h / dur                     the frame size (the box keeps this shape while loading)
       clips.<id>.skins = [0,1,…]                 (old form) which skins exist, or
       clips.<id>.skins.<NN> = {dur, events, stages, zooms, w?, h?}   per skin — NN may be "02" or "2"
         events: [{t, box:[x,y,w,h] (0–1 of the video), label}]   the moment a button is pressed
                 → Clip.focusEvent: video + sound stop, a square + the label (+ a click while sound is on) for FOCUS_MS, then on
         stages: [{t, y (0–1), row: ride|eq|apatt|s2|l2|done}]    which stage APA-MIX is deciding now
                 → Clip.applyStage: an arrow (no words) right of the video, at that y
         zooms:  [{t, end | dur, box:[x,y,w,h], scale?}]         optional: glide into a part of the video (an entry without box = back to full)
                 → Clip.applyZoom (events and the arrow follow the zoom)
       events / stages / zooms may also sit on clips.<id> itself (used for every skin that has none of its own). */
  var clips = [];
  var FOCUS_MS = 1200;                                // how long a press is held
  function num(x) { if (typeof x === 'number' && isFinite(x)) return x; if (typeof x === 'string' && x.trim() !== '' && isFinite(+x)) return +x; return null; }
  function skinsOf(c) {
    var sk = c && c.skins;
    if (Array.isArray(sk)) return sk.map(function (x) { return parseInt(x, 10); }).filter(function (x) { return isFinite(x); });
    if (sk && typeof sk === 'object') return Object.keys(sk).map(function (k) { return parseInt(k, 10); }).filter(function (x) { return isFinite(x); });
    return [];
  }
  function pickSkin(id, n) {
    var c = VMAN && VMAN[id]; if (!c) return null;
    var sk = skinsOf(c);
    if (!sk.length) return null;
    if (sk.indexOf(n) >= 0) return n;
    if (sk.indexOf(2) >= 0) return 2;
    return sk[0];
  }
  // a box as [x,y,w,h] in 0–1 of the video (also {x,y,w,h}; pixel values are divided by the clip's w/h)
  function cleanBox(b, W, H) {
    if (b && !Array.isArray(b) && typeof b === 'object') b = [b.x, b.y, b.w, b.h];
    if (!Array.isArray(b) || b.length < 4) return null;
    var v = b.slice(0, 4).map(num);
    if (v.some(function (x) { return x == null; })) return null;
    if (Math.max(v[0] + v[2], v[1] + v[3]) > 1.5 && W && H) v = [v[0] / W, v[1] / H, v[2] / W, v[3] / H];
    var x = clamp(v[0], 0, 1), y = clamp(v[1], 0, 1);
    return [x, y, clamp(v[2], 0, 1 - x), clamp(v[3], 0, 1 - y)];
  }
  function skinMeta(id, s) {
    var c = (VMAN && VMAN[id]) || {}, sk = c.skins, m = null;
    if (s != null && sk && !Array.isArray(sk) && typeof sk === 'object') m = sk[pad(s)] || sk[String(s)] || null;
    if (!m || typeof m !== 'object') m = {};
    var W = num(m.w) || num(c.w), H = num(m.h) || num(c.h);
    function list(k) { return Array.isArray(m[k]) ? m[k] : Array.isArray(c[k]) ? c[k] : []; }
    var events = list('events').map(function (e) {
      if (!e || num(e.t) == null) return null;
      // click: false = the pointer only rests there (no press) → no click sound
      // hold: false (260930) = do not stop: a click only, or (with a label) a caption that stays up for dur seconds while the video goes on
      return { t: num(e.t), box: cleanBox(e.box, W, H), label: String(e.label == null ? '' : e.label).slice(0, 48), click: e.click !== false,
               hold: e.hold !== false, dur: num(e.dur) || 3.5 };
    }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    var stages = list('stages').map(function (e) {
      if (!e || num(e.t) == null || num(e.y) == null) return null;
      return { t: num(e.t), y: clamp(num(e.y), 0, 1), row: String(e.row || '') };
    }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    var zs = list('zooms').map(function (z) {
      if (!z || num(z.t) == null) return null;
      var end = num(z.end) != null ? num(z.end) : num(z.dur) != null ? num(z.t) + num(z.dur) : null;
      return { t: num(z.t), end: end, box: cleanBox(z.box || z.rect, W, H), scale: num(z.scale) };
    }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    zs.forEach(function (z, i) { if (z.end == null) z.end = i + 1 < zs.length ? zs[i + 1].t : Infinity; });
    return { w: W, h: H, dur: num(m.dur) || num(c.dur), events: events, stages: stages, zooms: zs.filter(function (z) { return z.box && z.end > z.t; }) };
  }
  function clipUrl(id, s, ext) { return VIDEO_DIR + 's' + pad(s) + '/' + id + '.' + ext; }
  function isFull(v) { return document.fullscreenElement === v || document.webkitFullscreenElement === v || !!v.webkitDisplayingFullscreen; }

  // the little click played with a press (Web Audio; only while that clip's sound is on)
  function clickSound() {
    var ctx = AE.ctx(); if (!ctx) return;
    if (ctx.state !== 'running' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    var t = ctx.currentTime + 0.01, out = AE.master();
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.035);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
      var n = Math.max(1, Math.round(ctx.sampleRate * 0.012)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g2 = ctx.createGain();
      s.buffer = b; hp.type = 'highpass'; hp.frequency.value = 2500; g2.gain.value = 0.32;
      s.connect(hp); hp.connect(g2); g2.connect(out); s.start(t);
    } catch (e) {}
  }

  function Clip(fig) {
    var self = this;
    this.fig = fig; this.id = fig.getAttribute('data-clip'); this.ambient = fig.hasAttribute('data-ambient');
    this.name = fig.getAttribute('data-name') || '';
    this.skin = null; this.v = null; this.state = 'idle'; this.sounding = false; this.visible = false; this.failed = false;
    this.mt = { events: [], stages: [], zooms: [] }; this.evDone = []; this.focusing = false; this.fxTimer = 0; this.raf = 0; this.lastT = 0;
    this.zoomNow = null; this.zt = null;
    fig.innerHTML = '';
    var stage = this.stageEl = el('div', 'clip-stage');
    var box = this.box = el('div', 'clip-box');
    box.style.setProperty('--ar', fig.getAttribute('data-ar') || '1280/204');
    this.shape();
    this.img = el('img', 'clip-poster'); this.img.alt = ''; this.img.decoding = 'async'; this.img.loading = 'lazy'; this.img.hidden = true;
    this.soon = el('div', 'clip-soon', '<b>準備中</b><span></span>');
    $('span', this.soon).textContent = this.name ? this.name + 'の映像を用意しています' : '映像を用意しています';
    this.ring = el('div', 'fx-ring');                  // the square around what was pressed (inside the video box)
    this.pb = el('button', 'pill-blue'); this.pb.type = 'button';
    // 再生中の右下の「一時停止」。▶ 再生が消えてもフォーカスはここへ移る(キーボード・読み上げでも止められる)
    this.cb = el('button', 'clip-ctl', ICON.pause + '<span class="ctl-t">一時停止</span>'); this.cb.type = 'button';
    box.appendChild(this.img); box.appendChild(this.soon); box.appendChild(this.ring); box.appendChild(this.pb); box.appendChild(this.cb);
    this.tag = el('div', 'fx-tag'); this.tag.setAttribute('aria-hidden', 'true');
    this.cap = el('div', 'fx-tag fx-cap'); this.cap.setAttribute('aria-hidden', 'true');   // 260930: the caption that does not stop the video   // the label (may hang above / below a thin strip)
    this.arrow = el('div', 'stage-arrow', '<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false"><path d="M2.5 15 19 4.5v6.3h8.5v8.4H19v6.3z"/></svg>');
    this.cap.style.display = 'none';
    stage.appendChild(box); stage.appendChild(this.tag); stage.appendChild(this.cap); stage.appendChild(this.arrow);
    this.live = el('p', 'sr'); this.live.setAttribute('aria-live', 'polite');
    if (this.ambient) fig.classList.add('is-ambient');
    var bar = this.bar = el('div', 'clip-bar');
    this.sb = el('button', 'snd'); this.sb.type = 'button';
    // data-nosound (the language clip): no sound button
    if (!fig.hasAttribute('data-nosound')) bar.appendChild(this.sb);
    // phones: a one-unit strip is small → 「大きく見る」 opens the same clip full screen (still muted until 音を出す)
    // (FIRE WATCH: 「音を聞く」 only)
    this.fb = el('button', 'snd only-narrow', '大きく見る'); this.fb.type = 'button';
    if (!this.ambient) bar.appendChild(this.fb);
    this.fb.addEventListener('click', function () {
      if (self.skin == null) return;
      if (self.state !== 'play') self.play(false);
      var v = self.v; if (!v) return;
      try {
        if (v.requestFullscreen) { var p = v.requestFullscreen(); if (p && p.catch) p.catch(function () {}); }
        else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
      } catch (e) {}
    });
    fig.appendChild(stage); fig.appendChild(bar); fig.appendChild(this.live);
    this.placeCtl();
    this.owner = { silence: function () { self.mute(); } };
    this.pb.addEventListener('click', function (e) { e.stopPropagation(); self.play(false); });
    this.cb.addEventListener('click', function (e) { e.stopPropagation(); self.userStop(); });
    this.sb.addEventListener('click', function () { self.toggleSound(); });
    box.addEventListener('click', function (e) {
      if (e.target === self.pb || e.target === self.cb || self.state !== 'play' || !self.v) return;
      self.userStop();
    });
    fig.classList.add('is-soon');
    this.update();
  }
  Clip.prototype.meta = function () { return VMAN && VMAN[this.id]; };
  // a one-unit strip (wide) or the whole rack (tall): set from data-ar at once, again from the manifest (no size jump)
  Clip.prototype.shape = function () {
    var ar = (this.box.style.getPropertyValue('--ar') || '').split('/');
    this.fig.classList.toggle('is-strip', ar.length === 2 && +ar[0] / +ar[1] > 3);
    this.fig.classList.toggle('is-tall', ar.length === 2 && +ar[0] / +ar[1] < 1.6);
    this.placeCtl();
  };
  // the pause button sits in the bar under the video (over the video it covered the AUTO lamps and the numbers at the right end).
  // FIRE WATCH keeps it in the corner, shown on hover / focus only (its bar is 「音を聞く」 only).
  Clip.prototype.placeCtl = function () {
    if (!this.bar || !this.cb) return;
    var inBar = !this.ambient;
    var want = inBar ? this.bar : this.box;
    if (this.cb.parentNode !== want) want.appendChild(this.cb);
    this.cb.classList.toggle('in-bar', inBar);
  };
  Clip.prototype.render = function () {
    var s = pickSkin(this.id, chosen);
    if (s == null) {
      this.dropVideo(); this.skin = null; this.mt = skinMeta(this.id, null); this.evDone = [];
      this.fig.classList.add('is-soon'); this.img.hidden = true; this.update(); return;
    }
    this.fig.classList.remove('is-soon');
    if (s !== this.skin) {
      this.dropVideo();
      this.skin = s; this.failed = false;
      this.mt = skinMeta(this.id, s); this.evDone = this.mt.events.map(function () { return false; });
      this.fig.classList.toggle('has-stages', this.mt.stages.length > 0);
      this.img.src = clipUrl(this.id, s, 'jpg');
      this.img.alt = (this.name ? this.name + '。' : '') + 'APATT PRO の画面(スキン ' + ((SK[s] && SK[s].name) || '') + ')。▶ 再生で動きます';
      this.img.hidden = false;
    }
    if (this.mt.w && this.mt.h) this.box.style.setProperty('--ar', this.mt.w + '/' + this.mt.h);
    this.shape();
    this.update();
    if (this.ambient && this.visible) this.ambientGo();
  };
  Clip.prototype.dropVideo = function () {
    this.endFocus(false);
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.sounding) { this.sounding = false; Sound.release(this.owner); }
    if (this.v) { try { this.v.pause(); } catch (e) {} this.v.removeAttribute('src'); try { this.v.load(); } catch (e) {} this.v.remove(); this.v = null; }
    this.state = 'idle'; this.lastT = 0; this.zoomNow = null; this.zt = null;
    this.arrow.classList.remove('on'); cancelAnimationFrame(this.araf); this.araf = 0; this.ay = null; this.stageCur = null; this.hideCap();
  };
  Clip.prototype.ensureVideo = function () {
    if (this.v || this.skin == null) return this.v;
    var self = this, v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    v.preload = 'auto'; v.loop = this.ambient; v.disablePictureInPicture = true;
    // the manifest's note is a working note for the team (photo numbers, versions) → not read out on the page
    v.setAttribute('aria-label', (this.name ? this.name + 'の動画' : '動画') + '(APATT PRO の画面)');
    v.addEventListener('playing', function () { v.classList.add('on'); self.state = 'play'; self.update(); self.loop(); });
    v.addEventListener('pause', function () {
      if (self.focusing) return;                       // held on a press: still "playing" for the page
      if (!v.ended && (self.state === 'play' || self.state === 'loading')) { self.state = v.currentTime > 0.05 ? 'pause' : 'idle'; self.update(); }
      self.tick();
    });
    v.addEventListener('seeked', function () { if (!self.focusing) self.tick(); });
    v.addEventListener('ended', function () { self.endFocus(false); self.state = 'end'; if (self.sounding) { self.sounding = false; Sound.release(self.owner); } self.update(); });
    v.addEventListener('error', function () {
      if (!v.getAttribute('src')) return;
      self.endFocus(false);
      self.failed = true; self.state = 'idle'; if (self.sounding) { self.sounding = false; Sound.release(self.owner); }
      $('span', self.soon).textContent = '映像を読み込めませんでした';
      self.fig.classList.add('is-soon'); self.update();
    });
    v.src = clipUrl(this.id, this.skin, 'mp4');
    this.box.insertBefore(v, this.ring);
    this.v = v;
    return v;
  };

  /* --- watching the time: presses (events), the arrow (stages), zooms --- */
  Clip.prototype.loop = function () {
    var self = this;
    if (this.raf) return;
    var f = function () {
      self.raf = 0;
      var v = self.v; if (!v) return;
      self.tick();
      if (!v.paused && !v.ended) self.raf = requestAnimationFrame(f);
    };
    this.raf = requestAnimationFrame(f);
  };
  Clip.prototype.rewind = function (t) {
    this.hideCap();
    var ev = this.mt.events;
    for (var i = 0; i < ev.length; i++) this.evDone[i] = ev[i].t < t - 0.05;
  };
  Clip.prototype.tick = function () {
    var v = this.v; if (!v) return;
    var t = v.currentTime || 0;
    // started again / sought back. A looping clip (FIRE WATCH) holds its presses on the first pass only
    if (t < this.lastT - 0.25 && !this.ambient) this.rewind(t);
    this.lastT = t;
    this.applyZoom(t); this.applyStage(t);
    if (this.focusing || v.paused || !this.mt.events.length || isFull(v)) return;
    var ev = this.mt.events;
    for (var i = 0; i < ev.length; i++) {
      if (this.evDone[i]) continue;
      if (t + 0.005 < ev[i].t) break;                  // hold on the first frame at / after the press (the ripple is on it)
      if (t - ev[i].t > 0.6) { this.evDone[i] = true; continue; }   // jumped past it: don't hold a moment that is gone
      if (!ev[i].hold) { this.evDone[i] = true; this.softEvent(ev[i]); continue; }   // 260930: no stop — click / caption only
      this.focusEvent(i); break;
    }
  };
  Clip.prototype.focusEvent = function (i) {
    var self = this, v = this.v, ev = this.mt.events[i];
    this.evDone[i] = true;
    this.focusing = true;
    try { v.pause(); } catch (e) {}
    // hold the frame where it is (at most one frame late). No seek back to ev.t: a server without range requests
    // (python http.server) would restart the video from 0, and the difference can't be seen anyway.
    var t = v.currentTime || ev.t;
    this.lastT = t;
    this.applyZoom(t); this.applyStage(t);
    this.showFx(ev);
    if (this.sounding && ev.click) clickSound();
    clearTimeout(this.fxTimer);
    this.fxTimer = setTimeout(function () { self.endFocus(true); }, FOCUS_MS);
    this.update();
  };
  // 260930 owner「押すとか止めるとか丁寧に説明しなくていい・シームレスに・音は鳴り続けて・聴き比べられます、の吹き出しを1つ」:
  // a press that does not stop the video (the click sound only) / a caption in the usual label style that stays while the video plays
  Clip.prototype.softEvent = function (ev) {
    if (this.sounding && ev.click) clickSound();
    if (!ev.label) return;
    var W = this.box.clientWidth, H = this.box.clientHeight, cap = this.cap, self = this;
    if (!W || !H || !cap) return;
    cap.textContent = ev.label; cap.style.display = 'block'; cap.style.left = '0px'; cap.style.top = '0px';
    var tw = cap.offsetWidth, th = cap.offsetHeight, gap = 10, x = W / 2, yb = H * 0.12;
    if (ev.box) { var a = this.mapPt(ev.box[0], ev.box[1]), b = this.mapPt(ev.box[0] + ev.box[2], ev.box[1] + ev.box[3]); x = (clamp(a[0], 0, 1) + clamp(b[0], 0, 1)) / 2 * W; yb = clamp(b[1], 0, 1) * H; }
    cap.style.left = clamp(x - tw / 2, 4, Math.max(4, W - 4 - tw)) + 'px';
    cap.style.top = clamp(yb + gap, 4, Math.max(4, H - th - 4)) + 'px';
    cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on');
    clearTimeout(this.capTimer);
    this.capTimer = setTimeout(function () { self.hideCap(); }, ev.dur * 1000);
  };
  Clip.prototype.hideCap = function () { clearTimeout(this.capTimer); this.capTimer = 0; if (this.cap) { this.cap.classList.remove('on'); this.cap.style.display = 'none'; } };
  Clip.prototype.endFocus = function (resume) {
    clearTimeout(this.fxTimer); this.fxTimer = 0;
    if (!this.focusing) return;
    this.focusing = false;
    this.fig.classList.remove('is-focus');
    var v = this.v, self = this;
    if (resume && v && this.state === 'play') {
      v.muted = !this.sounding;
      var p = v.play();
      if (p && p.catch) p.catch(function () { self.state = 'pause'; self.update(); });
    }
    this.update();
  };
  // stop now, without resuming a held press (another clip starts, the clip leaves the screen, the tab is hidden)
  Clip.prototype.halt = function () {
    if (this.focusing) { this.endFocus(false); this.state = 'pause'; this.update(); return; }
    if (this.v && !this.v.paused) this.v.pause();
  };
  Clip.prototype.mapPt = function (x, y) {
    var z = this.zt; if (!z) return [x, y];
    return [(x - z.cx) * z.s + 0.5, (y - z.cy) * z.s + 0.5];
  };
  Clip.prototype.showFx = function (ev) {
    var W = this.box.clientWidth, H = this.box.clientHeight;
    if (!W || !H) return;
    var ring = this.ring, tag = this.tag;
    this.fig.classList.add('is-focus');
    var x = W / 2, y = H / 2, w = 0, h = 0;
    if (ev.box) {
      var a = this.mapPt(ev.box[0], ev.box[1]), b = this.mapPt(ev.box[0] + ev.box[2], ev.box[1] + ev.box[3]);
      var pad = W < 500 ? 3 : 5;
      x = clamp(a[0], 0, 1) * W - pad; y = clamp(a[1], 0, 1) * H - pad;
      w = clamp(b[0], 0, 1) * W - x + pad; h = clamp(b[1], 0, 1) * H - y + pad;
      if (w < 20) { x -= (20 - w) / 2; w = 20; }
      if (h < 16) { y -= (16 - h) / 2; h = 16; }
      x = clamp(x, 2, Math.max(2, W - 2 - w)); y = clamp(y, 2, Math.max(2, H - 2 - h));
      w = Math.min(w, W - 4); h = Math.min(h, H - 4);
      ring.style.display = '';
      ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.style.width = w + 'px'; ring.style.height = h + 'px';
      ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = '';
    } else ring.style.display = 'none';
    if (ev.label) {
      tag.textContent = ev.label; tag.style.display = '';
      tag.style.left = '0px'; tag.style.top = '0px';
      var tw = tag.offsetWidth, th = tag.offsetHeight, gap = 8;
      var tx = clamp(x + w / 2 - tw / 2, 4, Math.max(4, W - 4 - tw));
      var ty;
      if (!ev.box) ty = (H - th) / 2;
      else if (y - th - gap >= 0) ty = y - th - gap;                 // above the square, inside the video
      else if (H - (y + h) >= th + gap + 2) ty = y + h + gap;        // below it, inside
      else ty = y - th - gap;                                        // a thin strip: hang above the video
      tag.style.left = tx + 'px'; tag.style.top = ty + 'px';
      tag.style.animation = 'none'; void tag.offsetWidth; tag.style.animation = '';
      this.live.textContent = ev.label;
    } else tag.style.display = 'none';
  };
  Clip.prototype.zoomAt = function (t) {
    var zs = this.mt.zooms, cur = null;
    for (var i = 0; i < zs.length; i++) if (zs[i].t <= t + 0.01 && t < zs[i].end) cur = zs[i];
    return cur;
  };
  Clip.prototype.applyZoom = function (t) {
    if (!this.mt.zooms.length) return;
    var z = this.v && this.state !== 'idle' ? this.zoomAt(t) : null;
    if (z === this.zoomNow) return;
    this.zoomNow = z;
    if (!z) { this.zt = null; if (this.v) this.v.style.transform = ''; return; }
    var b = z.box, s = clamp(z.scale || Math.min(1 / Math.max(b[2], 0.01), 1 / Math.max(b[3], 0.01)), 1, 4);
    var cx = clamp(b[0] + b[2] / 2, 0.5 / s, 1 - 0.5 / s), cy = clamp(b[1] + b[3] / 2, 0.5 / s, 1 - 0.5 / s);
    this.zt = { s: s, cx: cx, cy: cy };
    if (this.v) this.v.style.transform = 'translate(' + ((0.5 - cx * s) * 100).toFixed(3) + '%,' + ((0.5 - cy * s) * 100).toFixed(3) + '%) scale(' + s.toFixed(4) + ')';
  };
  Clip.prototype.applyStage = function (t) {
    var st = this.mt.stages, a = this.arrow;
    if (!st.length) return;
    var cur = null;
    if (this.v && this.state !== 'idle') for (var i = 0; i < st.length; i++) { if (st[i].t <= t + 0.02) cur = st[i]; else break; }
    var y = cur ? this.mapPt(0.5, cur.y)[1] : -1;
    if (!cur || y < 0 || y > 1) { a.classList.remove('on'); cancelAnimationFrame(this.araf); this.araf = 0; this.stageCur = null; this.ay = null; return; }
    var br = this.box.getBoundingClientRect(), vw = document.documentElement.clientWidth || window.innerWidth;
    this.fig.classList.toggle('arrow-in', vw - br.right < 34);      // outside in the margin only when it fits (no sideways scroll)
    this.stageCur = cur;
    this.arrowTo(y, cur.row === 'done');
    a.classList.add('on');
    a.classList.toggle('is-done', cur.row === 'done');
    a.setAttribute('data-row', cur.row);
  };

  // 260930 owner「ピンって飛ぶんじゃなくて、滑らかに下にスッ…どこを通ってますよ…完了の時は矢印がその上にシュルルン」:
  // the arrow is moved by a soft spring (not a CSS jump): it slides through the stages it passes, and at 完了 it swoops up
  // with a small overshoot. It keeps settling even if the video is paused mid-move. The same with reduced motion (a small, slow move).
  Clip.prototype.arrowTo = function (y, done) {
    var a = this.arrow, self = this;
    this.aT = y; this.aDone = done;
    if (this.ay == null || !a.classList.contains('on')) {        // (not skipped for reduced motion: the owner asked for this glide; his Mac has it on)
      this.ay = y; this.av = 0; a.style.top = (y * 100).toFixed(3) + '%'; return;
    }
    if (this.araf) return;
    var last = 0;
    var step = function (now) {
      var dt = last ? Math.min(0.04, (now - last) / 1000) : 0.016; last = now;
      var w = self.aDone ? 6.2 : 7.0, z = self.aDone ? 0.68 : 0.92;       // 完了: a little slower, a small overshoot (シュルルン)
      self.av += (w * w * (self.aT - self.ay) - 2 * z * w * self.av) * dt;
      self.ay += self.av * dt;
      if (Math.abs(self.aT - self.ay) < 0.0005 && Math.abs(self.av) < 0.003) { self.ay = self.aT; self.av = 0; self.araf = 0; }
      a.style.top = (self.ay * 100).toFixed(3) + '%';
      if (self.araf !== 0 || Math.abs(self.aT - self.ay) >= 0.0005) self.araf = requestAnimationFrame(step);
    };
    this.araf = requestAnimationFrame(step);
  };

  Clip.prototype.play = function (withSound) {
    if (this.skin == null || this.failed) return;
    this.userPaused = false;
    if (Motion.trimStop) Motion.trimStop();          // TRIM のメーターも「同時に1つ」に入れる
    clips.forEach(function (c) {        // one clip moves at a time (the fire loop may keep moving, muted)
      if (c === this) return;
      if (!c.ambient) c.halt();
      if (c.sounding) { c.mute(); Sound.release(c.owner); }
    }, this);
    var v = this.ensureVideo(); if (!v) return;
    if (withSound) { Sound.claim(this.owner); this.sounding = true; AE.ensure(); }   // AE: made inside the press (iOS) for the click
    v.muted = !this.sounding;
    if (this.focusing) { this.update(); return; }    // a held press goes on by itself (now with sound)
    if (this.state === 'end' || this.state === 'idle') { try { v.currentTime = 0; } catch (e) {} this.rewind(0); this.lastT = 0; }
    if (this.state !== 'play') this.state = 'loading';
    var self = this, p = v.play();
    if (p && p.catch) p.catch(function () {
      if (!v.muted) { v.muted = true; self.sounding = false; Sound.release(self.owner); v.play().catch(function () { if (self.state === 'loading') self.state = 'idle'; self.update(); }); }
      else if (self.state === 'loading') self.state = 'idle';
      self.update();
    });
    this.update();
  };
  Clip.prototype.pause = function () { this.halt(); };
  // the viewer stops it (tap on the video / the corner button). The fire loop then stays stopped until ▶ 再生
  Clip.prototype.userStop = function () {
    if (this.ambient) this.userPaused = true;
    if (this.focusing) { this.endFocus(false); this.state = 'pause'; this.update(); return; }
    if (this.v && !this.v.paused) this.v.pause();
    else if (this.state === 'loading') { this.state = 'idle'; this.update(); }
  };
  Clip.prototype.mute = function () { this.sounding = false; if (this.v) this.v.muted = true; this.update(); };
  Clip.prototype.toggleSound = function () {
    if (this.skin == null) return;
    if (this.sounding) { this.mute(); Sound.release(this.owner); return; }
    this.play(true);
  };
  Clip.prototype.stop = function () {
    this.endFocus(false);
    if (this.sounding) { this.sounding = false; Sound.release(this.owner); }
    if (this.v) { this.v.pause(); this.v.muted = true; try { this.v.currentTime = 0; } catch (e) {} this.v.classList.remove('on'); }
    this.state = 'idle'; this.rewind(0); this.lastT = 0;
    this.applyZoom(0); this.arrow.classList.remove('on'); cancelAnimationFrame(this.araf); this.araf = 0; this.ay = null; this.hideCap();
    this.update();
  };
  // FIRE WATCH moves by itself while it is on screen (muted, looping), also when the OS asks for reduced motion.
  // A tap on it stops it; ▶ 再生 starts it again.
  Clip.prototype.ambientGo = function () {
    if (this.userPaused || this.skin == null || this.failed || this.focusing) return;
    var v = this.ensureVideo(); if (!v) return;
    v.muted = !this.sounding;
    if (this.state !== 'play') this.state = 'loading';
    var self = this, p = v.play(); if (p && p.catch) p.catch(function () { if (self.state === 'loading') self.state = 'idle'; self.update(); });
    this.update();
  };
  Clip.prototype.setVisible = function (vis) {
    this.visible = vis;
    if (vis) { if (this.ambient) this.ambientGo(); return; }
    this.halt();
    if (this.sounding) { this.mute(); Sound.release(this.owner); }
  };
  Clip.prototype.update = function () {
    var st = this.state, soon = this.skin == null || this.failed;
    var playing = st === 'play';
    var showPlay = !soon && !playing && !(this.ambient && st === 'loading');
    var active = !soon && (playing || st === 'loading');
    var focusPb = document.activeElement === this.pb, focusCb = document.activeElement === this.cb;
    this.fig.classList.toggle('is-playing', playing);
    this.fig.classList.toggle('is-active', active);
    this.fig.classList.toggle('show-play', showPlay);
    // 見えなくなるボタンからフォーカスを落とさない(▶ 再生 ⇄ 右下の一時停止)
    if (focusPb && active) this.cb.focus({ preventScroll: true });            // 読み込み中は ▶ が押せなくなるので、先に移す
    else if (focusCb && !active && showPlay) this.pb.focus({ preventScroll: true });
    var nm = this.name ? this.name + 'の動画' : '動画';
    this.cb.setAttribute('aria-label', st === 'loading' ? nm + 'の読み込みをやめる' : nm + 'を一時停止');
    var ct = $('.ctl-t', this.cb); if (ct) ct.textContent = st === 'loading' ? 'やめる' : '一時停止';
    this.pb.disabled = st === 'loading';
    if (st === 'loading') { this.pb.innerHTML = '読み込み中…'; this.pb.setAttribute('aria-label', '読み込み中'); }
    else if (st === 'end') { this.pb.innerHTML = ICON.again + 'もう一度'; this.pb.setAttribute('aria-label', 'もう一度再生(音は出ません)'); }
    else { this.pb.innerHTML = ICON.play + '再生'; this.pb.setAttribute('aria-label', (this.name ? this.name + 'の動画を' : '動画を') + '再生(音は出ません)'); }
    var on = this.sounding;
    var offText = this.ambient ? '音を聞く' : '音を出す', onText = this.ambient ? '音を止める' : '音を消す';
    this.sb.innerHTML = (on ? ICON.mute + onText : ICON.snd + offText);
    this.sb.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.sb.setAttribute('aria-label', nm + 'の' + (on ? onText : offText));   // どの動画の音か
    this.sb.disabled = soon; this.fb.disabled = soon;
  };

  $$('figure.clip[data-clip]').forEach(function (f) {
    var c = new Clip(f); clips.push(c);
    onView(f, function (vis) { c.setVisible(vis); }, { threshold: 0.3 });
  });
  vmanReady.then(function () { clips.forEach(function (c) { c.render(); }); });
  function clipsToSkin() { clips.forEach(function (c) { if (pickSkin(c.id, chosen) !== c.skin) c.stop(); c.render(); }); }

  /* ================= 2) SKIN: try on by hover, choose by click (no scrolling) ================= */
  var tryImg = $('#try-img'), hits = $('#menu-hits'), thumbs = $('#thumbs'), live = $('#skin-live');
  var preloaded = {};
  function menuSrc(n) { return SKIN_DIR + 'skin_' + pad(n) + '_menu.jpg'; }
  function thumbSrc(n) { return SKIN_DIR + 'skin_' + pad(n) + '_thumb.jpg'; }
  function fireSrc(n) { return SKIN_DIR + 'skin_' + pad(n) + '_apatt_fire.jpg'; }
  // リンク・フォーカス枠の青を、そのスキンの背景(bg・panel・panel2)で 4.6:1 以上になるまで暗く(明るいスキン)/明るく(暗いスキン)
  function hexRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function lumOf(rgb) { var c = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function fitBlue(t) {
    var base = hexRgb(t.light ? '#0066cc' : '#2997ff'), to = t.light ? [0, 0, 0] : [255, 255, 255];
    var bgs = ['--bg', '--panel', '--panel2'].map(function (k) { return hexRgb(t.v[k] || '#000000'); });
    for (var f = 0; f <= 0.9; f += 0.05) {
      var c = base.map(function (v, i) { return Math.round(v + (to[i] - v) * f); });
      if (bgs.every(function (b) { return contrast(c, b) >= 4.6; })) return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
    }
    return t.light ? '#002a5c' : '#9fd0ff';
  }
  function setVars(n) {
    var t = SK[n]; if (!t) return;
    for (var p in t.v) root.style.setProperty(p, t.v[p]);
    root.style.setProperty('--blue-text', fitBlue(t));
    root.setAttribute('data-skin', n);
    root.setAttribute('data-tone', t.light ? 'light' : 'dark');
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.v['--bg']);
  }
  function preload(n) { if (n < 0 || n >= SK.length || preloaded[n]) return; var i = new Image(); i.decoding = 'async'; i.src = menuSrc(n); preloaded[n] = i; }
  function paint(n) {
    var t = SK[n]; if (!t) return;
    shown = n; setVars(n);
    if (tryImg) {
      tryImg.src = menuSrc(n);
      tryImg.alt = 'APATT PRO の画面。右下の丸から開いた SKIN の一覧で、' + t.name + ' にポインターが乗り、画面全体が ' + t.name + ' を着ている';
    }
  }
  // 260930 owner「まずはスキンを選んでほしい・選ばざるを得ないように…選び終えたら自然に下に」: the gate (html.skin-gated, set in <head>).
  //   Chosen → the rest of the page appears and the page glides down to the next section. A press at the page end pokes the hint.
  //   Once open it stays open for this visit (sessionStorage), so a reload never closes it again on a reader.
  //   Phones: a tap is also the choice, so the glide waits a little longer and a second tap restarts the wait (they can try another).
  var lastPT = 'mouse';
  document.addEventListener('pointerdown', function (e) { lastPT = e.pointerType || 'mouse'; }, true);
  var Gate = { on: root.classList.contains('skin-gated'), t: 0, open: function (glide) {
    if (Gate.on) {
      Gate.on = false; root.classList.remove('skin-gated'); if (Gate.unbounce) Gate.unbounce();
      // 260930 18:55 owner「なかったものからいきなりパッと現れる → フェードインに」
      root.classList.add('gate-reveal'); setTimeout(function () { root.classList.remove('gate-reveal'); }, 1400);
      try { sessionStorage.setItem('apatt-a4-open', '1'); } catch (e) {}
    }
    var next = document.getElementById('who') || document.getElementById('vocal');
    if (!glide || !next) return;
    clearTimeout(Gate.t);
    Gate.t = setTimeout(function () { Gate.t = 0; if (glideTo) glideTo(next, null); else next.scrollIntoView(); }, lastPT === 'mouse' ? 520 : 1400);
  } };
  // the reader moves the page themselves: no automatic glide on top of that
  ['wheel', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, function () { if (Gate.t) { clearTimeout(Gate.t); Gate.t = 0; } }, { passive: true }); });
  // a typed or pasted #place past the skins (no click) opens the page and goes there
  window.addEventListener('hashchange', function () {
    if (!Gate.on) return;
    var id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    var t = id && document.getElementById(id);
    if (t && !t.closest('#top, #skin')) { Gate.open(false); requestAnimationFrame(function () { if (glideTo) glideTo(t, null); else t.scrollIntoView(); }); }
  });
  // 260930 18:45 owner「スクロールするとバイーンと戻される…iPhone の一番下で親指を上にやってもいけない、あの体験。カッと引っかかりを」:
  //   at the end of the gated page, pulling further moves the top and the skins up a little against resistance and they spring back
  //   (our own rubber band, the same on every browser; a touch pull replaces the phone's own bounce), and the hint + the skins pulse.
  if (Gate.on) (function () {
    var hint = $('#skin-gate'), stageEl = $('#skin-stage'), last = 0, off = 0, relT = 0, springing = 0;
    var parts = [$('#top'), $('#skin')].filter(Boolean);
    function atEnd() { return window.innerHeight + window.pageYOffset >= root.scrollHeight - 4; }
    function poke() {
      var now = Date.now(); if (now - last < 900 || !Gate.on) return; last = now;
      [hint, thumbs, stageEl].forEach(function (e) { if (e) { e.classList.remove('poke'); void e.offsetWidth; e.classList.add('poke'); } });
    }
    function setOff(px, anim) {
      off = px;
      parts.forEach(function (el) {
        el.style.transition = anim ? 'transform .55s cubic-bezier(.18,1.35,.4,1)' : 'none';
        el.style.transform = px ? 'translateY(' + (-px).toFixed(1) + 'px)' : '';
      });
    }
    function pull(d) {                                    // d = how far the reader tried to go past the end (px)
      if (!Gate.on) return;
      var max = Math.min(160, window.innerHeight * 0.22);
      var next = off + d * (1 - off / max) * 0.45;          // the further, the stiffer
      setOff(Math.max(0, Math.min(max, next)), false);
      poke();
    }
    function release() { if (off) setOff(0, true); }
    // wheel / trackpad: pull while the wheel goes on, spring back when it stops
    window.addEventListener('wheel', function (e) {
      if (!Gate.on || e.deltaY <= 0 || !atEnd()) return;
      pull(Math.min(60, e.deltaY));
      clearTimeout(relT); relT = setTimeout(release, 120);
    }, { passive: true });
    // touch: our own rubber band instead of the phone's (so the pull is felt the same everywhere)
    var ty = null, t0y = null, t0x = null;
    window.addEventListener('touchstart', function (e) { ty = t0y = e.touches[0].clientY; t0x = e.touches[0].clientX; }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!Gate.on || ty === null) return;
      var y = e.touches[0].clientY, d = ty - y; ty = y;
      if (Math.abs(e.touches[0].clientX - t0x) > Math.abs(y - t0y)) return;   // a sideways swipe (the skin samples) stays a sideways scroll
      if (atEnd() && (d > 0 || off > 0)) {
        if (e.cancelable) e.preventDefault();
        if (d > 0) pull(d * 1.4); else setOff(Math.max(0, off + d), false);
      }
    }, { passive: false });
    window.addEventListener('touchend', function () { ty = null; release(); }, { passive: true });
    window.addEventListener('touchcancel', function () { ty = null; release(); }, { passive: true });
    // keys at the end: a short kick
    window.addEventListener('keydown', function (e) {
      if (!Gate.on || !atEnd() || !(e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'End')) return;
      if (e.target && /input|textarea|select|button/i.test(e.target.tagName) && e.key === ' ') return;
      setOff(Math.min(70, window.innerHeight * 0.1), false); poke();
      clearTimeout(relT); relT = setTimeout(release, 90);
    });
    Gate.unbounce = function () { clearTimeout(relT); setOff(0, false); parts.forEach(function (el) { el.style.transition = ''; }); };
  })();
  function markChosen() { $$('[data-skin-btn]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-skin-btn') === chosen ? 'true' : 'false'); }); }
  function say(t) { if (live) live.textContent = t; }
  function preview(n) { if (n !== shown) { paint(n); say(SK[n].name + '(' + SK[n].ja + ')を試着中。クリックで決定'); } }
  function revert() { if (shown !== chosen) paint(chosen); }
  function choose(n) {
    var changed = n !== chosen;
    chosen = n;
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    paint(n); markChosen(); say(SK[n].name + ' に決めました');
    if (changed) { clipsToSkin(); qsSync(); }
    if (Gate.on) Gate.open(false);                     // 260930 18:45 owner: 選んだあとの自動スクロールはやめる
  }
  if (hits && SK.length) {
    SK.forEach(function (t, n) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-skin-btn', n);
      b.setAttribute('aria-label', t.name + '(' + t.ja + ')');
      b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') preview(n); });
      b.addEventListener('focus', function () { preview(n); });
      b.addEventListener('click', function () { choose(n); });
      hits.appendChild(b);
    });
    // 16 枚(4.8 MB)を一度に読まず、乗った名前の前後だけ先に読む
    $$('button', hits).forEach(function (b, n) {
      b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { preload(n - 1); preload(n + 1); } });
    });
    hits.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') revert(); });
    hits.addEventListener('focusout', function (e) { if (!hits.contains(e.relatedTarget)) revert(); });
  }
  // 見本の列の 7 枚目からは、横にスクロールして近づいた時に読む(スマホの最初の読み込みを軽く)
  var thumbIO = thumbs && hasIO && getComputedStyle(thumbs).display !== 'none' ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { var im = e.target; im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); thumbIO.unobserve(im); } });
  }, { root: thumbs, rootMargin: '0px 240px 0px 240px' }) : null;
  if (thumbs && SK.length) {
    SK.forEach(function (t, n) {
      var li = document.createElement('li'), b = document.createElement('button'), img = document.createElement('img');
      b.type = 'button'; b.setAttribute('data-skin-btn', n);
      b.setAttribute('aria-label', t.name + '(' + t.ja + ')を着る');
      img.alt = ''; img.width = 360; img.height = 316; img.loading = 'lazy'; img.decoding = 'async';
      if (n < 6 || !thumbIO) img.src = thumbSrc(n); else { img.setAttribute('data-src', thumbSrc(n)); thumbIO.observe(img); }
      b.appendChild(img);
      b.addEventListener('click', function () { choose(n); });
      li.appendChild(b); thumbs.appendChild(li);
    });
    // show the chosen one without moving the page
    var tb = $('[data-skin-btn="' + chosen + '"]', thumbs);
    if (tb) setTimeout(function () { thumbs.scrollLeft = Math.max(0, tb.parentNode.offsetLeft - thumbs.clientWidth / 2 + 36); }, 0);
  }
  paint(chosen); markChosen();

  /* ================= 3) BYPASS / BEFORE / AFTER (APA-MIX tabs) =================
     260930: the same three as the plug-in after APA-MIX (left to right BYPASS · BEFORE · AFTER) and, right of them, 「音量を揃えて比べる」:
     the louder versions come down to the quietest one (never up = never clips), like the plug-in.
     data-bypass is optional (a box without it has BEFORE / AFTER only). The waveform is a slider: click (or drag) / tap to hear from there. */
  var abs = [];
  var AB_NAMES = { y: 'BYPASS', b: 'BEFORE', a: 'AFTER' };
  var AB_LM = '音量を揃えて比べる';
  function AB(box) {
    var self = this;
    this.box = box;
    this.pb = box.getAttribute('data-before'); this.pa = box.getAttribute('data-after'); this.py = box.getAttribute('data-bypass') || '';
    this.sides = this.py ? ['y', 'b', 'a'] : ['b', 'a'];
    this.what = box.getAttribute('data-what') || '';
    this.side = 'a'; this.ready = null; this.lm = false; this.lmDb = { y: 0, b: 0, a: 0 }; this.drawn = ''; this.raf = 0;
    this.want = null; this.drag = null; this.lastPT = '';
    var tr = { b: this.pb, a: this.pa }; if (this.py) tr.y = this.py;
    this.mx = new Mixer(tr);
    var seg = this.sides.map(function (sd) {
      return '<button type="button" data-ab-side="' + sd + '" aria-pressed="' + (sd === 'a' ? 'true' : 'false') + '">' + AB_NAMES[sd] + '</button>';
    }).join('');
    box.innerHTML =
      '<p class="ab-h">' + this.sides.map(function (sd) { return AB_NAMES[sd]; }).join(' / ') + ' を聴き比べる</p>' +
      '<div class="ab-top">' +
        '<button class="snd" type="button" data-ab-go aria-pressed="false"></button>' +
        '<div class="seg" role="group" aria-label="聴き比べ">' + seg + '</div>' +
        '<button class="lmb" type="button" data-ab-lm aria-pressed="false">' + AB_LM + '</button>' +
      '</div>' +
      '<div class="ab-wave" role="slider" tabindex="0" aria-label="聴く位置(波形を押すと、その位置から)" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="はじめ">' +
        '<canvas aria-hidden="true"></canvas><span class="hv" aria-hidden="true"></span><span class="ph" aria-hidden="true"></span></div>' +
      '<div class="ab-foot"><span class="ab-hint">波形を押すと、その位置から聴けます</span><span class="ab-now" aria-live="polite"></span></div>' +
      (this.py ? '<p class="ab-legend"><span><b>BYPASS</b> 元の音(APATT を通さない)</span><span><b>BEFORE</b> APA-MIX を始める前の設定</span><span><b>AFTER</b> APA-MIX が決めた音</span></p>' : '') +
      (box.getAttribute('data-note') ? '<p class="ab-note"></p>' : '');
    if (box.getAttribute('data-note')) $('.ab-note', box).textContent = box.getAttribute('data-note');
    this.go = $('[data-ab-go]', box); this.lmBtn = $('[data-ab-lm]', box); this.now = $('.ab-now', box);
    this.wv = $('.ab-wave', box); this.cv = $('canvas', box); this.ph = $('.ph', box); this.hv = $('.hv', box);
    this.owner = { silence: function () { self.stop(true); } };
    this.go.addEventListener('click', function () { if (self.busy()) self.stop(); else self.play(); });
    $$('[data-ab-side]', box).forEach(function (b) { b.addEventListener('click', function () { self.pick(b.getAttribute('data-ab-side')); }); });
    this.lmBtn.addEventListener('click', function () {
      self.lm = !self.lm; self.lmBtn.setAttribute('aria-pressed', self.lm ? 'true' : 'false');
      self.mx.setLM(self.lm); self.drawn = ''; self.draw(); self.text();
    });
    // the waveform: mouse = press (and drag) to jump; touch / pen = a tap jumps (a swipe still scrolls the page)
    var wv = this.wv;
    function frac(e) { var r = wv.getBoundingClientRect(); return r.width ? clamp((e.clientX - r.left) / r.width, 0, 1) : 0; }
    wv.addEventListener('pointerdown', function (e) {
      self.lastPT = e.pointerType || 'mouse';
      if (self.lastPT !== 'mouse' || e.button) return;
      e.preventDefault(); try { wv.focus({ preventScroll: true }); } catch (x) {}
      self.drag = frac(e); self.drag0 = self.drag; try { wv.setPointerCapture(e.pointerId); } catch (x) {}
      self.showAt(self.drag); self.seekTo(self.drag);
    });
    wv.addEventListener('pointermove', function (e) {
      if ((e.pointerType || 'mouse') !== 'mouse') return;
      var f = frac(e); self.hover(f);
      if (self.drag !== null) { self.drag = f; self.showAt(f); }
    });
    // a plain click already jumped on press; only a real drag jumps again on release
    function endDrag() { if (self.drag !== null) { var f = self.drag; self.drag = null; if (Math.abs(f - self.drag0) > 0.003) self.seekTo(f); } }
    wv.addEventListener('pointerup', endDrag);
    wv.addEventListener('lostpointercapture', endDrag);
    wv.addEventListener('pointerleave', function () { self.hover(null); });
    wv.addEventListener('click', function (e) { if (self.lastPT && self.lastPT !== 'mouse') { self.showAt(frac(e)); self.seekTo(frac(e)); } });
    wv.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Enter' || k === ' ') { e.preventDefault(); if (self.busy()) self.stop(); else self.play(); return; }
      var L = self.mx.L || self.dur || 0; if (!L) return;
      var p = self.mx.playing ? self.mx.position() : (self.want !== null ? self.want * L : self.mx.pos);
      if (k === 'ArrowRight' || k === 'ArrowUp') p = Math.min(L - 0.05, p + 2);
      else if (k === 'ArrowLeft' || k === 'ArrowDown') p = Math.max(0, p - 2);
      else if (k === 'Home') p = 0;
      else if (k === 'End') p = Math.max(0, L - 2);
      else return;
      e.preventDefault(); self.showAt(p / L); self.seekTo(p / L);
    });
    this.label(); this.text();
    audioReady(this.pb).then(function (ok) {
      if (!ok) { box.classList.add('is-soon'); self.go.disabled = true; self.lmBtn.disabled = true; self.now.textContent = '音は準備中です';
        self.wv.setAttribute('tabindex', '-1'); self.wv.setAttribute('aria-disabled', 'true'); }
    });
    onView(box, function (near) { if (near) self.prep(); }, { rootMargin: '400px 0px' });
    onView(box, function (vis) { if (!vis && self.busy()) self.stop(); }, { threshold: 0 });
    window.addEventListener('resize', function () { self.drawn = ''; self.draw(); });
  }
  AB.prototype.names = function () { return AB_NAMES[this.side]; };
  // playing, or still loading (a start is on its way) — leaving the tab / screen must stop both
  AB.prototype.busy = function () { return this.mx.playing || !!this.loading; };
  AB.prototype.paths = function () { var o = { y: this.py, b: this.pb, a: this.pa }, self = this; return this.sides.map(function (sd) { return o[sd]; }); };
  // loudness match: bring the louder ones down to the quietest (never louder than the file = never clips)
  AB.prototype.prep = function () {
    var self = this;
    if (this.ready) return this.ready;
    var ps = this.paths();
    this.ready = Promise.all(ps.map(function (p) { return audioMeta(p).catch(function () { return {}; }); })
      .concat(ps.map(function (p) { return peaks(p).catch(function () { return null; }); }))).then(function (r) {
      var n = ps.length, lu = {}, pk = {}, lo = null;
      self.sides.forEach(function (sd, i) {
        pk[sd] = r[n + i];
        var l = r[i] && r[i].lufs; if (l == null) l = rmsLoud(r[n + i]);
        lu[sd] = l;
        if (!self.dur && r[i] && r[i].raw && r[i].raw.duration_s) self.dur = r[i].raw.duration_s;
      });
      var all = self.sides.every(function (sd) { return lu[sd] != null; });
      if (all) self.sides.forEach(function (sd) { lo = lo == null ? lu[sd] : Math.min(lo, lu[sd]); });
      self.sides.forEach(function (sd) { self.lmDb[sd] = all ? lo - lu[sd] : 0; self.mx.t[sd].lm = self.lmDb[sd]; });
      self.pk = pk;
      self.drawn = ''; self.draw();
    });
    return this.ready;
  };
  function rmsLoud(pk) {
    if (!pk || !pk.rms || !pk.rms.length) return null;
    var s = 0; pk.rms.forEach(function (x) { s += x * x; });
    return 10 * Math.log(s / pk.rms.length) / Math.LN10 - 0.691;
  }
  AB.prototype.label = function () {
    var on = this.mx.playing;
    this.go.innerHTML = on ? ICON.stop + '止める' : ICON.snd + '音を出す';
    this.go.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.go.setAttribute('aria-label', on ? '止める' : this.what + 'の ' + this.sides.map(function (sd) { return AB_NAMES[sd]; }).join(' / ') + ' の音を出す');
    var s = this.side;
    $$('[data-ab-side]', this.box).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ab-side') === s ? 'true' : 'false'); });
    this.box.classList.toggle('run', on);
  };
  AB.prototype.text = function (msg) {
    if (msg) { this.now.textContent = msg; return; }
    if (this.box.classList.contains('is-soon')) return;
    var lm = this.lm ? '(音量を揃えています)' : '';
    this.now.innerHTML = this.mx.playing ? 'いま: <b>' + this.names() + '</b>' + lm : (this.lm ? '音量を揃えて比べます' : '');
  };
  AB.prototype.weights = function () { var w = {}; w[this.side] = 1; return w; };
  AB.prototype.release = function () {
    if (this.mx.playing || this.loading) return;
    for (var id in this.mx.t) { var tr = this.mx.t[id]; if (tr.buf) { tr.buf = null; AE.drop(tr.path); } }
    this.mx.L = 0;
  };
  AB.prototype.play = function () {
    var self = this, ctx = AE.ensure();
    if (!ctx) { this.text('このブラウザでは、音を鳴らせませんでした。'); return; }
    if (this.box.classList.contains('is-soon')) return;
    Sound.claim(this.owner);
    abs.forEach(function (o) { if (o !== self) o.release(); });
    this.mx.lm = this.lm;
    this.text('読み込んでいます…');
    this.loading = true;
    this.prep().then(function () { return self.mx.load(self.sides); }).then(function () {
      self.loading = false;
      if (Sound.cur !== self.owner) { self.text(); return; }
      if (self.want !== null) { self.mx.pos = self.want * self.mx.L; self.want = null; }
      self.mx.mix(self.weights(), 0.01);
      self.mx.start(self.mx.pos);
      self.label(); self.text(); self.loop();
    }).catch(function () { self.loading = false; Sound.release(self.owner); self.text('音を読み込めませんでした。'); self.label(); });
  };
  // jump to a place (0..1 of the excerpt); when stopped, start from there
  AB.prototype.seekTo = function (f) {
    f = clamp(f, 0, 0.999);
    if (this.box.classList.contains('is-soon')) return;
    AE.ensure();                                            // also resumes a context the phone suspended
    if (this.loading) { this.want = f; Sound.claim(this.owner); }        // the last choice wins when the sound arrives
    else if (this.mx.playing && this.mx.L) this.mx.seek(f * this.mx.L);
    else { this.want = f; this.play(); }
    this.showAt(f);
  };
  AB.prototype.showAt = function (f) {
    this.ph.style.left = (f * 100) + '%';
    this.box.classList.add('has-pos');
    var L = this.mx.L || this.dur || 0;
    this.wv.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    this.wv.setAttribute('aria-valuetext', L ? (Math.round(f * L * 10) / 10) + ' 秒' : Math.round(f * 100) + '%');
  };
  AB.prototype.hover = function (f) {
    if (f === null) { this.hv.style.opacity = ''; return; }
    this.hv.style.left = (f * 100) + '%'; this.hv.style.opacity = '1';
  };
  AB.prototype.stop = function (fromOther) {
    this.mx.stop(); cancelAnimationFrame(this.raf);
    if (!fromOther) Sound.release(this.owner);
    this.label(); this.text();
  };
  AB.prototype.pick = function (s) {
    this.side = s;
    if (this.mx.playing) this.mx.mix(this.weights(), 0.04);
    this.label(); this.text(); this.drawn = ''; this.draw();
  };
  AB.prototype.loop = function () {
    var self = this; cancelAnimationFrame(this.raf);
    var n = 0;
    var f = function () {
      if (!self.mx.playing) return;
      if (self.mx.L && self.drag === null) {
        var fr = self.mx.position() / self.mx.L;
        self.ph.style.left = (fr * 100) + '%';
        if ((n++ & 15) === 0) { self.wv.setAttribute('aria-valuenow', String(Math.round(fr * 100))); self.wv.setAttribute('aria-valuetext', (Math.round(fr * self.mx.L * 10) / 10) + ' 秒'); }
      }
      self.raf = requestAnimationFrame(f);
    };
    this.raf = requestAnimationFrame(f);
  };
  AB.prototype.draw = function () {
    var pk = this.pk && this.pk[this.side]; if (!pk || !pk.max) return;
    var cv = this.cv, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var lm = this.lm, key = this.side + lm + w + 'x' + h + root.getAttribute('data-skin');
    if (key === this.drawn) return; this.drawn = key;
    var dpr = window.devicePixelRatio || 1; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    var self = this;
    function top(p, sd) { var m = 0; if (!p || !p.max) return 0; for (var i = 0; i < p.max.length; i++) m = Math.max(m, Math.abs(p.max[i]), Math.abs(p.min[i])); return m * (lm ? db2g(self.lmDb[sd]) : 1); }
    var peakTop = 0; this.sides.forEach(function (sd) { peakTop = Math.max(peakTop, top(self.pk[sd], sd)); }); peakTop = peakTop || 1;
    var g = lm ? db2g(this.lmDb[this.side]) : 1, mid = h / 2, sc = (h / 2 - 3) / peakTop;
    var ink = getComputedStyle(root).getPropertyValue('--text').trim() || '#ddd';
    c.fillStyle = ink; c.globalAlpha = 0.72;
    var n = pk.max.length;
    for (var i = 0; i < n; i++) {
      var x = i / n * w, t = clamp(pk.max[i] * g * sc, 0.5, mid), b = clamp(-pk.min[i] * g * sc, 0.5, mid);
      c.fillRect(x, mid - t, Math.max(1, w / n - 0.5), t + b);
    }
  };
  $$('.ab[data-before]').forEach(function (b) { abs.push(new AB(b)); });

  /* ================= 4) APA-MIX tabs ================= */
  (function () {
    var tabs = $$('#apamix [role="tab"]'); if (!tabs.length) return;
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
        if (p) {
          if (!on && !p.hidden) {       // leaving a panel: stop what it was playing
            clips.forEach(function (c) { if (p.contains(c.fig)) c.stop(); });
            abs.forEach(function (a) { if (p.contains(a.box) && a.busy()) a.stop(); });
          }
          p.hidden = !on;
        }
      });
      if (focus) t.focus();
      abs.forEach(function (a) { a.drawn = ''; a.draw(); });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = i;
        if (k === 'ArrowRight') j = (i + 1) % tabs.length; else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') j = 0; else if (k === 'End') j = tabs.length - 1; else return;
        e.preventDefault(); select(tabs[j], true);
      });
    });
  })();

  /* ================= 5) TRIM: a DAW-like channel pair (drawn here), driven by the riff's peaks =================
     BEFORE = the riff as it comes out of the synth (fader at 0 dB, the peaks go over 0 → the clip lamp turns red).
     AFTER  = the same riff through APATT's TRIM (never red). Meters = audio/syn_over.peaks.json / syn_trim.peaks.json
     + display_offset_db (audio/audio.json). Until those exist, a stand-in riff moves the meters and no sound is offered. */
  (function () {
    var lab = $('#trimlab'); if (!lab) return;
    var host = $('#trim-strips'), bPlay = $('#trim-play'), bSnd = $('#trim-snd'), note = $('#trim-note');
    var PB = A4_AUDIO + 'syn_over', PA = A4_AUDIO + 'syn_trim', TRIM_DB = -4.9;   // 260930 v1.26.206(−1.0 dBFS まで下げる)
    var MAP = [[6, 0], [3, 0.075], [0, 0.15], [-3, 0.225], [-6, 0.3], [-12, 0.43], [-18, 0.54], [-24, 0.64], [-36, 0.79], [-48, 0.9], [-60, 1]];
    var Y0 = 52, H = 236;
    function yOf(db) {
      db = clamp(db, -60, 6);
      for (var i = 1; i < MAP.length; i++) if (db >= MAP[i][0]) { var a = MAP[i - 1], b = MAP[i], f = (db - b[0]) / (a[0] - b[0]); return Y0 + (b[1] + (a[1] - b[1]) * f) * H; }
      return Y0 + H;
    }
    var uid = 0;
    function stripSVG(side) {
      var id = 'tg' + (++uid), yb = Y0 + H, s = '';
      s += '<svg viewBox="0 0 120 332" role="img" aria-hidden="true" focusable="false">';
      s += '<defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + yb + '" x2="0" y2="' + Y0 + '">' +
        '<stop offset="0" stop-color="#30d158"/><stop offset="' + ((yb - yOf(-12)) / H).toFixed(3) + '" stop-color="#30d158"/>' +
        '<stop offset="' + ((yb - yOf(-6)) / H).toFixed(3) + '" stop-color="#ffd60a"/><stop offset="' + ((yb - yOf(-0.5)) / H).toFixed(3) + '" stop-color="#ff9f0a"/>' +
        '<stop offset="' + ((yb - yOf(0)) / H).toFixed(3) + '" stop-color="#ff453a"/><stop offset="1" stop-color="#ff453a"/></linearGradient></defs>';
      s += '<rect class="body-r" x="1" y="1" width="118" height="330" rx="12"/>';
      s += '<rect class="led" x="16" y="14" width="30" height="10" rx="2"/><text class="ledtxt" x="31" y="36" text-anchor="middle">CLIP</text>';
      s += '<text class="readout" x="92" y="23" text-anchor="middle">-inf</text><text class="ledtxt" x="92" y="36" text-anchor="middle">PEAK</text>';
      s += '<rect class="trk" x="20" y="' + Y0 + '" width="22" height="' + H + '" rx="2"/>';
      s += '<rect class="lvl" x="20" y="' + yb + '" width="22" height="0" fill="url(#' + id + ')"/>';
      s += '<line class="hold" x1="20" x2="42" y1="' + yb + '" y2="' + yb + '" style="opacity:0"/>';
      [6, 3, 0, -3, -6, -12, -18, -24, -36, -48, -60].forEach(function (d) {
        var y = yOf(d).toFixed(1), z = d === 0 ? ' zero' : '';
        s += '<line class="tick' + z + '" x1="45" x2="49" y1="' + y + '" y2="' + y + '"/>';
        s += '<text class="lbl' + z + '" x="52" y="' + (+y + 3) + '">' + (d > 0 ? '+' + d : d) + '</text>';
      });
      var y0 = yOf(0);
      s += '<line class="tick zero" x1="18" x2="44" y1="' + y0 + '" y2="' + y0 + '"/>';
      s += '<rect class="fad-trk" x="89" y="' + Y0 + '" width="6" height="' + H + '" rx="3"/>';
      s += '<rect class="cap" x="76" y="' + (y0 - 10) + '" width="32" height="20" rx="3"/><line class="capline" x1="78" x2="106" y1="' + y0 + '" y2="' + y0 + '"/>';
      s += '<text class="db0" x="60" y="' + (yb + 26) + '" text-anchor="middle">FADER 0.0 dB</text>';
      s += '</svg>';
      return s;
    }
    var S = {};
    [['b', 'BEFORE', 'そのまま'], ['a', 'AFTER', 'TRIM −4.9 dB']].forEach(function (d) {
      var st = el('div', 'strip' + (d[0] === 'b' ? ' sel' : ''));
      st.setAttribute('data-side', d[0]);
      st.innerHTML = stripSVG(d[0]) + '<p class="strip-name">' + d[1] + '<small>' + d[2] + '</small></p>';
      host.appendChild(st);
      S[d[0]] = { el: st, lvl: $('.lvl', st), hold: $('.hold', st), led: $('.led', st), ro: $('.readout', st), level: -120, hv: -120, ht: 0, max: -120, clip: false };
      st.addEventListener('click', function () { pick(d[0]); });
    });
    var side = 'b', data = null, running = false, t0 = 0, raf = 0, lastT = 0, lastI = -1, lastNow = 0;
    var mx = new Mixer({ b: PB, a: PA }), sound = false, canSound = false;
    var owner = { silence: function () { soundOff(true); } };

    function fakeRiff() {     // stand-in until audio/syn_over.peaks.json arrives: a 16th-note riff, loudest hits about +2.6 dB
      var N = 400, dur = 7.5, mx1 = [], mn = [], st = 60 / 128 / 4, seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var acc = [1, .55, .7, .5, .9, .5, .65, .55, 1, .5, .72, .6, .85, .5, .95, .6];
      for (var i = 0; i < N; i++) {
        var t = i / N * dur, k = Math.floor(t / st), ph = (t - k * st) / st;
        var a = acc[k % 16] * (0.86 + 0.14 * rnd()) * Math.exp(-ph * 2.4) * 1.349;
        mx1.push(a); mn.push(-a * (0.9 + 0.1 * rnd()));
      }
      return { max: mx1, min: mn, duration_s: dur };
    }
    function pkDb(p, i, off) { return g2db(Math.max(Math.abs(p.max[i]), Math.abs(p.min[i]))) + off; }
    function load() {
      if (data) return Promise.resolve(data);
      return Promise.all([peaks(PB).catch(function () { return null; }), peaks(PA).catch(function () { return null; }), a4Audio().catch(function () { return null; })]).then(function (r) {
        var pb = r[0], pa = r[1], list = r[2], fake = false;
        if (!pb) { pb = fakeRiff(); fake = true; }
        var off = findNum(list, 'display_offset_db');
        if (off == null) {       // not given: place the loudest hit of the riff at +2.6 dB (the owner saw +2〜3 dB in the DAW)
          var m = -200; for (var i = 0; i < pb.max.length; i++) m = Math.max(m, pkDb(pb, i, 0));
          off = fake ? 0 : 2.6 - m;
        }
        var trimDb = TRIM_DB;
        if (!pa) pa = { max: pb.max.map(function (x) { return x * db2g(trimDb); }), min: pb.min.map(function (x) { return x * db2g(trimDb); }) };
        var dur = pb.duration_s || (pb.samples && pb.sample_rate ? pb.samples / pb.sample_rate : 0) || 7.5;
        canSound = !fake && !!list;
        data = { pb: pb, pa: pa, off: off, dur: dur, N: pb.max.length, fake: fake };
        if (!canSound) { bSnd.disabled = true; bSnd.setAttribute('aria-label', '音は準備中です'); note.textContent = '音は準備中です(いまのメーターは仮の動きです)。フェーダーとメーターの絵は、DAW のミキサーを模してこのページで描いたものです。'; }
        return data;
      });
    }
    function reset() { ['b', 'a'].forEach(function (k) { var s = S[k]; s.level = -120; s.hv = -120; s.max = -120; s.clip = false; paint(k); }); }
    function paint(k) {
      var s = S[k], yb = Y0 + H;
      var y = s.level > -60 ? yOf(s.level) : yb;
      s.lvl.setAttribute('y', y.toFixed(1)); s.lvl.setAttribute('height', Math.max(0, yb - y).toFixed(1));
      if (s.hv > -60) { var yh = yOf(s.hv).toFixed(1); s.hold.setAttribute('y1', yh); s.hold.setAttribute('y2', yh); s.hold.style.opacity = ''; }
      else s.hold.style.opacity = '0';
      s.led.classList.toggle('on', s.clip);
      var txt = s.max <= -60 ? '-inf' : (s.max > 0.049 ? '+' : '') + (Math.abs(s.max) < 0.05 ? '0.0' : s.max.toFixed(1));
      if (s.ro.textContent !== txt) s.ro.textContent = txt;
      s.ro.classList.toggle('over', s.max > 0.049);
    }
    function frame(now) {
      if (!running || !data) return;
      var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
      var t = sound && mx.playing ? mx.position() : (((now - t0) / 1000) % data.dur);
      if (t < lastT - 0.5) { reset(); lastI = -1; }
      lastT = t;
      var i = clamp(Math.floor(t / data.dur * data.N), 0, data.N - 1), from = lastI < 0 || i < lastI ? i : lastI + 1;
      [['b', data.pb], ['a', data.pa]].forEach(function (d) {
        var s = S[d[0]], p = d[1], pk = -200;
        for (var j = from; j <= i; j++) pk = Math.max(pk, pkDb(p, j, data.off));
        if (from > i) pk = pkDb(p, i, data.off);
        s.level = Math.max(pk, s.level - 26 * dt);
        if (pk >= s.hv) { s.hv = pk; s.ht = now; } else if (now - s.ht > 1200) s.hv -= 20 * dt;
        if (pk > s.max) s.max = pk;
        if (pk > 0.049) s.clip = true;           // over 0.0 dB as the meter shows it (0.1 dB steps)
        paint(d[0]);
      });
      lastI = i;
      raf = requestAnimationFrame(frame);
    }
    function label() {
      bPlay.innerHTML = running ? ICON.pause + '止める' : ICON.play + '再生';
      bPlay.setAttribute('aria-label', running ? 'メーターを止める' : 'メーターを動かす(音は出ません)');
      bSnd.innerHTML = sound ? ICON.mute + '音を消す' : ICON.snd + '音を出す';
      bSnd.setAttribute('aria-pressed', sound ? 'true' : 'false');
      $$('[data-trim-side]', lab).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-trim-side') === side ? 'true' : 'false'); });
      S.b.el.classList.toggle('sel', side === 'b'); S.a.el.classList.toggle('sel', side === 'a');
    }
    function run(on) {
      if (on === running) return;
      running = on; cancelAnimationFrame(raf);
      if (on) clips.forEach(function (c) { if (!c.ambient) c.halt(); });
      if (on) { load().then(function () { if (!running) return; t0 = performance.now() - lastT * 1000; lastNow = 0; raf = requestAnimationFrame(frame); }); }
      label();
    }
    function soundOn() {
      var ctx = AE.ensure(); if (!ctx) return;
      Sound.claim(owner); sound = true; label();
      load().then(function () { if (!canSound) throw new Error('no sound'); return mx.load(['b', 'a']); }).then(function () {
        if (!sound || Sound.cur !== owner) return;
        mx.mix(side === 'a' ? { a: 1 } : { b: 1 }, 0.01);
        var p = running ? lastT : 0; if (!running) { reset(); lastI = -1; lastT = 0; }
        mx.start(p % (mx.L || data.dur));
        run(true);
      }).catch(function () { sound = false; Sound.release(owner); label(); });
    }
    function soundOff(fromOther) {
      if (sound && mx.playing) { lastT = mx.position(); t0 = performance.now() - lastT * 1000; }
      sound = false; mx.stop(); if (!fromOther) Sound.release(owner); label();
    }
    function pick(s) { side = s; if (sound && mx.playing) mx.mix(s === 'a' ? { a: 1 } : { b: 1 }, 0.04); label(); }
    bPlay.addEventListener('click', function () { if (running) { if (sound) soundOff(); run(false); } else run(true); });
    bSnd.addEventListener('click', function () { if (sound) soundOff(); else soundOn(); });
    $$('[data-trim-side]', lab).forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-trim-side')); }); });
    onView(lab, function (near) { if (near) load(); }, { rootMargin: '300px 0px' });
    onView(lab, function (vis) { if (!vis) { if (sound) soundOff(); run(false); } }, { threshold: 0 });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (sound) soundOff(); run(false); } });
    Motion.trimStop = function () { if (sound) soundOff(); run(false); };
    label(); reset();
  })();

  /* ================= 5a) 260930 owner: the ①〜⑤ pills (and the top bar menu) glide to their place instead of jumping ("ピッて飛ぶんじゃなくて、ぬるぬるんって").
     CSS smooth scrolling is off when "reduce motion" is on (the owner's Mac has it on), so this is done here: ease in-out, 450〜900 ms by distance
     (the same with reduce motion: the owner asked for it), stops if the reader scrolls or touches, then focuses the target without a second jump. ================= */
  (function () {
    function padTop() { var v = parseFloat(getComputedStyle(root).scrollPaddingTop); return isNaN(v) ? 0 : v; }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    var anim = 0, endPrev = null;
    function glide(target, hash) {
      if (endPrev) endPrev();                                   // a glide already running hands over (its listeners go, the CSS stays off)
      // a history entry like a normal anchor jump, pushed before moving so Back returns to where the visitor was
      if (hash && location.hash !== hash && history.pushState) { try { history.pushState(null, '', hash); } catch (e) {} }
      var dd = target.closest ? target.closest('details') : null; if (dd && !dd.open) dd.open = true;
      function aim() { return Math.max(0, Math.min(target.getBoundingClientRect().top + window.pageYOffset - padTop(), root.scrollHeight - window.innerHeight)); }
      var y0 = window.pageYOffset, y1 = aim();
      var dist = Math.abs(y1 - y0), dur = Math.min(900, Math.max(450, dist * 0.35)), t0 = null, id = ++anim;
      function stop() { anim++; off(); root.style.scrollBehavior = ''; }
      function off() { ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.removeEventListener(e, stop); }); if (endPrev === off) endPrev = null; }
      endPrev = off;
      ['wheel', 'touchstart', 'keydown'].forEach(function (e) { window.addEventListener(e, stop, { passive: true }); });
      root.style.scrollBehavior = 'auto';
      function step(ts) {
        if (id !== anim) return;                              // handed over or stopped (whoever stopped it put the CSS back)
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        y1 = aim(); // re-aim every frame: videos above may finish loading and move the target
        window.scrollTo(0, y0 + (y1 - y0) * ease(k));
        if (k < 1) requestAnimationFrame(step);
        else {
          off(); root.style.scrollBehavior = '';
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          try { target.focus({ preventScroll: true }); } catch (e) {}
        }
      }
      requestAnimationFrame(step);
    }
    glideTo = glide;
    // every link inside the page (not the skip link, which should jump for keyboard users)
    document.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
      if (!a || a.classList.contains('skip')) return;
      var h = a.getAttribute('href'); if (!h || h.length < 2) return;
      var t = document.getElementById(h.slice(1)); if (!t) return;
      // a link to a place past the skins (the top bar, 今すぐ購入, the sale) is a clear choice: the gate opens for it
      if (Gate.on && !t.closest('#top, #skin')) Gate.open(false);
      ev.preventDefault(); glide(t, h);
    });
  })();

  /* ================= 5b) The fixed top bar: the sale (one setting: window.APATT_SALE in index.html), the folding menu, where we are ================= */
  (function () {
    var bar = $('#topbar'); if (!bar) return;
    var sale = $('#tb-sale'), cfg = window.APATT_SALE || null;
    function ymd(s) { var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim()); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
    function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
    if (sale && cfg && cfg.on && cfg.text) {
      var from = ymd(cfg.from), to = ymd(cfg.to);
      // after the last day the band goes away by itself; before the first day it shows with its dates (a notice).
      // 260930: the end is the end of that day in Japan (the FastSpring discount ends 23:59 JST), whatever the visitor's time zone
      var over = to && Date.now() >= Date.UTC(to.getFullYear(), to.getMonth(), to.getDate() + 1) - 9 * 3600 * 1000;
      if (!over) {
        var date = from && to ? md(from) + '〜' + md(to) : from ? md(from) + '〜' : to ? '〜' + md(to) : '';
        sale.textContent = '';
        sale.appendChild(el('span', 'tb-dot'));
        var b = el('b'); b.textContent = cfg.text; sale.appendChild(b);
        if (cfg.note) { var n = el('span', 'tb-note'); n.textContent = cfg.note; sale.appendChild(n); }
        if (date) { var d = el('span', 'tb-date'); d.textContent = date; sale.appendChild(d); }
        if (cfg.href) sale.setAttribute('href', cfg.href);
        sale.setAttribute('aria-label', 'セール: ' + cfg.text + (cfg.note ? '・' + cfg.note : '') + (date ? '(' + date + ')' : '') + '。エディションへ');
        sale.hidden = false; root.classList.add('has-sale');
        // the same line on the PRO card (the band links there)
        var eds = $('#ed-sale');
        if (eds) { eds.textContent = cfg.text + (cfg.note ? '・' + cfg.note : '') + (date ? '(' + date + ')' : ''); eds.hidden = false; }
        // 260930 19:20 owner「20時から 10% オフ・カウントダウンをヘッダーに。20時きっかりになったら 10% オフになってる」:
        //   before cfg.startAt (a fixed moment in Japan time) the band counts down; at that second it becomes the sale line by itself
        var startMs = cfg.startAt ? Date.parse(cfg.startAt) : NaN;
        if (!isNaN(startMs) && Date.now() < startMs) (function () {
          var nEl = $('.tb-note', sale), dEl = $('.tb-date', sale), note0 = nEl ? nEl.textContent : '', date0 = dEl ? dEl.textContent : '', eds0 = eds ? eds.textContent : '';
          var sd = new Date(startMs), hm = (sd.getUTCHours() + 9) % 24 + ':' + ('0' + sd.getUTCMinutes()).slice(-2);
          function two(v) { return (v < 10 ? '0' : '') + v; }
          function tick() {
            var left = Math.ceil((startMs - Date.now()) / 1000);
            if (left <= 0) {
              clearInterval(iv); root.classList.remove('sale-soon');
              if (nEl) nEl.textContent = note0; if (dEl) dEl.textContent = date0; if (eds) eds.textContent = eds0;
              sale.setAttribute('aria-label', 'セール: ' + cfg.text + (cfg.note ? '・' + cfg.note : '') + (date ? '(' + date + ')' : '') + '。エディションへ');
              sale.classList.remove('go'); void sale.offsetWidth; sale.classList.add('go');
              return;
            }
            var h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60), sec = left % 60;
            var cd = (h ? h + ':' + two(m) : two(m)) + ':' + two(sec);
            if (nEl) nEl.textContent = '開始まで'; if (dEl) dEl.textContent = cd;
            if (eds) eds.textContent = cfg.text + '・' + (cfg.note || '') + '(' + md(sd) + ' ' + hm + ' から・あと ' + cd + ')';
            sale.setAttribute('aria-label', 'セール: ' + cfg.text + '。' + md(sd) + ' ' + hm + ' から(日本時間)。エディションへ');
          }
          root.classList.add('sale-soon');
          var iv = setInterval(tick, 1000); tick();
        })();
      }
    }
    // wide screens: the sale sits in the true middle of the bar (like 「Licensed to」 in the plug-in's own header).
    // When the menu would run into it, the menu folds into ≡ as on narrower screens.
    var brand = $('.tb-brand', bar), right = $('.tb-right', bar);
    function fitBar() {
      var wideNow = window.matchMedia ? window.matchMedia('(min-width:1100px)').matches : true;
      if (!wideNow || !sale || sale.hidden) { bar.classList.remove('tb-fold'); return; }
      bar.classList.remove('tb-fold');
      var navEl = $('#tb-nav'), sr = sale.getBoundingClientRect(), nr = navEl ? navEl.getBoundingClientRect() : null, rr = right.getBoundingClientRect();
      var hit = (nr && nr.right + 16 > sr.left) || rr.left - 16 < sr.right || brand.getBoundingClientRect().right + 16 > sr.left;
      bar.classList.toggle('tb-fold', !!hit);
      if (!hit && bar.classList.contains('open')) setOpen(false);
    }
    var fitT = 0;
    window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitBar, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBar);
    var btn = $('#tb-menu'), nav = $('#tb-nav');
    function setOpen(o) {
      bar.classList.toggle('open', o);
      if (btn) { btn.setAttribute('aria-expanded', o ? 'true' : 'false'); btn.setAttribute('aria-label', o ? 'メニューを閉じる' : 'メニューを開く'); }
    }
    if (btn && nav) {
      btn.addEventListener('click', function () { setOpen(!bar.classList.contains('open')); });
      nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bar.classList.contains('open')) { setOpen(false); btn.focus(); } });
      document.addEventListener('click', function (e) { if (bar.classList.contains('open') && !bar.contains(e.target)) setOpen(false); });
      if (window.matchMedia) {
        var wide = window.matchMedia('(min-width:1100px)'), f = function () { if (wide.matches && !bar.classList.contains('tb-fold')) setOpen(false); };
        if (wide.addEventListener) wide.addEventListener('change', f); else if (wide.addListener) wide.addListener(f);
      }
    }
    fitBar();
    // where we are: the menu item of the section in the middle of the screen
    if (nav && hasIO) {
      var links = $$('a[href^="#"]', nav), map = {};
      links.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var a = map[e.target.id]; if (!a) return;
          if (e.isIntersecting) { links.forEach(function (x) { x.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
          else if (a.getAttribute('aria-current')) a.removeAttribute('aria-current');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  })();

  /* ================= 5c) MORE: a link to something inside a folded item (#d-trim …) opens it ================= */
  (function () {
    function openFor() {
      var id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
      if (!id) return;
      var t = document.getElementById(id); if (!t) return;
      var d = t.closest ? t.closest('details') : null;
      if (d && !d.open) { d.open = true; requestAnimationFrame(function () { t.scrollIntoView({ block: 'start' }); }); }
    }
    window.addEventListener('hashchange', openFor);
    openFor();
  })();

  /* ================= 5d) 260930 19:35 owner: three places the scroll "catches" for a moment (a brake, not a stop), and a sparkle =================
     「忙しい人のために APA-MIX を用意しました」「やりすぎたら、画面が先に教えてくれます」「あなたに合う APATT を」:
     going down, when one of these headings reaches the upper middle of the screen, the wheel moves the page only a little for 0.75 s
     (うっと止まる感じ), then it is free again; it re-arms once the heading has left the screen. Touch screens: a soft snap (CSS).
     The APA-MIX heading also sparkles when it comes into view (安心してください、のキラキラ). Runs with reduced motion too (the owner asked). */
  (function () {
    var heads = ['#mix-h', '#fire-h', '#ed-h'].map(function (q) { return $(q); }).filter(Boolean);
    if (!heads.length) return;
    // 260930 19:50 owner「トラックボールだと全然引っかからない・もっと引っかかっていい(でも皆にとって引っかかる位)」:
    //   the brake is now a budget, not a ratio: for 1.2 s after the catch the page moves at most ~40 px in all, however hard the wheel / trackball goes
    var armed = heads.map(function () { return true; }), until = 0, budget = 0;
    function hit() {
      var vh = window.innerHeight;
      for (var i = 0; i < heads.length; i++) {
        if (!armed[i]) continue;
        var r = heads[i].getBoundingClientRect();
        if (r.top < vh * 0.6 && r.top > vh * 0.16 && r.height > 0) return i;
      }
      return -1;
    }
    window.addEventListener('scroll', function () {
      var vh = window.innerHeight;
      heads.forEach(function (h, i) { var r = h.getBoundingClientRect(); if (r.top > vh || r.bottom < 0) armed[i] = true; });
    }, { passive: true });
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.deltaY <= 0 || (typeof Gate !== 'undefined' && Gate.on)) return;
      var now = performance.now();
      if (now > until) {
        var i = hit(); if (i < 0) return;
        armed[i] = false; until = now + 1200; budget = 40;
        if (heads[i].id === 'mix-h') sparkle(heads[i]);
      }
      e.preventDefault();
      var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      var step = Math.min(budget, 6, Math.max(0.5, d * 0.08));
      if (step > 0) { budget -= step; window.scrollBy(0, step); }
    }, { passive: false });
    // the sparkle: little stars around the words that twinkle and fade, and a soft glow on the heading
    var lastSp = 0;
    function sparkle(h) {
      var now = Date.now(); if (now - lastSp < 4000) return; lastSp = now;
      h.classList.add('spk-host'); h.classList.remove('spk-glow'); void h.offsetWidth; h.classList.add('spk-glow');
      var r = h.getBoundingClientRect(), n = 14;
      for (var k = 0; k < n; k++) {
        var st = document.createElement('span'); st.className = 'spk'; st.setAttribute('aria-hidden', 'true'); st.textContent = k % 3 ? '✦' : '✧';
        st.style.left = (4 + Math.random() * 92) + '%'; st.style.top = (-12 + Math.random() * 110) + '%';
        st.style.fontSize = (10 + Math.random() * 16) + 'px';
        st.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
        h.appendChild(st);
      }
      setTimeout(function () { $$('.spk', h).forEach(function (x) { x.remove(); }); h.classList.remove('spk-glow'); }, 3000);
    }
    // it also sparkles when it simply comes into view (touch, keys, links)
    var mh = $('#mix-h');
    if (mh && hasIO) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > 0.6) sparkle(mh); });
    }, { threshold: [0.6], rootMargin: '0px 0px -42% 0px' }).observe(mh);   // when it reaches the upper middle (the same moment as the brake)
  })();

  /* ================= 6) Quiet fade-in ================= */
  (function () {
    var els = $$('.rv');
    if (!hasIO || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ================= 7) Gold scenes (MAKER and the closing #free): the page becomes the plate ================= */
  $$('.scene').forEach(function (scene) {
    if (!hasIO || reduce) return;
    scene.classList.remove('lit');
    onView(scene, function (v) { scene.classList.toggle('lit', v); }, { rootMargin: '-40% 0px -40% 0px' });
  });

  /* ================= 8) Quick skin switch (the real heart unit × 16 skins) ================= */
  var qsStage = $('#qs-stage'), qsName = $('#qs-name'), qsImgs = [], qsIdx = chosen, qsTimer = null, qsVisible = false;
  function qsBuild() {
    if (qsImgs.length || !qsStage) return;
    SK.forEach(function (t, n) {
      var i = document.createElement('img');
      i.alt = ''; i.width = 1400; i.height = 229; i.decoding = 'async';
      if (!reduce || n === chosen) i.src = fireSrc(n);
      qsStage.appendChild(i); qsImgs.push(i);
    });
    qsShow(chosen);
  }
  function qsShow(n) {
    if (!qsImgs.length) return;
    if (!qsImgs[n].getAttribute('src')) qsImgs[n].src = fireSrc(n);
    qsImgs.forEach(function (im, k) { im.classList.toggle('on', k === n); });
    qsIdx = n; if (qsName) qsName.textContent = SK[n].name;
  }
  function qsTick() { var nx = (qsIdx + 1) % qsImgs.length; if (qsImgs[nx].complete) qsShow(nx); }
  function qsRun() { clearInterval(qsTimer); if (!reduce && qsVisible && !document.hidden) qsTimer = setInterval(qsTick, 900); }
  function qsSync() { if (qsImgs.length && (reduce || !qsVisible)) qsShow(chosen); }
  if (qsStage) {
    onView(qsStage, function (near) { if (near) qsBuild(); }, { rootMargin: '500px 0px' });
    onView(qsStage, function (v) { qsVisible = v; qsRun(); }, { threshold: 0.4 });
    document.addEventListener('visibilitychange', qsRun);
  }

  /* ================= 9) Leaving the tab stops every sound ================= */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {            // 戻ってきたら、見えている FIRE WATCH はまた動く(止めたのが自分でなければ)
      clips.forEach(function (c) { if (c.ambient && c.visible && !c.userPaused) c.ambientGo(); });
      return;
    }
    clips.forEach(function (c) { c.halt(); if (c.sounding) { c.mute(); Sound.release(c.owner); } });
    abs.forEach(function (a) { if (a.busy()) a.stop(); });
  });

  // for checking in the browser console only
  window.APATT_A4 = { clips: clips, abs: abs, skin: function () { return chosen; }, skinMeta: skinMeta };
})();
