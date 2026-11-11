/* =========================================================
   360° Nature — application (sans serveur, sans abonnement)
   - Contenu publié : data/site-data.json (chargé au démarrage)
   - Modifications locales : IndexedDB (textes + photos + PDF)
   - Publication : exporter la sauvegarde .json → remplacer data/site-data.json
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- Utilitaires ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DEFAULTS = window.DEFAULT_SITE_DATA || {};
  var GROUPS = ['Mammifères', 'Oiseaux', 'Reptiles & Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Flore', 'Champignons', 'Préhistoire', 'Autres'];
  var SHEETJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  function uid(p) { return (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function isStr(v) { return typeof v === 'string'; }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function slug(s) { return fold(s).replace(/[^a-z0-9]+/g, ''); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; }
  function plain(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; }

  function safeUrl(u) {
    u = str(u);
    if (!u) return '';
    if (/^@[a-z]+$/i.test(u)) return u;
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^www\./i.test(u) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(u)) return 'https://' + u;
    return '';
  }
  // Résout un lien de type « @spotify » vers S.links.spotify
  function linkOf(u) {
    u = str(u);
    if (u.charAt(0) === '@') return safeUrl(S.links[u.slice(1)] || '');
    return safeUrl(u);
  }
  function safeImgRef(r) {
    r = str(r);
    if (!r) return '';
    if (/^(data:image\/|blob:|https?:|idb:)/i.test(r)) return r;
    if (!/^[a-z]+:/i.test(r)) return r; // chemin relatif (assets/…)
    return '';
  }

  /* Nettoyage du HTML saisi dans le mode édition (balises autorisées uniquement) */
  var ALLOWED = { EM: 1, I: 1, B: 1, STRONG: 1, BR: 1, P: 1 };
  function sanitize(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = String(html == null ? '' : html);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) {
          walk(n);
          var tag = n.tagName;
          if (tag === 'DIV') {
            var p = document.createElement('p');
            while (n.firstChild) p.appendChild(n.firstChild);
            n.replaceWith(p);
          } else if (!ALLOWED[tag]) {
            if (tag === 'SCRIPT' || tag === 'STYLE') { n.remove(); return; }
            while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
            n.remove();
          } else {
            Array.prototype.slice.call(n.attributes).forEach(function (a) { n.removeAttribute(a.name); });
          }
        } else if (n.nodeType !== 3) {
          n.remove();
        }
      });
    })(tpl.content);
    return tpl.innerHTML.replace(/<p><br><\/p>/g, '').trim();
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var ks = path.split('.'), last = ks.pop();
    var o = ks.reduce(function (o, k) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; return o[k]; }, obj);
    o[last] = val;
  }

  /* ---------------- Toast ---------------- */
  var toastT;
  function toast(msg, isError) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, isError ? 6000 : 3200);
  }

  /* ---------------- IndexedDB (gratuit, local au navigateur) ---------------- */
  var DB = {
    db: null,
    open: function () {
      var me = this;
      return new Promise(function (res) {
        try {
          if (!window.indexedDB) return res(null);
          var r = indexedDB.open('360-nature', 1);
          r.onupgradeneeded = function () {
            var d = r.result;
            if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
            if (!d.objectStoreNames.contains('media')) d.createObjectStore('media');
          };
          r.onsuccess = function () { me.db = r.result; res(me.db); };
          r.onerror = function () { res(null); };
          r.onblocked = function () { res(null); };
        } catch (e) { res(null); }
      });
    },
    tx: function (store, mode, fn) {
      var me = this;
      return new Promise(function (res, rej) {
        if (!me.db) return rej(new Error('IndexedDB indisponible'));
        try {
          var t = me.db.transaction(store, mode), st = t.objectStore(store), out;
          var req = fn(st);
          if (req) req.onsuccess = function () { out = req.result; };
          t.oncomplete = function () { res(out); };
          t.onerror = t.onabort = function () { rej(t.error || new Error('Erreur IndexedDB')); };
        } catch (e) { rej(e); }
      });
    },
    get: function (s, k) { return this.tx(s, 'readonly', function (st) { return st.get(k); }); },
    put: function (s, k, v) { return this.tx(s, 'readwrite', function (st) { return st.put(v, k); }); },
    del: function (s, k) { return this.tx(s, 'readwrite', function (st) { return st.delete(k); }); },
    keys: function (s) { return this.tx(s, 'readonly', function (st) { return st.getAllKeys(); }); },
    clear: function (s) { return this.tx(s, 'readwrite', function (st) { return st.clear(); }); }
  };

  /* ---------------- Médias (photos, PDF) ---------------- */
  var mediaURL = new Map();   // id -> objectURL
  var mediaMem = new Map();   // id -> {blob,name,type} (secours si IndexedDB indisponible)
  var dataURLCache = new Map();

  async function putMedia(blob, name) {
    var id = uid('m');
    var rec = { blob: blob, name: name || 'fichier', type: blob.type || '' };
    try { await DB.put('media', id, rec); } catch (e) { mediaMem.set(id, rec); }
    mediaURL.set(id, URL.createObjectURL(blob));
    return 'idb:' + id;
  }
  async function getMediaRec(ref) {
    var id = ref.slice(4);
    if (mediaMem.has(id)) return mediaMem.get(id);
    try { return await DB.get('media', id); } catch (e) { return null; }
  }
  async function hydrateMedia() {
    if (!DB.db) return;
    try {
      var keys = await DB.keys('media');
      for (var i = 0; i < keys.length; i++) {
        if (mediaURL.has(keys[i])) continue;
        var rec = await DB.get('media', keys[i]);
        if (rec && rec.blob) mediaURL.set(keys[i], URL.createObjectURL(rec.blob));
      }
    } catch (e) { /* ignore */ }
  }
  function dataURLtoBlob(d) {
    var m = /^data:([^,]*?)(;base64)?,([\s\S]*)$/.exec(d);
    if (!m) return null;
    var bytes;
    if (m[2]) {
      var bin = atob(m[3]); bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else { bytes = new TextEncoder().encode(decodeURIComponent(m[3])); }
    return new Blob([bytes], { type: m[1] || 'application/octet-stream' });
  }
  // URL utilisable dans <img src> / <a href>
  function src(ref) {
    ref = str(ref);
    if (!ref) return '';
    if (ref.indexOf('idb:') === 0) return mediaURL.get(ref.slice(4)) || '';
    return ref;
  }
  // URL pour ouvrir un document (les data: URL sont bloquées en nouvel onglet → blob:)
  function docHref(ref) {
    ref = str(ref);
    if (ref.indexOf('data:') === 0) {
      if (!dataURLCache.has(ref)) {
        var b = dataURLtoBlob(ref);
        dataURLCache.set(ref, b ? URL.createObjectURL(b) : '');
      }
      return dataURLCache.get(ref);
    }
    var u = src(ref);
    return /^(blob:|https?:)/i.test(u) || !/^[a-z]+:/i.test(u) ? u : '';
  }
  function blobToDataURL(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }
  function loadImageEl(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image illisible')); };
      im.src = url;
    });
  }
  // Compression côté navigateur (max 1600 px, WebP ou JPEG)
  async function compressImage(file, max, quality) {
    max = max || 1600; quality = quality || 0.82;
    var source;
    try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { source = await loadImageEl(file); }
    var w = source.width, h = source.height;
    if (!w || !h) throw new Error('image vide');
    var scale = Math.min(1, max / Math.max(w, h));
    var cw = Math.round(w * scale), ch = Math.round(h * scale);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var ctx = c.getContext('2d');
    ctx.drawImage(source, 0, 0, cw, ch);
    if (source.close) source.close();
    var blob = await new Promise(function (r) { c.toBlob(r, 'image/webp', quality); });
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', quality); });
    if (!blob) throw new Error('compression impossible');
    if (scale === 1 && file.size < blob.size && /image\/(jpeg|png|webp)/.test(file.type)) return file;
    return blob;
  }
  async function storeImage(file) {
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) throw new Error('pas une image');
    var blob = await compressImage(file);
    return putMedia(blob, file.name);
  }

  function collectRefs(obj, out) {
    out = out || new Set();
    if (isStr(obj)) { if (obj.indexOf('idb:') === 0) out.add(obj.slice(4)); }
    else if (Array.isArray(obj)) obj.forEach(function (v) { collectRefs(v, out); });
    else if (obj && typeof obj === 'object') Object.keys(obj).forEach(function (k) { collectRefs(obj[k], out); });
    return out;
  }
  async function mapStringsAsync(obj, fn) {
    if (isStr(obj)) return fn(obj);
    if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) obj[i] = await mapStringsAsync(obj[i], fn); return obj; }
    if (obj && typeof obj === 'object') { for (var k of Object.keys(obj)) obj[k] = await mapStringsAsync(obj[k], fn); return obj; }
    return obj;
  }
  // Supprime de IndexedDB les fichiers qui ne sont plus utilisés
  async function gcMedia() {
    if (!DB.db) return;
    try {
      var used = collectRefs(S), keys = await DB.keys('media');
      for (var i = 0; i < keys.length; i++) {
        if (!used.has(keys[i])) {
          await DB.del('media', keys[i]);
          if (mediaURL.has(keys[i])) { URL.revokeObjectURL(mediaURL.get(keys[i])); mediaURL.delete(keys[i]); }
        }
      }
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Données ---------------- */
  var S = null;           // état courant du site
  var hasLocal = false;   // des modifications locales existent

  function pickStrings(o) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (isStr(o[k])) out[k] = o[k]; });
    return out;
  }
  function arr(v, fb) { return Array.isArray(v) ? v : (fb || []); }
  function uniqIds(list, prefix) {
    var seen = new Set();
    return list.filter(Boolean).map(function (x) {
      if (!x.id || seen.has(x.id)) x.id = uid(prefix);
      seen.add(x.id);
      return x;
    });
  }
  function normalize(d) {
    var D = DEFAULTS;
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = clone(D);
    var out = {
      schema: 1,
      updatedAt: str(d.updatedAt) || D.updatedAt || new Date(0).toISOString(),
      links: Object.assign({}, D.links, pickStrings(d.links)),
      texts: Object.assign({}, D.texts, pickStrings(d.texts)),
      aboutPhoto: isStr(d.aboutPhoto) ? d.aboutPhoto : D.aboutPhoto,
      heroPhoto: isStr(d.heroPhoto) ? d.heroPhoto : (D.heroPhoto || 'assets/img/hero-martin-pecheur.jpg')
    };
    if (/6PAnhb5Rq2GJF6ACGffCvB/.test(out.links.spotify)) { if (!out.links.jpt) out.links.jpt = out.links.spotify; out.links.spotify = ''; }
    out.podcasts = uniqIds(arr(d.podcasts, D.podcasts).map(function (p) {
      if (!p || typeof p !== 'object') return null;
      return {
        id: str(p.id), title: str(p.title) || 'Émission sans titre', subtitle: str(p.subtitle),
        description: str(p.description), cover: isStr(p.cover) ? p.cover : '', theme: str(p.theme) || 'forest',
        featured: !!p.featured,
        links: arr(p.links).filter(function (l) { return l && typeof l === 'object'; })
          .map(function (l) { return { label: str(l.label) || 'Écouter', url: str(l.url) }; })
      };
    }), 'pod');
    out.episodes = uniqIds(arr(d.episodes, D.episodes).map(function (e) {
      if (!e || typeof e !== 'object') return null;
      return { id: str(e.id), podcastId: str(e.podcastId), number: str(e.number), title: str(e.title) || 'Épisode sans titre', date: str(e.date), url: str(e.url) };
    }), 'ep');
    out.species = uniqIds(arr(d.species, D.species).map(function (s) {
      if (!s || typeof s !== 'object') return null;
      return {
        id: str(s.id), name: str(s.name) || 'Espèce sans nom', latin: str(s.latin), group: str(s.group) || 'Autres',
        status: str(s.status), description: str(s.description), habitat: str(s.habitat), fact: str(s.fact),
        photos: arr(s.photos).filter(isStr).filter(Boolean),
        docs: arr(s.docs).filter(function (x) { return x && isStr(x.ref) && x.ref; })
          .map(function (x) { return { name: str(x.name) || 'Document', ref: x.ref, type: str(x.type) }; }),
        episodeId: str(s.episodeId), episodeUrl: str(s.episodeUrl)
      };
    }), 'sp');
    out.observations = uniqIds(arr(d.observations, D.observations).map(function (o) {
      if (!o || typeof o !== 'object') return null;
      return { id: str(o.id), photo: isStr(o.photo) ? o.photo : '', name: str(o.name) || 'Observation', latin: str(o.latin), caption: str(o.caption), date: str(o.date), place: str(o.place) };
    }), 'obs');
    return out;
  }

  var setStatus = function (t) { var el = $('#saveStatus'); if (el) el.textContent = t; };
  var writeLocal = debounce(async function () {
    try {
      if (!DB.db) throw new Error('no db');
      await DB.put('kv', 'site', S);
      hasLocal = true;
      setStatus('✓ Enregistré sur cet appareil');
    } catch (e) {
      setStatus('⚠ Non enregistré — exportez la sauvegarde');
      toast("Le navigateur bloque l'enregistrement local (navigation privée ?). Pensez à exporter la sauvegarde.", true);
    }
  }, 350);
  function persist() {
    S.updatedAt = new Date().toISOString();
    setStatus('Enregistrement…');
    writeLocal();
  }

  /* ---------------- Rendu ---------------- */
  function safeRender(name, fn) {
    try { fn(); }
    catch (e) {
      console.error('[360] rendu ' + name, e);
    }
  }
  function placeholder(label) {
    return '<div class="ph"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-leaf"/></svg><span>' + esc(label || 'Pas encore de photo') + '</span></div>';
  }
  function imgTag(ref, alt, extra) {
    var u = src(safeImgRef(ref));
    if (!u) return placeholder();
    return '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" data-fallback ' + (extra || '') + '>';
  }

  function renderTexts() {
    $$('[data-edit]').forEach(function (el) {
      if (el === document.activeElement) return;
      var v = getPath(S, el.dataset.edit);
      el.innerHTML = sanitize(isStr(v) ? v : '');
    });
    var chips = str(plain(S.texts.aboutChips)).split(',').map(str).filter(Boolean);
    $('#aboutChips').innerHTML = chips.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
      '<li class="admin-only" style="list-style:none"><button type="button" class="chip-btn" data-action="edit-chips">Modifier les mots-clés</button></li>';
    var hb = $('#heroBg'), hu = src(safeImgRef(S.heroPhoto));
    hb.style.backgroundImage = hu ? 'url("' + hu.replace(/"/g, '%22') + '")' : 'none';
    var ap = $('#aboutPhoto'), au = S.aboutPhoto;
    ap.innerHTML = imgTag(au, 'Illustration 360° Nature — Gabriel Eyler, photographe naturaliste', /logo/.test(au) ? 'class="contain"' : '');
  }

  function renderLinks() {
    $$('[data-link]').forEach(function (a) {
      var u = safeUrl(getPath(S, a.dataset.link));
      if (u) {
        a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.classList.remove('is-empty'); a.removeAttribute('aria-hidden'); a.hidden = false;
      } else {
        a.removeAttribute('href'); a.classList.add('is-empty');
        if (!a.classList.contains('social')) a.hidden = true;
      }
    });
    // Footer « Écouter »
    var L = S.links, items = [
      ['spotify', '360° Nature — Spotify'], ['apple', '360° Nature — Apple Podcasts'], ['creator', 'Monde de la Nature'], ['jpt', 'JPT | Journey to Prehistoric Time']
    ].filter(function (x) { return safeUrl(L[x[0]]); });
    $('#footListen').innerHTML = items.map(function (x) {
      return '<li><a href="' + esc(safeUrl(L[x[0]])) + '" target="_blank" rel="noopener noreferrer">' + esc(x[1]) +
        ' <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-link"/></svg></a></li>';
    }).join('') || '<li>Liens bientôt disponibles</li>';
    var mail = str(L.email);
    $('#footMail').innerHTML = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)
      ? '<a href="mailto:' + esc(mail) + '">' + esc(mail) + '</a>'
      : '<a href="' + esc(safeUrl(L.instagram) || '#observations') + '"' + (safeUrl(L.instagram) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>Écrire sur Instagram</a>';
  }

  var PLATFORMS = [
    { key: 'spotify', cls: 'platform--spotify', icon: 'i-spotify', small: '360° Nature sur', label: 'Spotify', optional: true },
    { key: 'apple', cls: 'platform--apple', icon: 'i-apple-podcasts', small: '360° Nature sur', label: 'Apple Podcasts' },
    { key: 'creator', cls: 'platform--creator', icon: 'i-spotify', small: 'Épisode à la une · Spotify for Creators', label: 'Monde de la Nature' },
    { key: 'jpt', cls: 'platform--spotify', icon: 'i-spotify', small: 'Podcast Préhistoire · Spotify', label: 'JPT | Journey to Prehistoric Time' }
  ];
  function renderPlatforms() {
    $('#platforms').innerHTML = PLATFORMS.filter(function (p) { return !p.optional || safeUrl(S.links[p.key]) || isAdmin; }).map(function (p) {
      var u = safeUrl(S.links[p.key]);
      var logo = '<span class="platform__logo"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + p.icon + '"/></svg></span>';
      var txt = '<span><small>' + esc(u ? p.small : p.small + ' · lien bientôt disponible') + '</small><b>' + esc(p.label) + '</b></span>';
      if (!u) return '<div class="platform ' + p.cls + '" aria-disabled="true" style="opacity:.7;cursor:default">' + logo + txt + '</div>';
      return '<a class="platform ' + p.cls + '" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + logo + txt +
        '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-link"/></svg></a>';
    }).join('');

    // Lecteur mis en avant : 360° Nature (Spotify si renseigné, sinon Apple Podcasts)
    var m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(show|episode)\/([A-Za-z0-9]+)/.exec(S.links.spotify || '');
    var a = /podcasts\.apple\.com\/([a-z]{2})\/podcast\/(?:[^/?#]+\/)?id(\d+)/.exec(S.links.apple || '');
    var player = $('#player'), embed = '', iframe = '';
    if (m) {
      embed = 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator&theme=0';
      iframe = '<iframe src="' + esc(embed) + '" title="Lecteur Spotify — 360° Nature" loading="lazy" style="height:352px" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';
    } else if (a) {
      embed = 'https://embed.podcasts.apple.com/' + a[1] + '/podcast/360-degres-nature/id' + a[2] + '?theme=dark';
      iframe = '<iframe src="' + esc(embed) + '" title="Lecteur Apple Podcasts — 360° Nature" loading="lazy" style="height:450px" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"></iframe>';
    }
    var cur = player.querySelector('iframe');
    if (!iframe) player.innerHTML = '<div class="player-fallback"><p>Le lecteur apparaîtra ici dès qu\'un lien Spotify ou Apple Podcasts de 360° Nature sera renseigné.</p></div>';
    else if (!cur || cur.getAttribute('src') !== embed) player.innerHTML = iframe;
    $('#featureLinks').innerHTML = [['spotify', 'Écouter sur Spotify', 'btn--ocre'], ['apple', 'Écouter sur Apple Podcasts', 'btn--glass']]
      .filter(function (x) { return safeUrl(S.links[x[0]]); })
      .map(function (x) { return '<a class="btn btn--sm ' + x[2] + '" href="' + esc(safeUrl(S.links[x[0]])) + '" target="_blank" rel="noopener noreferrer">' + x[1] + '</a>'; }).join('');
  }

  function adminTools(kind, id, extra) {
    return '<div class="admin-tools admin-only">' + (extra || '') +
      '<button type="button" data-action="edit-' + kind + '" data-id="' + esc(id) + '" title="Modifier" aria-label="Modifier">✎</button>' +
      '<button type="button" class="danger" data-action="del-' + kind + '" data-id="' + esc(id) + '" title="Supprimer" aria-label="Supprimer">🗑</button></div>';
  }

  function renderShows() {
    var el = $('#shows');
    if (!S.podcasts.length) { el.innerHTML = '<div class="empty">Aucune émission pour le moment.</div>'; return; }
    el.innerHTML = S.podcasts.map(function (p) {
      var cover = src(safeImgRef(p.cover));
      var anyLink = p.links.some(function (l) { return linkOf(l.url); });
      var abbr = p.title.split('|')[0].trim();
      var initials = p.title.indexOf('|') > 0 && abbr.length <= 5 ? abbr.toUpperCase() : p.title.replace(/[^A-Za-zÀ-ÿ0-9 |]/g, '').split(/[\s|]+/).filter(Boolean).slice(0, 3).map(function (w) { return w[0]; }).join('').toUpperCase();
      var links = p.links.map(function (l, i) {
        var u = linkOf(l.url);
        if (!u) return anyLink ? '' : '<span class="badge-soon">' + esc(l.label) + ' · lien bientôt disponible</span>';
        return '<a class="btn btn--sm ' + (i === 0 ? 'btn--forest' : 'btn--outline') + '" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + '</a>';
      }).join('');
      return '<article class="show' + (p.featured ? ' show--feature' : '') + '" style="position:relative">' +
        adminTools('show', p.id, '<button type="button" data-action="up-show" data-id="' + esc(p.id) + '" title="Monter" aria-label="Monter">↑</button>') +
        '<div class="show__cover t-' + esc(p.theme) + '">' +
          (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy" data-fallback' + (/logo/.test(p.cover) ? ' class="logo"' : '') + '>' : '<span class="initials">' + esc(initials || '360') + '</span>') +
        '</div>' +
        '<div class="show__body"><p class="show__sub">' + esc(p.subtitle) + '</p><h4 class="show__title">' + esc(p.title) + '</h4>' +
        '<p class="show__desc">' + esc(p.description) + '</p><div class="show__links">' + links + '</div></div></article>';
    }).join('');
  }

  function episodeUrl(ep) { return ep ? safeUrl(ep.url) : ''; }
  function renderEpisodes() {
    var el = $('#episodes');
    if (!S.episodes.length) {
      el.innerHTML = '<li class="empty">Les épisodes et les espèces qui y sont présentées apparaîtront ici.</li>';
      return;
    }
    el.innerHTML = S.episodes.map(function (ep, i) {
      var pod = S.podcasts.find(function (p) { return p.id === ep.podcastId; });
      var sps = S.species.filter(function (s) { return s.episodeId === ep.id; });
      var u = episodeUrl(ep);
      var meta = [pod && pod.title, ep.date].filter(Boolean).map(esc).join(' · ');
      return '<li class="episode">' +
        '<span class="episode__num">' + esc(ep.number || String(i + 1).padStart(2, '0')) + '</span>' +
        '<div><div class="episode__title">' + esc(ep.title) + '</div>' + (meta ? '<div class="episode__meta">' + meta + '</div>' : '') +
        (sps.length ? '<div class="episode__species">' + sps.map(function (s) {
          return '<button type="button" class="tag" data-action="open-species" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>';
        }).join('') + '</div>' : '') + '</div>' +
        '<div class="episode__actions">' +
          (u ? '<a class="btn btn--ocre btn--sm" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-headphones"/></svg>Écouter</a>'
             : '<span class="badge-soon">Lien à venir</span>') +
          '<button type="button" class="chip-btn admin-only" data-action="edit-episode" data-id="' + esc(ep.id) + '">Modifier</button>' +
          '<button type="button" class="chip-btn admin-only" data-action="del-episode" data-id="' + esc(ep.id) + '">Supprimer</button>' +
        '</div></li>';
    }).join('');
  }

  /* --- Fiches espèces --- */
  var filter = { q: '', group: 'Tous' };
  function groupsInData() {
    var set = new Set(GROUPS);
    S.species.forEach(function (s) { set.add(s.group); });
    return Array.from(set);
  }
  function renderFilters() {
    var counts = {};
    S.species.forEach(function (s) { counts[s.group] = (counts[s.group] || 0) + 1; });
    var gs = groupsInData().filter(function (g) { return counts[g] || GROUPS.indexOf(g) > -1 && g !== 'Autres'; });
    if (filter.group !== 'Tous' && gs.indexOf(filter.group) < 0) filter.group = 'Tous';
    $('#spFilters').innerHTML = ['Tous'].concat(gs).map(function (g) {
      var n = g === 'Tous' ? S.species.length : (counts[g] || 0);
      return '<button type="button" class="filter" data-group="' + esc(g) + '" aria-pressed="' + (filter.group === g) + '">' + esc(g) + '<small>' + n + '</small></button>';
    }).join('');
  }
  function speciesEpisode(s) {
    var ep = S.episodes.find(function (e) { return e.id === s.episodeId; });
    return { ep: ep, url: episodeUrl(ep) || safeUrl(s.episodeUrl) };
  }
  function renderSpecies() {
    renderFilters();
    var q = fold(filter.q).trim();
    var list = S.species.filter(function (s) {
      if (filter.group !== 'Tous' && s.group !== filter.group) return false;
      if (!q) return true;
      var ep = speciesEpisode(s).ep;
      return fold([s.name, s.latin, s.group, s.status, s.description, s.habitat, s.fact, ep && ep.title].join(' ')).indexOf(q) > -1;
    });
    $('#spCount').textContent = list.length + (list.length > 1 ? ' fiches' : ' fiche') + (filter.group !== 'Tous' || q ? ' trouvée' + (list.length > 1 ? 's' : '') : '');
    var grid = $('#spGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + (S.species.length ? 'Aucune fiche ne correspond à votre recherche.' : 'Aucune fiche pour le moment.') + '</div>';
      return;
    }
    grid.innerHTML = list.map(function (s) {
      var e = speciesEpisode(s);
      return '<article class="sp-card">' +
        '<button type="button" class="stretch" data-action="open-species" data-id="' + esc(s.id) + '" aria-label="Ouvrir la fiche ' + esc(s.name) + '"></button>' +
        adminTools('species', s.id) +
        '<div class="sp-card__media">' + imgTag(s.photos[0], s.name) +
          '<span class="sp-card__group">' + esc(s.group) + '</span>' +
          (s.photos.length > 1 ? '<span class="sp-card__count">' + s.photos.length + ' photos</span>' : '') + '</div>' +
        '<div class="sp-card__body"><span class="sp-card__name">' + esc(s.name) + '</span>' +
          (s.latin ? '<span class="sp-card__latin">' + esc(s.latin) + '</span>' : '') +
          (s.description ? '<p class="sp-card__desc">' + esc(s.description) + '</p>' : '') +
          '<div class="sp-card__foot">' +
            (e.url || e.ep ? '<span class="pill pill--ep"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-headphones"/></svg>Présentée dans un épisode</span>' : '') +
            (s.docs.length ? '<span class="pill pill--doc">' + s.docs.length + ' document' + (s.docs.length > 1 ? 's' : '') + '</span>' : '') +
          '</div></div></article>';
    }).join('');
  }

  function renderObservations() {
    var grid = $('#obsGrid');
    var html = S.observations.map(function (o, i) {
      var dp = [o.date, o.place].filter(Boolean).join(' · ');
      return '<figure class="obs">' +
        '<button type="button" class="obs__open" data-action="open-obs" data-id="' + esc(o.id) + '" aria-label="Agrandir : ' + esc(o.name) + '">' + imgTag(o.photo, o.name + (o.latin ? ' (' + o.latin + ')' : '')) + '</button>' +
        '<span class="obs__num">N°' + String(i + 1).padStart(2, '0') + '</span>' +
        adminTools('obs', o.id,
          '<button type="button" data-action="left-obs" data-id="' + esc(o.id) + '" title="Déplacer avant" aria-label="Déplacer avant">←</button>' +
          '<button type="button" data-action="right-obs" data-id="' + esc(o.id) + '" title="Déplacer après" aria-label="Déplacer après">→</button>') +
        '<figcaption><b>' + esc(o.name) + '</b>' + (o.latin ? '<i>' + esc(o.latin) + '</i>' : '') + (dp ? '<small>' + esc(dp) + '</small>' : '') + '</figcaption>' +
        '</figure>';
    }).join('');
    html += '<button type="button" class="obs obs--add admin-only" data-action="add-obs">+ Ajouter une observation</button>';
    grid.innerHTML = S.observations.length ? html : '<div class="empty" style="grid-column:1/-1">Aucune observation pour le moment.</div>' + html;
  }

  function refreshImportTarget() {
    var sel = $('#importTarget');
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="auto">Automatique (d\'après le nom du fichier)</option>' +
      S.species.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('');
    if (cur && sel.querySelector('option[value="' + CSS.escape(cur) + '"]')) sel.value = cur;
  }

  function renderAll() {
    safeRender('textes', renderTexts);
    safeRender('liens', renderLinks);
    safeRender('plateformes', renderPlatforms);
    safeRender('émissions', renderShows);
    safeRender('épisodes', renderEpisodes);
    safeRender('espèces', renderSpecies);
    safeRender('observations', renderObservations);
    safeRender('import', refreshImportTarget);
    if (isAdmin) enableEditing();
  }

  /* ---------------- Fenêtres (modales) ---------------- */
  var lastFocus = null, onModalClose = null;
  function openModal(title, html, opts) {
    opts = opts || {};
    var m = $('#modal');
    if (m.hidden) lastFocus = document.activeElement;
    if (onModalClose) { var f = onModalClose; onModalClose = null; f(); }
    $('#modalTitle').textContent = title;
    var body = $('#modalBody');
    body.innerHTML = html;
    m.classList.toggle('modal--narrow', !!opts.narrow);
    m.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    onModalClose = opts.onClose || null;
    setTimeout(function () {
      var f = body.querySelector('[autofocus]') || body.querySelector('input,select,textarea,button,a[href]') || $('.modal__close');
      if (f) f.focus({ preventScroll: true });
    }, 30);
    body.scrollTop = 0;
    return body;
  }
  function closeModal() {
    var m = $('#modal');
    if (m.hidden) return;
    m.hidden = true;
    $('#modalBody').innerHTML = '';
    document.documentElement.style.overflow = '';
    if (onModalClose) { var f = onModalClose; onModalClose = null; f(); }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* */ }
  }
  function confirmBox(msg, okLabel) {
    return new Promise(function (res) {
      var done = false;
      var b = openModal('Confirmation', '<p>' + esc(msg) + '</p><div class="form__actions" style="border:0;padding:0">' +
        '<button type="button" class="btn btn--outline btn--sm" data-c="0">Annuler</button>' +
        '<button type="button" class="btn btn--danger btn--sm" data-c="1">' + esc(okLabel || 'Confirmer') + '</button></div>',
        { narrow: true, onClose: function () { if (!done) res(false); } });
      b.addEventListener('click', function (e) {
        var c = e.target.closest('[data-c]');
        if (!c) return;
        done = true; res(c.dataset.c === '1'); closeModal();
      });
    });
  }

  /* --- Détail fiche espèce --- */
  function openSpecies(id) {
    var s = S.species.find(function (x) { return x.id === id; });
    if (!s) return toast('Fiche introuvable.', true);
    var e = speciesEpisode(s);
    var photos = s.photos.filter(function (p) { return src(safeImgRef(p)); });
    var docs = s.docs.map(function (d) {
      var h = docHref(d.ref);
      if (!h) return '';
      var ext = (d.name.split('.').pop() || 'doc').slice(0, 4);
      return '<li><a href="' + esc(h) + '" target="_blank" rel="noopener noreferrer"><span class="ext">' + esc(ext) + '</span>' + esc(d.name) + '</a>' +
        '<a href="' + esc(h) + '" download="' + esc(d.name) + '" style="margin-top:4px;font-size:12.5px;border:0;background:none;padding:2px 14px">Télécharger</a></li>';
    }).join('');
    var html = '<div class="sp-detail">' +
      '<div class="gallery"><div class="gallery__main">' + (photos.length ? imgTag(photos[0], s.name) : placeholder()) + '</div>' +
        (photos.length > 1 ? '<div class="gallery__thumbs">' + photos.map(function (p, i) {
          return '<button type="button" data-g="' + i + '" aria-current="' + (i === 0) + '" aria-label="Photo ' + (i + 1) + '">' + imgTag(p, '') + '</button>';
        }).join('') + '</div>' : '') + '</div>' +
      '<div>' +
        '<span class="sp-card__group" style="position:static;display:inline-block;background:var(--sage-soft);margin-bottom:10px">' + esc(s.group) + '</span>' +
        (s.latin ? '<p class="sp-detail__latin">' + esc(s.latin) + '</p>' : '') +
        (s.description ? '<p>' + esc(s.description) + '</p>' : '') +
        '<dl>' +
          (s.habitat ? '<div><dt>Habitat</dt><dd>' + esc(s.habitat) + '</dd></div>' : '') +
          (s.status ? '<div><dt>Statut</dt><dd>' + esc(s.status) + '</dd></div>' : '') +
        '</dl>' +
        (s.fact ? '<p class="fact"><b>Le saviez-vous ?</b> ' + esc(s.fact) + '</p>' : '') +
        (docs ? '<h4 style="font-size:16px;margin:18px 0 10px">Documents</h4><ul class="docs">' + docs + '</ul>' : '') +
        '<div class="sp-detail__actions">' +
          (e.url ? '<a class="btn btn--ocre" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-headphones"/></svg>Écouter l\'épisode associé</a>' : '') +
          (e.ep && !e.url ? '<span class="badge-soon">Épisode : ' + esc(e.ep.title) + ' — lien à venir</span>' : '') +
          (isAdmin ? '<button type="button" class="btn btn--outline btn--sm" data-action="edit-species" data-id="' + esc(s.id) + '">Modifier la fiche</button>' : '') +
        '</div>' +
        (e.ep && e.url ? '<p style="font-size:13px;color:var(--ink-soft);margin-top:10px">Épisode : ' + esc(e.ep.title) + '</p>' : '') +
      '</div></div>';
    var body = openModal(s.name, html);
    body.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-g]');
      if (!b) return;
      var i = +b.dataset.g;
      $('.gallery__main', body).innerHTML = imgTag(photos[i], s.name);
      $$('[data-g]', body).forEach(function (x) { x.setAttribute('aria-current', String(x === b)); });
    });
  }

  function openObservation(id) {
    var o = S.observations.find(function (x) { return x.id === id; });
    if (!o) return;
    var sp = S.species.find(function (s) { return slug(s.name) === slug(o.name) || (o.latin && slug(s.latin) === slug(o.latin)); });
    var dp = [o.date, o.place].filter(Boolean).join(' · ');
    var body = openModal(o.name, '<div class="lightbox">' + imgTag(o.photo, o.name) +
      (o.latin ? '<p class="latin" style="margin-top:14px">' + esc(o.latin) + '</p>' : '') +
      (o.caption ? '<p style="margin-top:8px">' + esc(o.caption) + '</p>' : '') +
      (dp ? '<p class="meta">' + esc(dp) + '</p>' : '') +
      '<div class="sp-detail__actions">' +
        (sp ? '<button type="button" class="btn btn--forest btn--sm" data-action="open-species" data-id="' + esc(sp.id) + '">Voir la fiche espèce</button>' : '') +
        (safeUrl(S.links.instagram) ? '<a class="btn btn--outline btn--sm" href="' + esc(safeUrl(S.links.instagram)) + '" target="_blank" rel="noopener noreferrer">Voir sur Instagram</a>' : '') +
        (isAdmin ? '<button type="button" class="btn btn--outline btn--sm" data-action="edit-obs" data-id="' + esc(o.id) + '">Modifier</button>' : '') +
      '</div></div>');
    return body;
  }

  /* ---------------- Mode édition (admin) ---------------- */
  var isAdmin = false;
  var PIN_KEY = '360nature.pin';

  async function hashPin(pin) {
    var txt = '360nature:' + pin;
    try {
      if (window.crypto && crypto.subtle) {
        var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
    } catch (e) { /* secours ci-dessous */ }
    var h = 2166136261;
    for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'f' + (h >>> 0).toString(16);
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* */ } }

  function askPin() {
    var stored = lsGet(PIN_KEY);
    var creating = !stored;
    var body = openModal(creating ? 'Créer votre code PIN' : 'Mode édition', '<form class="pin" autocomplete="off">' +
      (creating ? '<p>Choisissez un code PIN (4 à 8 chiffres). Il protège l\'accès au mode édition sur cet appareil.</p>' : '<p>Entrez votre code PIN pour modifier le site.</p>') +
      '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" name="pin" aria-label="Code PIN" autofocus>' +
      (creating ? '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" name="pin2" aria-label="Confirmer le code PIN" placeholder="Confirmer">' : '') +
      '<p class="err" role="alert"></p>' +
      '<button class="btn btn--forest" type="submit">' + (creating ? 'Créer et entrer' : 'Entrer') + '</button>' +
      (creating ? '' : '<button type="button" class="link-btn" data-forgot style="font-size:13px;color:var(--ink-soft)">Code oublié ?</button>') +
      '</form>', { narrow: true });
    var form = $('form', body), err = $('.err', body);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var pin = form.pin.value.trim();
      if (!/^\d{4,8}$/.test(pin)) { err.textContent = 'Le code doit contenir 4 à 8 chiffres.'; return; }
      if (creating) {
        if (pin !== form.pin2.value.trim()) { err.textContent = 'Les deux codes ne correspondent pas.'; return; }
        lsSet(PIN_KEY, await hashPin(pin));
      } else if ((await hashPin(pin)) !== stored) {
        err.textContent = 'Code incorrect.'; form.pin.value = ''; form.pin.focus(); return;
      }
      closeModal();
      setAdmin(true);
    });
    var forgot = $('[data-forgot]', body);
    if (forgot) forgot.addEventListener('click', async function () {
      var ok = await confirmBox('Réinitialiser le code PIN de cet appareil ? Vos contenus ne seront pas effacés ; vous pourrez choisir un nouveau code.', 'Réinitialiser le code');
      if (ok) { lsDel(PIN_KEY); askPin(); }
    });
  }

  function setAdmin(on) {
    isAdmin = on;
    document.body.classList.toggle('admin', on);
    $('#adminbar').hidden = !on;
    ssSet('360nature.admin', on ? '1' : null);
    if (on) {
      setStatus(hasLocal ? '✓ Modifications locales chargées' : 'Mode édition actif');
      toast('Mode édition activé : cliquez sur un texte pour le modifier.');
      gcMedia();
    } else {
      $$('[data-edit]').forEach(function (el) { el.removeAttribute('contenteditable'); });
      toast('Mode édition désactivé.');
    }
    renderAll();
  }

  function enableEditing() {
    $$('[data-edit]').forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
    });
  }

  function onEditableInput(el) {
    var v = sanitize(el.innerHTML);
    setPath(S, el.dataset.edit, v);
    persist();
  }
  var onEditableInputDebounced = debounce(onEditableInput, 400);

  /* --- Formulaires --- */
  function field(label, name, value, opts) {
    opts = opts || {};
    var id = 'f-' + name;
    var input;
    if (opts.type === 'textarea') input = '<textarea id="' + id + '" name="' + name + '"' + (opts.rows ? ' rows="' + opts.rows + '"' : '') + '>' + esc(value) + '</textarea>';
    else if (opts.type === 'select') input = '<select id="' + id + '" name="' + name + '">' + opts.options.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (v === value ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('') + '</select>';
    else input = '<input id="' + id + '" name="' + name + '" type="' + (opts.type || 'text') + '" value="' + esc(value) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + (opts.list ? ' list="' + opts.list + '"' : '') + (opts.required ? ' required' : '') + '>';
    return '<label class="' + (opts.full ? 'full' : '') + '" for="' + id + '">' + esc(label) + input + (opts.hint ? '<span class="hint">' + esc(opts.hint) + '</span>' : '') + '</label>';
  }
  function actions(saveLabel, extraLeft) {
    return '<div class="form__actions">' + (extraLeft || '') +
      '<button type="button" class="btn btn--outline btn--sm" data-close>Annuler</button>' +
      '<button type="submit" class="btn btn--forest btn--sm">' + esc(saveLabel || 'Enregistrer') + '</button></div>';
  }

  // Liens & réseaux
  function editLinks() {
    var L = S.links;
    var body = openModal('Liens, podcasts & réseaux sociaux', '<form class="form">' +
      field('Spotify — 360° Nature', 'spotify', L.spotify, { full: true, hint: 'Lecteur mis en avant. Laisser vide = lecteur Apple Podcasts.' }) +
      field('Apple Podcasts — 360° Nature', 'apple', L.apple, { full: true }) +
      field('Monde de la Nature — épisode à la une (Spotify for Creators)', 'creator', L.creator, { full: true }) +
      field('JPT | Journey to Prehistoric Time (Spotify)', 'jpt', L.jpt, { full: true }) +
      field('Instagram', 'instagram', L.instagram) +
      field('Facebook', 'facebook', L.facebook, { placeholder: 'https://www.facebook.com/…' }) +
      field('E-mail de contact (facultatif)', 'email', L.email, { type: 'email', full: true }) +
      actions() + '</form>');
    $('form', body).addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, bad = [];
      ['spotify', 'apple', 'creator', 'jpt', 'instagram', 'facebook'].forEach(function (k) {
        var raw = f[k].value.trim(), u = safeUrl(raw);
        if (raw && !u) bad.push(k);
        S.links[k] = u;
      });
      S.links.email = f.email.value.trim();
      // garde les liens des émissions synchronisés avec les plateformes
      persist(); renderAll(); closeModal();
      toast(bad.length ? 'Certains liens invalides ont été ignorés : ' + bad.join(', ') : 'Liens enregistrés.', !!bad.length);
    });
  }

  function editChips() {
    var body = openModal('Mots-clés de présentation', '<form class="form">' +
      field('Mots-clés (séparés par des virgules)', 'chips', plain(S.texts.aboutChips), { full: true }) + actions() + '</form>', { narrow: true });
    $('form', body).addEventListener('submit', function (e) {
      e.preventDefault();
      S.texts.aboutChips = esc(e.target.chips.value);
      persist(); renderTexts(); closeModal();
    });
  }

  function pickPhoto(cb) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', async function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      try { cb(await storeImage(f)); }
      catch (e) { toast('Image illisible : ' + f.name, true); }
    });
    inp.click();
  }

  // Émissions
  var LINK_SOURCES = [['@spotify', 'Lien Spotify 360° Nature'], ['@apple', 'Lien Apple Podcasts 360° Nature'], ['@creator', 'Lien Monde de la Nature'], ['@jpt', 'Lien JPT'], ['', 'Autre lien (à saisir)']];
  function linkRow(l) {
    var srcVal = l && l.url && l.url.charAt(0) === '@' ? l.url : '';
    return '<div class="link-row">' +
      '<input name="lk-label" placeholder="Texte du bouton" value="' + esc(l ? l.label : 'Écouter') + '" aria-label="Texte du bouton">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><select name="lk-src" aria-label="Source du lien" style="flex:1 1 160px">' + LINK_SOURCES.map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === srcVal ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select>' +
      '<input name="lk-url" placeholder="https://…" value="' + esc(srcVal ? '' : (l ? l.url : '')) + '" aria-label="Adresse du lien" style="flex:2 1 200px"' + (srcVal ? ' hidden' : '') + '></div>' +
      '<button type="button" data-rm aria-label="Retirer ce bouton">✕</button></div>';
  }
  function editShow(id) {
    var p = S.podcasts.find(function (x) { return x.id === id; });
    var w = p ? clone(p) : { id: uid('pod'), title: '', subtitle: 'Podcast', description: '', cover: '', theme: 'forest', featured: false, links: [{ label: 'Écouter', url: '' }] };
    var body = openModal(p ? 'Modifier l\'émission' : 'Nouvelle émission', '<form class="form">' +
      field('Titre', 'title', w.title, { required: true }) +
      field('Sous-titre', 'subtitle', w.subtitle) +
      field('Description', 'description', w.description, { type: 'textarea', full: true }) +
      field('Couleur de la carte', 'theme', w.theme, { type: 'select', options: [['forest', 'Vert forêt'], ['sage', 'Vert sauge'], ['ocre', 'Ocre / bois'], ['anthracite', 'Anthracite']] }) +
      '<label><span>Mise en avant</span><span style="font-weight:400;display:flex;gap:8px;align-items:center"><input type="checkbox" name="featured"' + (w.featured ? ' checked' : '') + '> Encadré ocre</span></label>' +
      '<div class="full"><b style="font-size:13px;color:var(--forest)">Image de couverture</b><div style="display:flex;gap:12px;align-items:center;margin-top:6px;flex-wrap:wrap">' +
        '<div class="media-item" id="coverPrev">' + imgTag(w.cover, '') + '</div>' +
        '<button type="button" class="chip-btn" data-cover>Choisir une image</button><button type="button" class="chip-btn" data-cover-rm>Retirer</button></div></div>' +
      '<div class="full"><b style="font-size:13px;color:var(--forest)">Boutons d\'écoute</b><div class="link-rows" id="linkRows" style="margin-top:6px">' + w.links.map(linkRow).join('') + '</div>' +
        '<button type="button" class="chip-btn" data-addlink style="margin-top:8px">+ Ajouter un bouton</button></div>' +
      actions() + '</form>', { onClose: gcMedia });
    var form = $('form', body);
    body.addEventListener('change', function (e) {
      if (e.target.name === 'lk-src') { var u = e.target.parentNode.querySelector('[name=lk-url]'); u.hidden = !!e.target.value; }
    });
    body.addEventListener('click', function (e) {
      if (e.target.closest('[data-rm]')) e.target.closest('.link-row').remove();
      if (e.target.closest('[data-addlink]')) $('#linkRows', body).insertAdjacentHTML('beforeend', linkRow(null));
      if (e.target.closest('[data-cover]')) pickPhoto(function (ref) { w.cover = ref; $('#coverPrev', body).innerHTML = imgTag(ref, ''); });
      if (e.target.closest('[data-cover-rm]')) { w.cover = ''; $('#coverPrev', body).innerHTML = placeholder(''); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      w.title = form.title.value.trim() || 'Émission sans titre';
      w.subtitle = form.subtitle.value.trim();
      w.description = form.description.value.trim();
      w.theme = form.theme.value;
      w.featured = form.featured.checked;
      w.links = $$('.link-row', body).map(function (r) {
        var s = r.querySelector('[name=lk-src]').value, u = r.querySelector('[name=lk-url]').value.trim();
        return { label: r.querySelector('[name=lk-label]').value.trim() || 'Écouter', url: s || safeUrl(u) };
      });
      var i = S.podcasts.findIndex(function (x) { return x.id === w.id; });
      if (i > -1) S.podcasts[i] = w; else S.podcasts.push(w);
      persist(); renderShows(); renderEpisodes(); closeModal(); toast('Émission enregistrée.');
    });
  }

  // Épisodes
  function editEpisode(id) {
    var ep = S.episodes.find(function (x) { return x.id === id; });
    var w = ep ? clone(ep) : { id: uid('ep'), podcastId: (S.podcasts[0] || {}).id || '', number: '', title: '', date: '', url: '' };
    var linked = S.species.filter(function (s) { return s.episodeId === w.id; }).map(function (s) { return s.id; });
    var body = openModal(ep ? 'Modifier l\'épisode' : 'Nouvel épisode', '<form class="form">' +
      field('Titre de l\'épisode', 'title', w.title, { required: true, full: true }) +
      field('Émission', 'podcastId', w.podcastId, { type: 'select', options: [['', '—']].concat(S.podcasts.map(function (p) { return [p.id, p.title]; })) }) +
      field('Numéro (facultatif)', 'number', w.number, { placeholder: 'ex. 12' }) +
      field('Lien direct vers l\'épisode', 'url', w.url, { full: true, placeholder: 'https://open.spotify.com/episode/…' }) +
      field('Date (facultatif)', 'date', w.date, { placeholder: 'ex. Mars 2026' }) +
      '<fieldset class="full" style="border:1px solid var(--line);border-radius:10px;padding:10px 14px"><legend style="font-size:13px;font-weight:600;color:var(--forest)">Espèces présentées dans cet épisode</legend>' +
        (S.species.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px 14px;max-height:180px;overflow:auto">' + S.species.map(function (s) {
          return '<label style="flex-direction:row;align-items:center;font-weight:400;gap:6px"><input type="checkbox" name="sp" value="' + esc(s.id) + '"' + (linked.indexOf(s.id) > -1 ? ' checked' : '') + '>' + esc(s.name) + '</label>';
        }).join('') + '</div>' : '<p class="hint">Créez d\'abord des fiches espèces.</p>') + '</fieldset>' +
      actions() + '</form>');
    var form = $('form', body);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = form.url.value.trim();
      w.title = form.title.value.trim() || 'Épisode sans titre';
      w.podcastId = form.podcastId.value; w.number = form.number.value.trim(); w.date = form.date.value.trim();
      w.url = safeUrl(raw);
      if (raw && !w.url) toast('Lien d\'épisode invalide : il doit commencer par https://', true);
      var i = S.episodes.findIndex(function (x) { return x.id === w.id; });
      if (i > -1) S.episodes[i] = w; else S.episodes.push(w);
      var checked = $$('input[name=sp]:checked', form).map(function (c) { return c.value; });
      S.species.forEach(function (s) {
        if (checked.indexOf(s.id) > -1) s.episodeId = w.id;
        else if (s.episodeId === w.id) s.episodeId = '';
      });
      persist(); renderEpisodes(); renderSpecies(); closeModal(); toast('Épisode enregistré.');
    });
  }

  // Fiches espèces
  function editSpecies(id) {
    var sp = S.species.find(function (x) { return x.id === id; });
    var w = sp ? clone(sp) : { id: uid('sp'), name: '', latin: '', group: filter.group !== 'Tous' ? filter.group : 'Oiseaux', status: '', description: '', habitat: '', fact: '', photos: [], docs: [], episodeId: '', episodeUrl: '' };
    var groupOpts = groupsInData();
    if (groupOpts.indexOf(w.group) < 0) groupOpts.push(w.group);
    var body = openModal(sp ? 'Modifier la fiche' : 'Nouvelle fiche espèce', '<form class="form">' +
      field('Nom commun', 'name', w.name, { required: true }) +
      field('Nom scientifique', 'latin', w.latin, { placeholder: 'ex. Lynx lynx' }) +
      field('Groupe', 'group', w.group, { type: 'select', options: groupOpts }) +
      field('Statut de conservation', 'status', w.status, { placeholder: 'ex. Préoccupation mineure (UICN)' }) +
      field('Description', 'description', w.description, { type: 'textarea', full: true }) +
      field('Habitat', 'habitat', w.habitat, { full: true }) +
      field('Le saviez-vous ? (anecdote)', 'fact', w.fact, { type: 'textarea', full: true, rows: 2 }) +
      field('Épisode associé', 'episodeId', w.episodeId, { type: 'select', options: [['', '— Aucun —']].concat(S.episodes.map(function (e) { return [e.id, e.title]; })) }) +
      field('…ou lien direct vers l\'épisode', 'episodeUrl', w.episodeUrl, { placeholder: 'https://…' }) +
      '<div class="full"><b style="font-size:13px;color:var(--forest)">Galerie photos</b> <span class="hint" style="font-size:12.5px;color:var(--ink-soft)">— la photo encadrée est la photo principale (compression automatique)</span>' +
        '<div class="media-list" id="phList" style="margin-top:8px"></div>' +
        '<label class="chip-btn file-btn" style="margin-top:10px;display:inline-flex">+ Ajouter des photos<input type="file" accept="image/*" multiple data-ph></label></div>' +
      '<div class="full"><b style="font-size:13px;color:var(--forest)">Documents (PDF, fiches annexes)</b>' +
        '<div id="docList" style="display:flex;flex-direction:column;gap:6px;margin-top:8px"></div>' +
        '<label class="chip-btn file-btn" style="margin-top:10px;display:inline-flex">+ Ajouter des documents<input type="file" accept=".pdf,.txt,.doc,.docx,.odt,application/pdf" multiple data-doc></label></div>' +
      actions('Enregistrer la fiche', sp ? '<button type="button" class="btn btn--danger btn--sm left" data-del>Supprimer</button>' : '') + '</form>', { onClose: gcMedia });
    var form = $('form', body);
    function drawMedia() {
      $('#phList', body).innerHTML = w.photos.length ? w.photos.map(function (p, i) {
        return '<div class="media-item' + (i === 0 ? ' main' : '') + '">' + imgTag(p, '') +
          '<div class="bar">' + (i ? '<button type="button" data-main="' + i + '" title="Photo principale">★</button>' : '') +
          '<button type="button" data-rmph="' + i + '" title="Retirer">✕</button></div></div>';
      }).join('') : '<p class="hint" style="margin:0;font-size:13px;color:var(--ink-soft)">Aucune photo : un visuel neutre sera affiché.</p>';
      $('#docList', body).innerHTML = w.docs.map(function (d, i) {
        return '<div class="doc-row"><span>📄 ' + esc(d.name) + '</span><button type="button" data-rmdoc="' + i + '">Retirer</button></div>';
      }).join('');
    }
    drawMedia();
    body.addEventListener('click', function (e) {
      var t = e.target;
      if (t.dataset.main) { var m = w.photos.splice(+t.dataset.main, 1)[0]; w.photos.unshift(m); drawMedia(); }
      if (t.dataset.rmph) { w.photos.splice(+t.dataset.rmph, 1); drawMedia(); }
      if (t.dataset.rmdoc) { w.docs.splice(+t.dataset.rmdoc, 1); drawMedia(); }
      if (t.closest('[data-del]')) { delSpecies(w.id); }
    });
    body.addEventListener('change', async function (e) {
      var t = e.target;
      if (!t.files || !t.files.length) return;
      var files = Array.prototype.slice.call(t.files);
      t.value = '';
      for (var i = 0; i < files.length; i++) {
        try {
          if (t.hasAttribute('data-ph')) w.photos.push(await storeImage(files[i]));
          else if (t.hasAttribute('data-doc')) w.docs.push({ name: files[i].name, ref: await putMedia(files[i], files[i].name), type: files[i].type });
        } catch (err) { toast('Fichier ignoré : ' + files[i].name, true); }
      }
      drawMedia();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      w.name = form.name.value.trim() || 'Espèce sans nom';
      ['latin', 'group', 'status', 'description', 'habitat', 'fact', 'episodeId'].forEach(function (k) { w[k] = form[k].value.trim(); });
      var raw = form.episodeUrl.value.trim();
      w.episodeUrl = safeUrl(raw);
      var i = S.species.findIndex(function (x) { return x.id === w.id; });
      if (i > -1) S.species[i] = w; else S.species.unshift(w);
      persist(); renderSpecies(); renderEpisodes(); refreshImportTarget(); closeModal();
      toast('Fiche « ' + w.name + ' » enregistrée.');
    });
  }
  async function delSpecies(id) {
    var s = S.species.find(function (x) { return x.id === id; });
    if (!s) return;
    if (!(await confirmBox('Supprimer définitivement la fiche « ' + s.name + ' » ?', 'Supprimer'))) return;
    S.species = S.species.filter(function (x) { return x.id !== id; });
    persist(); renderSpecies(); renderEpisodes(); refreshImportTarget(); gcMedia();
    toast('Fiche supprimée.');
  }

  // Observations
  function editObs(id) {
    var o = S.observations.find(function (x) { return x.id === id; });
    var w = o ? clone(o) : { id: uid('obs'), photo: '', name: '', latin: '', caption: '', date: '', place: '' };
    var body = openModal(o ? 'Modifier l\'observation' : 'Nouvelle observation', '<form class="form">' +
      '<div class="full" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="media-item" id="obsPrev" style="width:180px;height:130px">' + imgTag(w.photo, '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><button type="button" class="chip-btn" data-photo>' + (w.photo ? 'Remplacer la photo' : 'Choisir une photo') + '</button>' +
        '<span class="hint" style="font-size:12.5px;color:var(--ink-soft)">Vérifiez que le nom correspond bien à l\'animal visible sur la photo.</span></div></div>' +
      field('Nom de l\'espèce', 'name', w.name, { required: true, list: 'spNames' }) +
      field('Nom scientifique', 'latin', w.latin) +
      field('Légende', 'caption', w.caption, { type: 'textarea', full: true, rows: 2 }) +
      field('Date', 'date', w.date, { placeholder: 'ex. Mai 2026' }) +
      field('Lieu', 'place', w.place, { placeholder: 'ex. Vosges du Nord' }) +
      '<datalist id="spNames">' + S.species.map(function (s) { return '<option value="' + esc(s.name) + '">'; }).join('') + '</datalist>' +
      actions() + '</form>', { onClose: gcMedia });
    var form = $('form', body);
    form.name.addEventListener('change', function () {
      var s = S.species.find(function (x) { return slug(x.name) === slug(form.name.value); });
      if (s && !form.latin.value) form.latin.value = s.latin;
    });
    body.addEventListener('click', function (e) {
      if (e.target.closest('[data-photo]')) pickPhoto(function (ref) { w.photo = ref; $('#obsPrev', body).innerHTML = imgTag(ref, ''); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ['name', 'latin', 'caption', 'date', 'place'].forEach(function (k) { w[k] = form[k].value.trim(); });
      w.name = w.name || 'Observation';
      var i = S.observations.findIndex(function (x) { return x.id === w.id; });
      if (i > -1) S.observations[i] = w; else S.observations.unshift(w);
      persist(); renderObservations(); closeModal(); toast('Observation enregistrée.');
    });
  }
  function moveItem(list, id, delta) {
    var i = list.findIndex(function (x) { return x.id === id; }), j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return false;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    return true;
  }

  /* ---------------- Import multi-fichiers ---------------- */
  var sheetJsPromise = null;
  function loadScript(url) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error('SheetJS')); };
      s.onerror = function () { s.remove(); rej(new Error('SheetJS indisponible')); };
      document.head.appendChild(s);
    });
  }
  // SheetJS est fourni localement (assets/vendor) ; le CDN sert de secours.
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!sheetJsPromise) {
      sheetJsPromise = loadScript('assets/vendor/xlsx.full.min.js')
        .catch(function () { return loadScript(SHEETJS_URL); })
        .catch(function (e) { sheetJsPromise = null; throw e; });
    }
    return sheetJsPromise;
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var delim = [';', ',', '\t'].map(function (d) { return [d, first.split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return str(x); }); });
    if (rows.length < 2) return [];
    var head = rows[0].map(str);
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { if (h) o[h] = r[i] == null ? '' : r[i]; }); return o; });
  }
  async function readTextSmart(file) {
    var buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  }
  async function readSheet(file) {
    if (/\.csv$/i.test(file.name) || file.type === 'text/csv') return parseCSV(await readTextSmart(file));
    var XLSX = await loadSheetJS();
    var wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    var rows = [];
    wb.SheetNames.forEach(function (n) { rows = rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: false })); });
    return rows;
  }
  var COLS = {
    name: ['nom', 'nomcommun', 'espece', 'nomespece', 'nomvernaculaire', 'nomfrancais', 'name', 'commonname', 'species'],
    latin: ['nomscientifique', 'latin', 'nomlatin', 'scientifique', 'scientificname', 'taxon'],
    group: ['groupe', 'group', 'categorie', 'classe', 'type', 'groupetaxonomique'],
    status: ['statut', 'status', 'statutuicn', 'uicn', 'conservation', 'statutdeconservation'],
    description: ['description', 'presentation', 'desc', 'texte', 'resume'],
    habitat: ['habitat', 'milieu', 'habitats', 'repartition'],
    fact: ['anecdote', 'lesaviezvous', 'fact', 'funfact', 'anecdotes'],
    epTitle: ['episode', 'titreepisode', 'titredelepisode', 'nomepisode', 'episodetitle'],
    epUrl: ['lienepisode', 'liendelepisode', 'urlepisode', 'episodeurl', 'lien', 'url', 'link'],
    photos: ['photo', 'photos', 'image', 'images', 'fichierphoto', 'fichiersphotos'],
    docs: ['document', 'documents', 'pdf', 'fichepdf', 'annexe', 'annexes']
  };
  function mapRow(row) {
    var keys = {};
    Object.keys(row).forEach(function (k) { keys[slug(k)] = row[k]; });
    var out = {};
    Object.keys(COLS).forEach(function (f) {
      for (var i = 0; i < COLS[f].length; i++) {
        var v = keys[COLS[f][i]];
        if (v != null && str(v)) { out[f] = str(v); break; }
      }
    });
    return out;
  }
  function normGroup(g) {
    var s = fold(g);
    if (!s) return 'Autres';
    var rules = [[/mammif/, 'Mammifères'], [/oiseau|avifaune|ornith/, 'Oiseaux'], [/reptil|amphib|batrac|serpent|lezard|grenouill/, 'Reptiles & Amphibiens'],
      [/poisson|ichty/, 'Poissons'], [/insect|papillon|coleopt|libellul/, 'Insectes'], [/arachn|araign/, 'Arachnides'],
      [/flore|plante|vegetal|arbre|fleur|botan/, 'Flore'], [/champi|fong/, 'Champignons'], [/prehist|dinos|fossil|paleo|disparu/, 'Préhistoire']];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(s)) return rules[i][1];
    var exact = groupsInData().find(function (x) { return fold(x) === s; });
    return exact || (g.charAt(0).toUpperCase() + g.slice(1));
  }
  function baseName(n) { return fold(n.replace(/\.[^.]+$/, '')).replace(/[^a-z0-9]+/g, ''); }
  function splitList(v) { return str(v).split(/[;,|\n]+/).map(str).filter(Boolean); }
  function findOrCreateEpisode(title, url) {
    var u = safeUrl(url);
    var ep = (u && S.episodes.find(function (e) { return e.url === u; })) ||
      (title && S.episodes.find(function (e) { return slug(e.title) === slug(title) || (e.number && slug(e.number) === slug(title)); }));
    if (ep) { if (u && !ep.url) ep.url = u; return ep; }
    ep = { id: uid('ep'), podcastId: '', number: '', title: title || 'Épisode', date: '', url: u };
    S.episodes.push(ep);
    return ep;
  }

  async function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var dz = $('#dropzone');
    dz.classList.add('busy');
    var rep = { created: 0, updated: 0, photos: 0, docs: 0, warn: [] };
    var claims = new Map(); // nom de fichier attendu -> id espèce
    var target = $('#importTarget').value || 'auto';
    var isSheet = function (f) { return /\.(xlsx|xls|csv|ods)$/i.test(f.name); };
    var isImg = function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name); };
    var isDoc = function (f) { return /\.(pdf|txt|docx?|odt)$/i.test(f.name) || f.type === 'application/pdf'; };
    try {
      // 1. Tableaux → fiches
      for (var f of files.filter(isSheet)) {
        try {
          var rows = await readSheet(f), n = 0;
          rows.forEach(function (raw) {
            var r = mapRow(raw);
            if (!r.name && !r.latin) return;
            var existing = S.species.find(function (s) { return (r.name && slug(s.name) === slug(r.name)) || (r.latin && s.latin && slug(s.latin) === slug(r.latin)); });
            var sp = existing || { id: uid('sp'), name: r.name || r.latin, latin: '', group: 'Autres', status: '', description: '', habitat: '', fact: '', photos: [], docs: [], episodeId: '', episodeUrl: '' };
            ['latin', 'status', 'description', 'habitat', 'fact'].forEach(function (k) { if (r[k]) sp[k] = r[k]; });
            if (r.group) sp.group = normGroup(r.group);
            if (r.epTitle || r.epUrl) {
              if (/^https?:/i.test(r.epTitle || '') && !r.epUrl) { r.epUrl = r.epTitle; r.epTitle = ''; }
              sp.episodeId = findOrCreateEpisode(r.epTitle, r.epUrl).id;
            }
            splitList(r.photos).forEach(function (p) {
              if (/^https?:\/\//i.test(p)) { if (sp.photos.indexOf(p) < 0) sp.photos.push(p); }
              else claims.set(baseName(p), sp.id);
            });
            splitList(r.docs).forEach(function (p) {
              if (/^https?:\/\//i.test(p)) sp.docs.push({ name: p.split('/').pop() || 'Document', ref: p, type: '' });
              else claims.set(baseName(p), sp.id);
            });
            if (!existing) { S.species.push(sp); rep.created++; } else rep.updated++;
            n++;
          });
          if (!n) rep.warn.push(f.name + ' : aucune ligne exploitable (une colonne « Nom » est nécessaire).');
        } catch (e) {
          rep.warn.push(f.name + ' : ' + (/SheetJS/.test(e.message) ? 'lecteur Excel indisponible (connexion requise) — enregistrez le tableau en CSV.' : 'fichier illisible ou mal formaté.'));
        }
      }
      // 2. Photos & documents → galeries
      function targetFor(file) {
        if (target !== 'auto') return S.species.find(function (s) { return s.id === target; });
        var b = baseName(file.name);
        if (claims.has(b)) return S.species.find(function (s) { return s.id === claims.get(b); });
        var best = null, len = 0;
        // 1) nom complet ou nom scientifique contenu dans le nom du fichier
        S.species.forEach(function (s) {
          [slug(s.name), slug(s.latin)].forEach(function (k) { if (k.length >= 4 && b.indexOf(k) > -1 && k.length > len) { best = s; len = k.length; } });
        });
        if (best) return best;
        // 2) un mot significatif du nom (ex. « fiche-renard.pdf » → « Renard roux »)
        var STOP = ['fiche', 'photo', 'image', 'europe', 'commun', 'commune', 'grand', 'grande', 'petit', 'petite'];
        S.species.forEach(function (s) {
          fold(s.name + ' ' + s.latin).split(/[^a-z0-9]+/).forEach(function (k) {
            if (k.length >= 5 && STOP.indexOf(k) < 0 && b.indexOf(k) > -1 && k.length > len) { best = s; len = k.length; }
          });
        });
        if (best) return best;
        var title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s*\(?\d+\)?\s*$/, '').trim() || 'Nouvelle espèce';
        title = title.charAt(0).toUpperCase() + title.slice(1);
        var existing = S.species.find(function (s) { return slug(s.name) === slug(title); });
        if (existing) return existing;
        var sp = { id: uid('sp'), name: title, latin: '', group: 'Autres', status: '', description: '', habitat: '', fact: '', photos: [], docs: [], episodeId: '', episodeUrl: '' };
        S.species.push(sp); rep.created++;
        return sp;
      }
      for (var im of files.filter(function (x) { return !isSheet(x) && isImg(x); })) {
        try {
          var ref = await storeImage(im);
          var t = targetFor(im);
          if (t) { t.photos.push(ref); rep.photos++; }
        } catch (e) { rep.warn.push(im.name + ' : image illisible (formats acceptés : JPG, PNG, WebP).'); }
      }
      for (var d of files.filter(function (x) { return !isSheet(x) && !isImg(x) && isDoc(x); })) {
        try {
          if (d.size > 15 * 1024 * 1024) rep.warn.push(d.name + ' : fichier lourd (' + Math.round(d.size / 1048576) + ' Mo), la sauvegarde sera volumineuse.');
          var dref = await putMedia(d, d.name);
          var td = targetFor(d);
          if (td) { td.docs.push({ name: d.name, ref: dref, type: d.type }); rep.docs++; }
        } catch (e) { rep.warn.push(d.name + ' : document illisible.'); }
      }
      files.forEach(function (x) { if (!isSheet(x) && !isImg(x) && !isDoc(x)) rep.warn.push(x.name + ' : format non pris en charge.'); });
    } catch (e) {
      console.error(e);
      rep.warn.push('Erreur inattendue pendant l\'import : ' + e.message);
    } finally {
      dz.classList.remove('busy');
    }
    if (rep.created || rep.updated || rep.photos || rep.docs) persist();
    renderSpecies(); renderEpisodes(); refreshImportTarget();
    var box = $('#importReport');
    box.hidden = false;
    box.innerHTML = '<b class="ok">Import terminé :</b> ' + rep.created + ' fiche(s) créée(s), ' + rep.updated + ' mise(s) à jour, ' +
      rep.photos + ' photo(s), ' + rep.docs + ' document(s).' +
      (rep.warn.length ? '<ul class="warn">' + rep.warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '');
    toast('Import terminé.');
  }

  function downloadFile(content, name, type) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: type || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function downloadTemplate() {
    var head = ['Nom', 'Nom scientifique', 'Groupe', 'Statut', 'Description', 'Habitat', 'Anecdote', 'Épisode', 'Lien épisode', 'Photos', 'Documents'];
    var ex = ['Lynx boréal', 'Lynx lynx', 'Mammifères', 'En danger (France)', 'Grand félin discret des massifs forestiers.', 'Forêts de montagne (Vosges, Jura, Alpes)', 'Ses pinceaux de poils au bout des oreilles…', 'Épisode 12 — Le retour du lynx', 'https://open.spotify.com/episode/…', 'lynx-1.jpg; lynx-2.jpg', 'fiche-lynx.pdf'];
    var line = function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); };
    downloadFile('﻿' + line(head) + '\r\n' + line(ex) + '\r\n', 'modele-fiches-especes.csv', 'text/csv;charset=utf-8');
  }

  /* ---------------- Sauvegarde : export / import ---------------- */
  async function exportBackup() {
    try {
      setStatus('Préparation de l\'export…');
      var data = clone(S);
      data.updatedAt = S.updatedAt;
      await mapStringsAsync(data, async function (s) {
        if (s.indexOf('idb:') !== 0) return s;
        var rec = await getMediaRec(s);
        return rec && rec.blob ? await blobToDataURL(rec.blob) : '';
      });
      downloadFile(JSON.stringify(data), 'site-data.json', 'application/json');
      setStatus('✓ Sauvegarde exportée');
      toast('Sauvegarde exportée : site-data.json. Pour publier, remplacez public/data/site-data.json.');
    } catch (e) {
      console.error(e);
      toast('Export impossible : ' + e.message, true);
    }
  }
  async function importBackup(file) {
    try {
      var data = JSON.parse(await readTextSmart(file));
      if (!data || typeof data !== 'object' || !(data.texts || data.species || data.observations)) throw new Error('ce fichier n\'est pas une sauvegarde du site');
      if (!(await confirmBox('Remplacer le contenu actuel par cette sauvegarde (' + file.name + ') ?', 'Importer'))) return;
      var n = normalize(data);
      if (DB.db) {
        await mapStringsAsync(n, async function (s) {
          if (s.indexOf('data:') !== 0 || s.length < 2000) return s;
          var b = dataURLtoBlob(s);
          return b ? await putMedia(b, 'import') : s;
        });
      }
      n.updatedAt = new Date().toISOString();
      S = n;
      persist(); renderAll(); gcMedia();
      toast('Sauvegarde importée avec succès.');
    } catch (e) {
      toast('Import impossible : ' + e.message + '.', true);
    }
  }
  async function resetLocal() {
    if (!(await confirmBox('Effacer les modifications enregistrées sur cet appareil et revenir à la version publiée en ligne ? Exportez d\'abord une sauvegarde si besoin.', 'Revenir à la version publiée'))) return;
    try { await DB.clear('kv'); await DB.clear('media'); } catch (e) { /* */ }
    location.reload();
  }
  function showHelp() {
    openModal('Publier vos modifications en ligne (gratuit)', '<div class="help">' +
      '<p>Vos modifications sont enregistrées <b>dans ce navigateur</b> (IndexedDB). Pour que tous les visiteurs les voient :</p><ol>' +
      '<li>Cliquez sur <b>« Exporter la sauvegarde (.json) »</b> : un fichier <code>site-data.json</code> est téléchargé (il contient textes, photos et PDF).</li>' +
      '<li>Remplacez le fichier <code>public/data/site-data.json</code> du site par celui-ci :<br>– sur GitHub : dossier <code>360-degres-nature/public/data</code> → « Add file » → « Upload files » ;<br>– ou sur Netlify : glissez-déposez le dossier <code>public</code> complet dans l\'onglet « Deploys ».</li>' +
      '<li>Netlify republie le site automatiquement (gratuit) : le site charge <code>data/site-data.json</code> à chaque visite.</li></ol>' +
      '<p>Astuce : gardez toujours une copie de vos exports. Sur un autre appareil, utilisez « Importer une sauvegarde » pour retrouver votre travail.</p></div>');
  }

  /* ---------------- Interactions globales ---------------- */
  function onAction(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action, id = el.dataset.id;
    var adminActions = /^(edit-|del-|add-|up-|left-|right-|export|import|reset|help|about-photo|hero-photo|download-template|admin-exit)/;
    if (adminActions.test(a) && !isAdmin) return;
    switch (a) {
      case 'admin': isAdmin ? setAdmin(false) : askPin(); break;
      case 'admin-exit': setAdmin(false); break;
      case 'open-species': openSpecies(id); break;
      case 'open-obs': openObservation(id); break;
      case 'legal': openModal('Mentions légales', '<div class="prose" data-legal></div>' + (isAdmin ? '<p class="hint" style="font-size:13px;color:var(--ink-soft)">Modifiez ce texte avec le bouton ci-dessous.</p><button type="button" class="chip-btn" data-action="edit-legal">Modifier les mentions légales</button>' : ''));
        $('[data-legal]').innerHTML = sanitize(S.texts.legal); break;
      case 'edit-legal': (function () {
        var b = openModal('Mentions légales', '<form class="form">' + field('Texte (une ligne vide = nouveau paragraphe)', 'legal', plain(S.texts.legal.replace(/<\/p>/g, '\n\n')).trim(), { type: 'textarea', full: true, rows: 10 }) + actions() + '</form>');
        $('form', b).addEventListener('submit', function (ev) {
          ev.preventDefault();
          S.texts.legal = ev.target.legal.value.split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
          persist(); closeModal(); toast('Mentions légales enregistrées.');
        });
      })(); break;
      case 'edit-links': editLinks(); break;
      case 'edit-chips': editChips(); break;
      case 'about-photo': pickPhoto(function (ref) { S.aboutPhoto = ref; persist(); renderTexts(); gcMedia(); }); break;
      case 'hero-photo': pickPhoto(function (ref) { S.heroPhoto = ref; persist(); renderTexts(); gcMedia(); }); break;
      case 'add-show': editShow(null); break;
      case 'edit-show': editShow(id); break;
      case 'del-show': confirmBox('Supprimer cette émission ?', 'Supprimer').then(function (ok) {
        if (!ok) return;
        S.podcasts = S.podcasts.filter(function (x) { return x.id !== id; });
        persist(); renderShows(); renderEpisodes(); gcMedia();
      }); break;
      case 'up-show': if (moveItem(S.podcasts, id, -1)) { persist(); renderShows(); } break;
      case 'add-episode': editEpisode(null); break;
      case 'edit-episode': editEpisode(id); break;
      case 'del-episode': confirmBox('Supprimer cet épisode ? Les fiches liées seront conservées.', 'Supprimer').then(function (ok) {
        if (!ok) return;
        S.episodes = S.episodes.filter(function (x) { return x.id !== id; });
        S.species.forEach(function (s) { if (s.episodeId === id) s.episodeId = ''; });
        persist(); renderEpisodes(); renderSpecies();
      }); break;
      case 'add-species': editSpecies(null); break;
      case 'edit-species': editSpecies(id); break;
      case 'del-species': delSpecies(id); break;
      case 'add-obs': editObs(null); break;
      case 'edit-obs': editObs(id); break;
      case 'del-obs': confirmBox('Supprimer cette observation ?', 'Supprimer').then(function (ok) {
        if (!ok) return;
        S.observations = S.observations.filter(function (x) { return x.id !== id; });
        persist(); renderObservations(); gcMedia();
      }); break;
      case 'left-obs': if (moveItem(S.observations, id, -1)) { persist(); renderObservations(); } break;
      case 'right-obs': if (moveItem(S.observations, id, 1)) { persist(); renderObservations(); } break;
      case 'download-template': downloadTemplate(); break;
      case 'export': exportBackup(); break;
      case 'import': $('#backupInput').click(); break;
      case 'reset': resetLocal(); break;
      case 'help': showHelp(); break;
    }
  }

  function bindUI() {
    document.addEventListener('click', onAction);
    // Modale
    $('#modal').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeSheet(); }
    });
    // Navigation
    var nav = $('#nav'), burger = $('#burger'), sheet = $('#sheet');
    function closeSheet() { sheet.hidden = true; nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    burger.addEventListener('click', function () {
      var open = sheet.hidden;
      sheet.hidden = !open; nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
    });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) closeSheet(); });
    var sections = ['accueil', 'podcasts', 'especes', 'observations', 'contact'].map(function (id) { return document.getElementById(id); });
    var navLinks = $$('.nav__links a');
    var ticking = false;
    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 24);
      var y = window.scrollY + window.innerHeight * 0.35, cur = 'accueil';
      sections.forEach(function (s) { if (s && s.offsetTop <= y) cur = s.id; });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = 'contact';
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + cur); });
      var foot = $('#contact').getBoundingClientRect().top < window.innerHeight - 40;
      $('.dock').classList.toggle('hide', foot);
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080) closeSheet(); onScroll(); });
    onScroll();

    // Recherche & filtres
    $('#spSearch').addEventListener('input', debounce(function (e) { filter.q = e.target.value; renderSpecies(); }, 120));
    $('#spFilters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-group]');
      if (!b) return;
      filter.group = b.dataset.group; renderSpecies();
    });

    // Textes éditables
    document.addEventListener('input', function (e) {
      var el = e.target.closest && e.target.closest('[data-edit]');
      if (el && isAdmin) onEditableInputDebounced(el);
    });
    document.addEventListener('focusout', function (e) {
      var el = e.target.closest && e.target.closest('[data-edit]');
      if (el && isAdmin) { onEditableInput(el); }
    });
    document.addEventListener('keydown', function (e) {
      var el = e.target.closest && e.target.closest('[data-edit]');
      if (!el || !isAdmin) return;
      if (e.key === 'Enter' && !el.hasAttribute('data-multiline')) {
        e.preventDefault();
        if (e.shiftKey) document.execCommand('insertLineBreak'); else el.blur();
      }
    });
    document.addEventListener('paste', function (e) {
      var el = e.target.closest && e.target.closest('[data-edit]');
      if (!el || !isAdmin) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
    // Empêche la navigation quand on édite un texte placé dans un lien
    document.addEventListener('click', function (e) {
      if (isAdmin && e.target.closest('[contenteditable="true"]') && e.target.closest('a')) e.preventDefault();
    }, true);

    // Images manquantes → visuel neutre
    document.addEventListener('error', function (e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && t.hasAttribute('data-fallback')) {
        var w = document.createElement('div');
        w.innerHTML = placeholder('Photo indisponible');
        t.replaceWith(w.firstChild);
      }
    }, true);

    // Dépôt de fichiers
    var dz = $('#dropzone'), inp = $('#dropInput');
    dz.addEventListener('click', function (e) { if (e.target !== inp) inp.click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', function () { var f = inp.files; handleFiles(f).finally(function () { inp.value = ''; }); });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
    dz.addEventListener('drop', function (e) { if (isAdmin && e.dataTransfer) handleFiles(e.dataTransfer.files); });
    // Évite d'ouvrir un fichier lâché à côté de la zone
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    $('#backupInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importBackup(f);
      e.target.value = '';
    });

    // Raccourci clavier discret : Ctrl/Cmd + Maj + E
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); isAdmin ? setAdmin(false) : askPin(); }
    });
  }

  /* ---------------- Démarrage ---------------- */
  async function loadRemote() {
    try {
      var r = await fetch('data/site-data.json', { cache: 'no-cache' });
      if (!r.ok) return null;
      var d = await r.json();
      return d && typeof d === 'object' ? d : null;
    } catch (e) { return null; }
  }
  async function boot() {
    bindUI();
    var res = await Promise.all([DB.open(), loadRemote()]);
    var remote = res[1], local = null;
    if (DB.db) { try { local = await DB.get('kv', 'site'); } catch (e) { local = null; } }
    var chosen = remote || DEFAULTS;
    if (local && typeof local === 'object') {
      var lt = Date.parse(local.updatedAt) || 0, rt = remote ? (Date.parse(remote.updatedAt) || 0) : 0;
      if (lt >= rt) { chosen = local; hasLocal = true; }
      else console.info('[360] Une version publiée plus récente que les modifications locales a été chargée.');
    }
    try { S = normalize(chosen); } catch (e) { console.error(e); S = normalize(DEFAULTS); }
    await hydrateMedia();
    renderAll();
    if (ssGet('360nature.admin') === '1' && lsGet(PIN_KEY)) setAdmin(true);
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
