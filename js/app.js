(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'kofu-nei-work-v2';
  const LEGACY_KEY = 'kofu-with-you-v1';
  const SAVE_INTERVAL_SECONDS = 10;
  const REQUIRED_ASSETS = [
    { type: 'image', src: 'kofu.webp', label: 'こふねゐ' },
    { type: 'image', src: 'perippa.webp', label: '空飛ぶペリッパ' },
    { type: 'image', src: 'assets/kofu-evening.webp', label: '甲府の夕暮れ' },
    { type: 'image', src: 'assets/kofu-midnight-radio.webp', label: '深夜のゲームラジオ' },
    { type: 'image', src: 'assets/kofu-rain-room.webp', label: '雨のゲーム部屋' },
    { type: 'image', src: 'assets/kofu-vineyard-morning.webp', label: 'ぶどう畑の朝' },
    { type: 'image', src: 'assets/gallery/kofu-overlay.webp', label: 'ギャラリー用こふねゐ' },
    { type: 'image', src: 'old.png', label: '旧こふねゐの黒塗りマスク' },
    { type: 'audio', elementId: 'lofiAudio', label: 'Lo-Fi BGM' },
    { type: 'audio', elementId: 'midAudio', label: 'こふねゐボイス' }
  ];

  const backgrounds = {
    evening: { name: '甲府の夕暮れ', src: 'assets/kofu-evening.webp' },
    radio: { name: '深夜のゲームラジオ', src: 'assets/kofu-midnight-radio.webp' },
    rain: { name: '雨のゲーム部屋', src: 'assets/kofu-rain-room.webp' },
    morning: { name: 'ぶどう畑の朝', src: 'assets/kofu-vineyard-morning.webp' }
  };

  const galleryItems = (window.KOFUNEI_GALLERY_ITEMS || []).map(item => ({
    ...item,
    placement: { ...item.placement }
  }));
  const GALLERY_EDITS_KEY = 'kofunei-gallery-edits-v1';
  const KOFU_OVERLAY_SRC = 'assets/gallery/kofu-overlay.webp';
  const KOFU_OVERLAY_ASPECT = 1682 / 1004;
  const OLD_REFERENCE_SRC = 'old.png';
  const BLACKOUT_BLEED_PIXELS = 6;
  const OLD_COMPLETE_MASK_HEIGHT = 480;
  const ROTATION_HANDLE_DISTANCE = 36;
  const ROTATION_HANDLE_HIT_RADIUS = 16;

  const levelThresholds = [0, 10, 30, 60, 120, 240, 420, 660, 960, 1440].map(minutes => minutes * 60);
  const levelTitles = [
    'はじめまして', 'いつもの視聴者', 'コメント常連', '夜更かし仲間', 'ゲーム仲間',
    '頼れる相棒', '名誉モデレーター', '番組準レギュラー', '甲府の盟友', '永久保存版の相棒'
  ];

  const defaults = {
    totalSeconds: 0,
    todaySeconds: 0,
    todayDate: dayKey(),
    sessions: 0,
    active: false,
    sessionStartedAt: null,
    lastAccountedAt: null,
    background: 'evening',
    masterVolume: 60,
    musicVolume: 72,
    rainVolume: 0,
    nightVolume: 16
  };

  const lines = [
    'はい、どうも皆さんこんばんは。-Midnight Game Radio- のお時間です。',
    'いつもより多めの睡眠時間を確保したのに、この暑さじゃまともに寝た感じがしないですね🫠',
    '頭がマルガリータになりました。軽い、スッキリ。',
    '暑いですね…🫠 最近思ったんですが実況する上で髪の毛って本当に邪魔だなぁって。なので明日頭丸めようと思います。本当は今日行く予定だったのですが力尽きました。長年顎先から肩ぐらいの長さだったので、久しぶりにさっぱりするのが楽しみです。',
    '実況にキレがない。ダメすぎる。',
    'お風呂上がりの筋トレを少しずつ始めてます。運動不足すぎて体を動かすのが気持ちいいです。あと体が硬すぎてオモロいです。長座体前屈でつま先に手が届くようになるまで頑張りたいです(願望)',
    '今日はおたより返しの動画になります。こふねゐの黒歴史が明らかに…？',
    '久しぶりに「よく寝た」と思える睡眠ができて最高に実況できそうな気分。',
    'なんかYouTube再生リストバグるんだよね。気づいたら順番めちゃくちゃになってる。帰ったら直さないと。',
    '最近仕事の疲れを引きずる日がどんどん多くなってきていて、気づけば横になってばかりです。なんとかならないものか…',
    'いつも動画と配信を同時並行で進められないかと考えているけど、なかなか実行に移せない。動画はいつも通りでいいとして、配信で何をやるか、それが問題だ。',
    'いつの間にか気絶してた…',
    'はい、ちょっとここはエンカウントオフにしますね。',
    'チェンソーマン楽しみだの…',
    'なんであんなに音ズレしてた動画が数時間再生されてるのでしょうか…🫠？',
    '思うんだ。アチャモは鳥だけど、バシャーモってもはや鳥じゃないよな。',
    'ゼンゼロメインストーリーやってきたけどアプデ来る度にこれホントに無料で遊んでいいゲームなの？って思ってる。',
    'ドロー…ジャンクション…ドロー…ジャンクション…ドロー…ジャンクション…',
    'ゼノブレイド新作でもう泣いたけど、それすらもサプライズ枠じゃなくて、今回のダイレクトあまりにも豪華だったな…幸せな50分だったね…',
    'なんか強いボスを変な倒し方する人みたいな印象が定着しちゃうとちょっと困るんですよね。ぼくは至って真面目なんですよね。母さん……',
    '人間は寝ないとダメないきものです。',
    'おら、ガウを諦めたくねえんだ。ガウ徹底的に研究中。',
    '鬼残して疲労が困憊！',
    'よし、めっちゃ寝たぞ。途中で起きても無理やり寝た。こんだけ寝れば大丈夫だろ💪',
    '結論、コーヒー飲んでも眠いもんは眠い。'
  ];

  let state = loadState();
  let activeLayer = 0;
  let tickHandle = null;
  let lastAutoLineAt = Date.now();
  let lastLine = '';
  let saveCountdown = SAVE_INTERVAL_SECONDS;
  let toastHandle = null;
  let audioContext = null;
  let masterGain = null;
  let rainGain = null;
  let nightGain = null;
  let ambienceStarted = false;
  let appInitialized = false;
  let perippaFlightTimer = null;
  let activeGalleryIndex = 0;
  let galleryEdits = loadGalleryEdits();
  let editorPlacement = null;
  let editorBaseImage = null;
  let editorOverlayImage = null;
  let editorReferenceImage = null;
  let editorDrag = null;
  let editorLoadToken = 0;
  let blackoutSilhouetteSourcePromise = null;

  const el = {
    body: document.body,
    sceneA: $('#sceneA'), sceneB: $('#sceneB'),
    onAir: $('#onAir'), headerElapsed: $('#headerElapsed'),
    liveCaption: $('#liveCaption'), stageElapsed: $('#stageElapsed'),
    workButton: $('#workButton'), workButtonIcon: $('#workButtonIcon use'), workButtonLabel: $('#workButtonLabel'),
    bondLevel: $('#bondLevel'), bondProgress: $('#bondProgress'), bondTitle: $('#bondTitle'), bondNext: $('#bondNext'),
    todayTime: $('#todayTime'), totalTime: $('#totalTime'), sessionCount: $('#sessionCount'),
    speechText: $('#speechText'), characterButton: $('#characterButton'), dockMessage: $('#dockMessage'),
    backgroundDrawer: $('#backgroundDrawer'), soundDrawer: $('#soundDrawer'), drawerScrim: $('#drawerScrim'),
    musicButton: $('#musicButton'), musicIcon: $('#musicIcon use'), equalizer: $('#equalizer'), lofiAudio: $('#lofiAudio'), midAudio: $('#midAudio'),
    masterVolume: $('#masterVolume'), musicVolume: $('#musicVolume'), rainVolume: $('#rainVolume'), nightVolume: $('#nightVolume'),
    volumeValue: $('#volumeValue'), musicVolumeValue: $('#musicVolumeValue'), rainVolumeValue: $('#rainVolumeValue'), nightVolumeValue: $('#nightVolumeValue'),
    levelUp: $('#levelUp'), newLevel: $('#newLevel'), levelQuote: $('#levelQuote'), toast: $('#toast'),
    app: $('#app'), loadingScreen: $('#loadingScreen'), loadingProgress: $('#loadingProgress'),
    loadingKicker: $('#loadingKicker'), loadingAssetName: $('#loadingAssetName'), loadingPercent: $('#loadingPercent'),
    loadingProgressBar: $('#loadingProgressBar'), loadingAssetCount: $('#loadingAssetCount'),
    loadingStart: $('#loadingStart'), loadingRetry: $('#loadingRetry'),
    gallery: $('#gallery'), galleryButton: $('#galleryButton'), galleryClose: $('#galleryClose'),
    galleryGrid: $('#galleryGrid'), galleryLightbox: $('#galleryLightbox'),
    editorCanvas: $('#editorCanvas'), editorLoading: $('#editorLoading'), editorHint: $('#editorHint'),
    lightboxMeta: $('#lightboxMeta'), lightboxTitle: $('#lightboxTitle'), lightboxDownload: $('#lightboxDownload')
  };

  startBootSequence();

  async function startBootSequence() {
    const startedAt = Date.now();
    let loaded = 0;
    let failures = 0;

    const jobs = REQUIRED_ASSETS.map(asset => preloadRequiredAsset(asset)
      .then(() => updateAssetProgress(asset, false))
      .catch(() => updateAssetProgress(asset, true)));

    await Promise.all(jobs);
    const minimumWait = Math.max(0, 1100 - (Date.now() - startedAt));
    if (minimumWait) await delay(minimumWait);

    el.loadingScreen.setAttribute('aria-busy', 'false');
    if (failures) {
      el.loadingKicker.textContent = 'ASSET LOAD INTERRUPTED';
      el.loadingAssetName.textContent = `${failures}件の素材を読み込めませんでした`;
      el.loadingRetry.hidden = false;
      el.loadingRetry.addEventListener('click', () => window.location.reload(), { once: true });
      requestAnimationFrame(() => el.loadingRetry.focus({ preventScroll: true }));
    } else {
      el.loadingProgressBar.style.width = '100%';
      el.loadingPercent.textContent = '100%';
      el.loadingAssetCount.textContent = `${String(REQUIRED_ASSETS.length).padStart(2, '0')} / ${String(REQUIRED_ASSETS.length).padStart(2, '0')}`;
      el.loadingKicker.textContent = 'ALL ASSETS READY';
      el.loadingAssetName.textContent = 'すべての準備が整いました';
      el.loadingProgress.classList.add('ready');
      el.loadingStart.hidden = false;
      el.loadingStart.addEventListener('click', enterApplication, { once: true });
      requestAnimationFrame(() => el.loadingStart.focus({ preventScroll: true }));
    }

    function updateAssetProgress(asset, failed) {
      if (failed) failures += 1;
      else loaded += 1;
      const percent = Math.round(loaded / REQUIRED_ASSETS.length * 100);
      el.loadingProgressBar.style.width = `${percent}%`;
      el.loadingPercent.textContent = `${percent}%`;
      el.loadingAssetCount.textContent = `${String(loaded).padStart(2, '0')} / ${String(REQUIRED_ASSETS.length).padStart(2, '0')}`;
      el.loadingAssetName.textContent = failed ? `${asset.label}を再確認しています...` : `${asset.label}を読み込みました`;
    }
  }

  function preloadRequiredAsset(asset) {
    if (asset.type === 'image') {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = async () => {
          try { await image.decode?.(); } catch { /* onload済みなら表示可能 */ }
          resolve();
        };
        image.onerror = reject;
        image.src = asset.src;
      });
    }

    return new Promise((resolve, reject) => {
      const audio = document.getElementById(asset.elementId);
      if (!audio) { reject(new Error(`Missing audio: ${asset.elementId}`)); return; }
      if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { resolve(); return; }
      let settled = false;
      const finish = callback => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', ready);
        audio.removeEventListener('error', failed);
        callback();
      };
      const ready = () => finish(resolve);
      const failed = () => finish(() => reject(new Error(`Failed audio: ${asset.elementId}`)));
      const timeout = setTimeout(failed, 20_000);
      audio.addEventListener('canplaythrough', ready, { once: true });
      audio.addEventListener('error', failed, { once: true });
      audio.load();
    });
  }

  function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  function enterApplication() {
    if (appInitialized) return;
    appInitialized = true;
    el.loadingStart.disabled = true;
    init();
    el.app.setAttribute('aria-hidden', 'false');
    el.loadingScreen.classList.add('leaving');
    el.body.classList.remove('booting');
    setTimeout(() => { el.loadingScreen.hidden = true; }, 850);
  }

  function init() {
    localStorage.removeItem(LEGACY_KEY);
    normalizeDay();
    preloadBackgrounds();
    setBackground(state.background, true);
    buildAtmosphere();
    schedulePerippaFlight(true);
    buildGallery();
    bindEvents();
    applySoundSettings();
    if (state.active) accountTime();
    renderAll();
    setSpeech(lines[0]);
    tickHandle = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => { if (state.active) accountTime(); saveState(); });
  }

  function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === 'object' ? { ...defaults, ...saved } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeDay() {
    if (state.todayDate !== dayKey()) {
      state.todayDate = dayKey();
      state.todaySeconds = 0;
      saveState();
    }
  }

  function bindEvents() {
    el.workButton.addEventListener('click', toggleWork);
    $('#speech').addEventListener('click', talkToKofunei);
    el.characterButton.addEventListener('click', handleCharacterClick);
    $('#backgroundButton').addEventListener('click', () => toggleDrawer(el.backgroundDrawer));
    $('#soundButton').addEventListener('click', () => { ensureAudio(); toggleDrawer(el.soundDrawer); });
    el.galleryButton.addEventListener('click', openGallery);
    el.galleryClose.addEventListener('click', closeGallery);
    $$('.gallery-preview').forEach(button => button.addEventListener('click', () => openLightbox(Number(button.dataset.galleryIndex))));
    $$('.gallery-edit-button').forEach(button => button.addEventListener('click', () => openLightbox(Number(button.dataset.galleryIndex))));
    $('#lightboxClose').addEventListener('click', closeLightbox);
    $('#lightboxPrev').addEventListener('click', () => stepLightbox(-1));
    $('#lightboxNext').addEventListener('click', () => stepLightbox(1));
    el.lightboxDownload.addEventListener('click', downloadEditedThumbnail);
    $('#overlayFlip').addEventListener('click', flipEditorOverlay);
    el.editorCanvas.addEventListener('pointerdown', startEditorDrag);
    el.editorCanvas.addEventListener('pointermove', moveEditorDrag);
    el.editorCanvas.addEventListener('pointerup', stopEditorDrag);
    el.editorCanvas.addEventListener('pointercancel', stopEditorDrag);
    el.galleryLightbox.addEventListener('click', event => {
      if (event.target === el.galleryLightbox) closeLightbox();
    });
    $('#fullscreenButton').addEventListener('click', toggleFullscreen);
    el.drawerScrim.addEventListener('click', closeDrawers);
    $$('[data-close-drawer]').forEach(button => button.addEventListener('click', closeDrawers));
    $$('.scene-card').forEach(card => card.addEventListener('click', () => chooseBackground(card.dataset.scene)));
    el.musicButton.addEventListener('click', toggleMusic);
    el.lofiAudio.addEventListener('play', renderMusic);
    el.lofiAudio.addEventListener('pause', renderMusic);
    el.lofiAudio.addEventListener('error', () => showToast('lofi.mp3を読み込めませんでした'));
    el.midAudio.addEventListener('play', applyVolumes);
    el.midAudio.addEventListener('ended', applyVolumes);
    el.midAudio.addEventListener('error', () => showToast('mid.mp3を読み込めませんでした'));
    bindRange(el.masterVolume, 'masterVolume', el.volumeValue);
    bindRange(el.musicVolume, 'musicVolume', el.musicVolumeValue);
    bindRange(el.rainVolume, 'rainVolume', el.rainVolumeValue);
    bindRange(el.nightVolume, 'nightVolume', el.nightVolumeValue);
    $('#levelClose').addEventListener('click', () => { el.levelUp.hidden = true; });
    document.addEventListener('keydown', handleKeyboard);
  }

  function bindRange(input, key, valueElement) {
    input.addEventListener('input', () => {
      state[key] = Number(input.value);
      valueElement.textContent = input.value;
      paintRange(input);
      applyVolumes();
      saveState();
    });
  }

  function toggleWork() {
    if (state.active) stopWork(); else startWork();
  }

  function startWork() {
    const now = Date.now();
    normalizeDay();
    state.active = true;
    state.sessionStartedAt = now;
    state.lastAccountedAt = now;
    state.sessions += 1;
    saveCountdown = SAVE_INTERVAL_SECONDS;
    lastAutoLineAt = now;
    saveState();
    ensureAudio();
    playMusic();
    setSpeech(randomLine(lines));
    reactCharacter();
    renderAll();
  }

  function stopWork() {
    accountTime();
    const sessionSeconds = Math.max(0, Math.floor((Date.now() - Number(state.sessionStartedAt || Date.now())) / 1000));
    state.active = false;
    state.sessionStartedAt = null;
    state.lastAccountedAt = null;
    saveState();
    setSpeech(randomLine(lines));
    reactCharacter();
    showToast(`${formatDuration(sessionSeconds)}の作業を記録しました`);
    renderAll();
  }

  function accountTime() {
    if (!state.active) return;
    const now = Date.now();
    normalizeDay();
    const previous = Number(state.lastAccountedAt) || now;
    const delta = Math.max(0, Math.floor((now - previous) / 1000));
    if (!delta) return;
    const oldLevel = getLevelData(state.totalSeconds).level;
    state.totalSeconds += delta;
    state.todaySeconds += delta;
    state.lastAccountedAt = previous + delta * 1000;
    const current = getLevelData(state.totalSeconds);
    if (current.level > oldLevel) showLevelUp(current);
  }

  function tick() {
    if (!state.active) return;
    accountTime();
    renderTime();
    renderBond();
    saveCountdown -= 1;
    if (saveCountdown <= 0) {
      saveState();
      saveCountdown = SAVE_INTERVAL_SECONDS;
    }
    const now = Date.now();
    if (now - lastAutoLineAt > 42_000) {
      setSpeech(randomLine(lines));
      lastAutoLineAt = now;
    }
  }

  function renderAll() {
    el.body.classList.toggle('is-working', state.active);
    el.onAir.hidden = !state.active;
    el.liveCaption.hidden = !state.active;
    el.workButtonIcon.setAttribute('href', state.active ? '#i-stop' : '#i-play');
    el.workButtonLabel.textContent = state.active ? '作業を終える。' : '作業を開始する。';
    document.title = state.active ? `${formatClock(sessionElapsed())} — Kofu with You` : 'Kofu with You : Game Story';
    renderTime();
    renderBond();
  }

  function renderTime() {
    const elapsed = formatClock(sessionElapsed());
    el.headerElapsed.textContent = elapsed;
    el.stageElapsed.textContent = elapsed;
    el.todayTime.textContent = formatFriendlyTime(state.todaySeconds);
    el.totalTime.textContent = formatFriendlyTime(state.totalSeconds);
    el.sessionCount.textContent = `${state.sessions}回`;
  }

  function sessionElapsed() {
    if (!state.active || !state.sessionStartedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(state.sessionStartedAt)) / 1000));
  }

  function formatClock(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
      : `${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function formatFriendlyTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}時間${rest}分` : `${hours}時間`;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    return formatFriendlyTime(seconds);
  }

  function getLevelData(totalSeconds) {
    let level = 1;
    let current = 0;
    let next = levelThresholds[1];
    for (let i = 1; i < levelThresholds.length; i++) {
      if (totalSeconds < levelThresholds[i]) {
        level = i;
        current = levelThresholds[i - 1];
        next = levelThresholds[i];
        return { level, current, next, title: levelTitles[Math.min(level - 1, levelTitles.length - 1)] };
      }
    }
    const extra = Math.floor((totalSeconds - levelThresholds.at(-1)) / 43_200);
    level = levelThresholds.length + extra;
    current = levelThresholds.at(-1) + extra * 43_200;
    next = current + 43_200;
    return { level, current, next, title: levelTitles.at(-1) };
  }

  function renderBond() {
    const data = getLevelData(state.totalSeconds);
    const span = data.next - data.current;
    const progress = span > 0 ? ((state.totalSeconds - data.current) / span) * 100 : 100;
    const remaining = Math.max(0, data.next - state.totalSeconds);
    el.bondLevel.textContent = `Lv.${data.level}`;
    el.bondProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    el.bondTitle.textContent = data.title;
    el.bondNext.textContent = `あと${formatFriendlyTimeCeil(remaining)}でレベルアップ`;
  }

  function formatFriendlyTimeCeil(seconds) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}時間${rest}分` : `${hours}時間`;
  }

  function showLevelUp(data) {
    el.newLevel.textContent = `Lv.${data.level}`;
    el.levelQuote.textContent = randomLine(lines);
    el.levelUp.hidden = false;
    playLevelChime();
    reactCharacter();
  }

  function talkToKofunei(withPop = true) {
    setSpeech(randomLine(lines));
    reactCharacter();
    if (withPop) playSoftPop();
  }

  function handleCharacterClick() {
    playMidClip();
    talkToKofunei(false);
  }

  async function playMidClip() {
    try {
      el.midAudio.pause();
      el.midAudio.currentTime = 0;
      await el.midAudio.play();
      applyVolumes();
    } catch {
      applyVolumes();
      showToast('mid.mp3を再生できませんでした');
    }
  }

  function randomLine(pool) {
    if (pool.length === 1) return pool[0];
    let result = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (result === lastLine && guard < 8) {
      result = pool[Math.floor(Math.random() * pool.length)];
      guard++;
    }
    return result;
  }

  function setSpeech(text) {
    lastLine = text;
    el.speechText.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' });
    el.speechText.textContent = text;
    el.dockMessage.textContent = text;
  }

  function reactCharacter() {
    el.characterButton.classList.remove('react');
    requestAnimationFrame(() => el.characterButton.classList.add('react'));
    setTimeout(() => el.characterButton.classList.remove('react'), 750);
  }

  function preloadBackgrounds() {
    Object.values(backgrounds).forEach(item => { const image = new Image(); image.src = item.src; });
  }

  function setBackground(key, immediate = false) {
    if (!backgrounds[key]) key = 'evening';
    const nextLayer = immediate ? el.sceneA : (activeLayer === 0 ? el.sceneB : el.sceneA);
    const oldLayer = activeLayer === 0 ? el.sceneA : el.sceneB;
    nextLayer.style.backgroundImage = `url('${backgrounds[key].src}')`;
    if (immediate) {
      el.sceneA.classList.add('active');
      el.sceneB.classList.remove('active');
      activeLayer = 0;
    } else if (nextLayer !== oldLayer) {
      requestAnimationFrame(() => {
        nextLayer.classList.add('active');
        oldLayer.classList.remove('active');
      });
      activeLayer = activeLayer === 0 ? 1 : 0;
    }
    state.background = key;
    el.body.dataset.scene = key;
    $$('.scene-card').forEach(card => card.classList.toggle('active', card.dataset.scene === key));
  }

  function chooseBackground(key) {
    const changed = state.background !== key;
    setBackground(key);
    if (key === 'rain' && state.rainVolume === 0) {
      state.rainVolume = 28;
      el.rainVolume.value = 28;
      el.rainVolumeValue.textContent = '28';
      paintRange(el.rainVolume);
      ensureAudio();
    }
    applyVolumes();
    saveState();
    closeDrawers();
    if (changed) setSpeech(randomLine(lines));
  }

  function toggleDrawer(drawer) {
    const shouldOpen = drawer.hidden;
    closeDrawers();
    if (shouldOpen) {
      drawer.hidden = false;
      el.drawerScrim.hidden = false;
      $('#backgroundButton').classList.toggle('active', drawer === el.backgroundDrawer);
      $('#soundButton').classList.toggle('active', drawer === el.soundDrawer);
    }
  }

  function closeDrawers() {
    el.backgroundDrawer.hidden = true;
    el.soundDrawer.hidden = true;
    el.drawerScrim.hidden = true;
    $('#backgroundButton').classList.remove('active');
    $('#soundButton').classList.remove('active');
  }

  function loadGalleryEdits() {
    try {
      const saved = JSON.parse(localStorage.getItem(GALLERY_EDITS_KEY));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  function buildGallery() {
    el.galleryGrid.replaceChildren();
    const count = galleryItems.length;
    $('#galleryArchiveCount').textContent = `THUMBNAIL ARCHIVE · ${String(count).padStart(3, '0')}`;
    $('#galleryReadyCount').textContent = `${count} THUMBNAILS READY TO EDIT`;

    galleryItems.forEach((item, index) => {
      const article = document.createElement('article');
      article.className = 'gallery-card';

      const preview = document.createElement('button');
      preview.className = 'gallery-preview';
      preview.dataset.galleryIndex = index;
      preview.setAttribute('aria-label', `${item.title}を編集`);

      const composite = document.createElement('span');
      composite.className = 'gallery-composite';
      composite.style.aspectRatio = `${item.width} / ${item.height}`;

      const base = document.createElement('img');
      base.className = 'gallery-base';
      base.src = item.preview || item.src;
      base.alt = item.title;
      base.loading = 'lazy';
      base.decoding = 'async';
      base.draggable = false;

      const shouldBlackout = typeof item.confidence === 'number'
        && item.confidence > 0
        && item.silhouette;
      const blackout = shouldBlackout ? document.createElement('img') : null;
      if (blackout) {
        blackout.className = 'gallery-blackout';
        blackout.src = OLD_REFERENCE_SRC;
        blackout.alt = '';
        blackout.loading = 'lazy';
        blackout.draggable = false;
        blackout.style.left = `${item.silhouette.x * 100}%`;
        blackout.style.top = `${item.silhouette.y * 100}%`;
        blackout.style.width = `${item.silhouette.w * 100}%`;
        blackout.style.height = `${item.silhouette.h * 100}%`;
      }

      const overlay = document.createElement('img');
      overlay.className = 'gallery-overlay';
      overlay.src = KOFU_OVERLAY_SRC;
      overlay.alt = '';
      overlay.dataset.galleryIndex = index;
      overlay.loading = 'lazy';
      overlay.draggable = false;

      const number = document.createElement('span');
      number.className = 'gallery-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const view = document.createElement('span');
      view.className = 'gallery-view';
      view.innerHTML = 'EDIT <svg><use href="#i-expand"></use></svg>';

      composite.append(base);
      if (blackout) composite.append(blackout);
      composite.append(overlay);
      preview.append(composite, number, view);

      const copy = document.createElement('div');
      copy.className = 'gallery-card-copy';
      const text = document.createElement('div');
      const meta = document.createElement('small');
      meta.textContent = `THUMBNAIL · ${String(index + 1).padStart(2, '0')}`;
      const title = document.createElement('h3');
      title.textContent = item.title;
      text.append(meta, title);

      const edit = document.createElement('button');
      edit.className = 'gallery-edit-button';
      edit.dataset.galleryIndex = index;
      edit.setAttribute('aria-label', `${item.title}を編集してダウンロード`);
      edit.innerHTML = '<svg><use href="#i-download"></use></svg>';
      copy.append(text, edit);
      article.append(preview, copy);
      el.galleryGrid.append(article);
      updatePreviewOverlay(index);
    });

    // Replace the CSS-blackened fallback with a binary, fully opaque mask.
    // A small outward bleed hides antialiased source pixels at every scale.
    getBlackoutSilhouetteSource()
      .then(source => $$('.gallery-blackout').forEach(image => { image.src = source; }))
      .catch(() => { /* old.png + CSS filter remains as a safe fallback */ });
  }

  function getGalleryPlacement(index) {
    const item = galleryItems[index];
    const saved = galleryEdits[item.src];
    return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && Number.isFinite(saved.w)
      ? {
          x: saved.x,
          y: saved.y,
          w: saved.w,
          flipped: Boolean(saved.flipped),
          rotation: normalizeRotation(saved.rotation)
        }
      : { ...item.placement, flipped: false, rotation: 0 };
  }

  function updatePreviewOverlay(index) {
    const overlay = $(`.gallery-overlay[data-gallery-index="${index}"]`);
    if (!overlay) return;
    const placement = getGalleryPlacement(index);
    overlay.style.left = `${placement.x * 100}%`;
    overlay.style.top = `${placement.y * 100}%`;
    overlay.style.width = `${placement.w * 100}%`;
    overlay.style.transform = `rotate(${placement.rotation}deg) scaleX(${placement.flipped ? -1 : 1})`;
  }

  function openGallery() {
    closeDrawers();
    el.gallery.hidden = false;
    el.galleryButton.classList.add('active');
    el.body.classList.add('gallery-open');
    requestAnimationFrame(() => el.galleryClose.focus({ preventScroll: true }));
  }

  function closeGallery() {
    closeLightbox(false);
    el.gallery.hidden = true;
    el.galleryButton.classList.remove('active');
    el.body.classList.remove('gallery-open');
    el.galleryButton.focus({ preventScroll: true });
  }

  async function openLightbox(index) {
    activeGalleryIndex = Math.max(0, Math.min(galleryItems.length - 1, index));
    renderLightbox();
    el.galleryLightbox.hidden = false;
    await loadEditorItem();
    requestAnimationFrame(() => $('#lightboxClose').focus({ preventScroll: true }));
  }

  function renderLightbox() {
    const item = galleryItems[activeGalleryIndex];
    el.lightboxMeta.textContent = `${String(activeGalleryIndex + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')} · POSITION · SIZE · ROTATION`;
    el.lightboxTitle.textContent = item.title;
  }

  function closeLightbox(restoreFocus = true) {
    if (el.galleryLightbox.hidden) return;
    editorLoadToken += 1;
    el.galleryLightbox.hidden = true;
    if (restoreFocus) {
      $(`.gallery-preview[data-gallery-index="${activeGalleryIndex}"]`)?.focus({ preventScroll: true });
    }
  }

  async function stepLightbox(direction) {
    activeGalleryIndex = (activeGalleryIndex + direction + galleryItems.length) % galleryItems.length;
    renderLightbox();
    await loadEditorItem();
    el.editorCanvas.animate([{ opacity: .15, transform: `translateX(${direction * 12}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function getBlackoutSilhouetteSource() {
    if (blackoutSilhouetteSourcePromise) return blackoutSilhouetteSourcePromise;
    blackoutSilhouetteSourcePromise = loadImage(OLD_REFERENCE_SRC).then(referenceImage => {
      const width = referenceImage.naturalWidth;
      const height = OLD_COMPLETE_MASK_HEIGHT;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(referenceImage, 0, 0);

      // old.png is cropped exactly at y=400, but the copies embedded in the
      // thumbnails continue into these two feet. Reconstruct that missing
      // lower silhouette before binarizing so no orange/white fragment remains.
      context.fillStyle = '#000';
      context.beginPath();
      context.ellipse(205, 400, 115, 20, 0, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.moveTo(98, 389);
      context.bezierCurveTo(126, 385, 170, 388, 194, 404);
      context.bezierCurveTo(213, 417, 223, 438, 216, 456);
      context.bezierCurveTo(205, 461, 193, 459, 183, 453);
      context.bezierCurveTo(177, 474, 157, 478, 145, 462);
      context.bezierCurveTo(128, 476, 105, 469, 112, 450);
      context.bezierCurveTo(91, 451, 94, 432, 111, 423);
      context.bezierCurveTo(96, 414, 91, 400, 98, 389);
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(184, 386);
      context.bezierCurveTo(211, 382, 248, 387, 267, 399);
      context.bezierCurveTo(284, 409, 294, 424, 287, 439);
      context.bezierCurveTo(278, 448, 265, 448, 253, 441);
      context.bezierCurveTo(245, 456, 229, 454, 226, 438);
      context.bezierCurveTo(211, 449, 196, 439, 202, 424);
      context.bezierCurveTo(183, 417, 176, 398, 184, 386);
      context.closePath();
      context.fill();

      const source = context.getImageData(0, 0, width, height).data;
      const blackout = context.createImageData(width, height);
      const radius = BLACKOUT_BLEED_PIXELS;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (source[(y * width + x) * 4 + 3] === 0) continue;
          const startY = Math.max(0, y - radius);
          const endY = Math.min(height - 1, y + radius);
          const startX = Math.max(0, x - radius);
          const endX = Math.min(width - 1, x + radius);
          for (let maskY = startY; maskY <= endY; maskY += 1) {
            for (let maskX = startX; maskX <= endX; maskX += 1) {
              blackout.data[(maskY * width + maskX) * 4 + 3] = 255;
            }
          }
        }
      }

      context.clearRect(0, 0, width, height);
      context.putImageData(blackout, 0, 0);
      return canvas.toDataURL('image/png');
    });
    return blackoutSilhouetteSourcePromise;
  }

  async function loadReferenceImage() {
    return loadImage(await getBlackoutSilhouetteSource());
  }

  async function loadEditorItem() {
    const token = ++editorLoadToken;
    const item = galleryItems[activeGalleryIndex];
    editorBaseImage = null;
    editorOverlayImage = null;
    editorReferenceImage = null;
    editorPlacement = getGalleryPlacement(activeGalleryIndex);
    $('#overlayFlip').classList.toggle('active', editorPlacement.flipped);
    $('#overlayFlip').setAttribute('aria-pressed', String(editorPlacement.flipped));
    el.editorLoading.hidden = false;
    el.editorHint.hidden = true;
    el.editorCanvas.hidden = true;
    try {
      const [base, overlay, reference] = await Promise.all([
        loadImage(item.src),
        editorOverlayImage ? Promise.resolve(editorOverlayImage) : loadImage(KOFU_OVERLAY_SRC),
        loadReferenceImage()
      ]);
      if (token !== editorLoadToken) return;
      editorBaseImage = base;
      editorOverlayImage = overlay;
      editorReferenceImage = reference;
      el.editorCanvas.width = base.naturalWidth;
      el.editorCanvas.height = base.naturalHeight;
      el.editorCanvas.style.aspectRatio = `${base.naturalWidth} / ${base.naturalHeight}`;
      el.editorLoading.hidden = true;
      el.editorHint.hidden = false;
      el.editorCanvas.hidden = false;
      drawEditor();
    } catch {
      if (token !== editorLoadToken) return;
      el.editorLoading.textContent = '画像を読み込めませんでした';
    }
  }

  function overlayHeightRatio(placement = editorPlacement) {
    if (!editorBaseImage || !placement) return 0;
    return placement.w * editorBaseImage.naturalWidth / KOFU_OVERLAY_ASPECT / editorBaseImage.naturalHeight;
  }

  function normalizeRotation(value) {
    const angle = Number(value);
    if (!Number.isFinite(angle)) return 0;
    const normalized = ((angle + 180) % 360 + 360) % 360 - 180;
    return normalized === -180 && angle > 0 ? 180 : normalized;
  }

  function editorRotationRadians(placement = editorPlacement) {
    return normalizeRotation(placement?.rotation) * Math.PI / 180;
  }

  function drawReferenceSilhouetteMask(targetCanvas, referenceImage, drawX, drawY, drawWidth, drawHeight) {
    if (!referenceImage || drawWidth <= 0 || drawHeight <= 0) return;
    const context = targetCanvas.getContext('2d');
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = targetCanvas.width;
    maskCanvas.height = targetCanvas.height;
    const maskContext = maskCanvas.getContext('2d');
    maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskContext.drawImage(referenceImage, drawX, drawY, drawWidth, drawHeight);
    const imageData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 0) {
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
      }
    }
    maskContext.putImageData(imageData, 0, 0);
    context.save();
    context.globalCompositeOperation = 'source-over';
    context.drawImage(maskCanvas, 0, 0);
    context.restore();
  }

  function getEditorSilhouetteRect(item = galleryItems[activeGalleryIndex]) {
    if (!editorBaseImage || !item) return null;
    const width = editorBaseImage.naturalWidth;
    const height = editorBaseImage.naturalHeight;
    if (item.silhouette && typeof item.silhouette.x === 'number') {
      return {
        x: item.silhouette.x * width,
        y: item.silhouette.y * height,
        w: item.silhouette.w * width,
        h: item.silhouette.h * height
      };
    }
    const placement = item.placement || editorPlacement;
    if (!placement) return null;
    const overlayWidth = placement.w * width;
    const overlayHeight = overlayWidth / KOFU_OVERLAY_ASPECT;
    const x = placement.x * width;
    const y = placement.y * height;
    return {
      x: x + overlayWidth * 0.16,
      y: y + overlayHeight * 0.06,
      w: overlayWidth * 0.72,
      h: overlayHeight * 0.90
    };
  }

  function drawEditor(showGuides = true, targetCanvas = el.editorCanvas) {
    if (!editorBaseImage || !editorOverlayImage || !editorPlacement) return;
    const context = targetCanvas.getContext('2d');
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const overlayWidth = editorPlacement.w * width;
    const overlayHeight = overlayWidth / KOFU_OVERLAY_ASPECT;
    const x = editorPlacement.x * width;
    const y = editorPlacement.y * height;
    const centerX = x + overlayWidth / 2;
    const centerY = y + overlayHeight / 2;
    const rotation = editorRotationRadians();
    const item = galleryItems[activeGalleryIndex];
    const shouldBlackoutOldImage = typeof item?.confidence === 'number' && item.confidence > 0;
    context.clearRect(0, 0, width, height);
    context.drawImage(editorBaseImage, 0, 0, width, height);
    if (shouldBlackoutOldImage && editorReferenceImage) {
      const silhouetteRect = getEditorSilhouetteRect(item);
      if (silhouetteRect) {
        drawReferenceSilhouetteMask(
          targetCanvas,
          editorReferenceImage,
          silhouetteRect.x,
          silhouetteRect.y,
          silhouetteRect.w,
          silhouetteRect.h
        );
      }
    }
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.scale(editorPlacement.flipped ? -1 : 1, 1);
    context.drawImage(editorOverlayImage, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
    context.restore();

    if (!showGuides) return;
    const line = Math.max(2, width / 500);
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.strokeStyle = 'rgba(255, 199, 145, .95)';
    context.lineWidth = line;
    context.setLineDash([line * 4, line * 3]);
    context.strokeRect(-overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
    context.setLineDash([]);
    context.fillStyle = '#ffd0a5';
    const handle = line * 3;
    [
      [-overlayWidth / 2, -overlayHeight / 2],
      [overlayWidth / 2, -overlayHeight / 2],
      [-overlayWidth / 2, overlayHeight / 2],
      [overlayWidth / 2, overlayHeight / 2]
    ].forEach(([handleX, handleY]) => {
      context.beginPath();
      context.arc(handleX, handleY, handle, 0, Math.PI * 2);
      context.fill();
    });

    const displayWidth = targetCanvas.getBoundingClientRect().width || width;
    const displayScale = displayWidth / width;
    const rotationStem = ROTATION_HANDLE_DISTANCE / displayScale;
    const rotationHandle = Math.max(handle * 1.15, 7 / displayScale);
    const rotationY = -overlayHeight / 2 - rotationStem;
    context.strokeStyle = '#76c98a';
    context.lineWidth = Math.max(line, 2 / displayScale);
    context.beginPath();
    context.moveTo(0, -overlayHeight / 2);
    context.lineTo(0, rotationY);
    context.stroke();
    context.fillStyle = '#76c98a';
    context.strokeStyle = '#e9fff0';
    context.lineWidth = Math.max(line * .75, 1.5 / displayScale);
    context.beginPath();
    context.arc(0, rotationY, rotationHandle, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  function editorPointerPosition(event) {
    const rect = el.editorCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      pixelX: event.clientX - rect.left,
      pixelY: event.clientY - rect.top,
      rect
    };
  }

  function editorOverlayGeometry(rect) {
    if (!editorPlacement || !rect) return null;
    const width = editorPlacement.w * rect.width;
    const height = overlayHeightRatio() * rect.height;
    const centerX = editorPlacement.x * rect.width + width / 2;
    const centerY = editorPlacement.y * rect.height + height / 2;
    const angle = editorRotationRadians();
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const corners = [
      { name: 'nw', signX: -1, signY: -1 },
      { name: 'ne', signX: 1, signY: -1 },
      { name: 'sw', signX: -1, signY: 1 },
      { name: 'se', signX: 1, signY: 1 }
    ].map(corner => {
      const localX = corner.signX * width / 2;
      const localY = corner.signY * height / 2;
      const rotatedX = localX * cosine - localY * sine;
      const rotatedY = localX * sine + localY * cosine;
      return {
        ...corner,
        x: centerX + rotatedX,
        y: centerY + rotatedY,
        anchorX: centerX - rotatedX,
        anchorY: centerY - rotatedY
      };
    });
    const rotationLocalY = -height / 2 - ROTATION_HANDLE_DISTANCE;
    const rotationHandle = {
      x: centerX - rotationLocalY * sine,
      y: centerY + rotationLocalY * cosine
    };
    return { width, height, centerX, centerY, angle, cosine, sine, corners, rotationHandle };
  }

  function editorRotationHandleAt(point) {
    const geometry = editorOverlayGeometry(point.rect);
    if (!geometry) return null;
    const distance = Math.hypot(
      point.pixelX - geometry.rotationHandle.x,
      point.pixelY - geometry.rotationHandle.y
    );
    return distance <= ROTATION_HANDLE_HIT_RADIUS ? geometry : null;
  }

  function editorHandleAt(point) {
    const geometry = editorOverlayGeometry(point.rect);
    if (!geometry) return null;
    return geometry.corners.find(handle => {
      const deltaX = point.pixelX - handle.x;
      const deltaY = point.pixelY - handle.y;
      return Math.hypot(deltaX, deltaY) <= 20;
    }) || null;
  }

  function pointInsideOverlay(point) {
    const geometry = editorOverlayGeometry(point.rect);
    if (!geometry) return false;
    const deltaX = point.pixelX - geometry.centerX;
    const deltaY = point.pixelY - geometry.centerY;
    const localX = deltaX * geometry.cosine + deltaY * geometry.sine;
    const localY = -deltaX * geometry.sine + deltaY * geometry.cosine;
    return Math.abs(localX) <= geometry.width / 2
      && Math.abs(localY) <= geometry.height / 2;
  }

  function startEditorDrag(event) {
    if (!editorPlacement || !editorBaseImage) return;
    const point = editorPointerPosition(event);
    const rotationGeometry = editorRotationHandleAt(point);
    const handle = editorHandleAt(point);
    if (rotationGeometry) {
      const pointerAngle = Math.atan2(
        point.pixelY - rotationGeometry.centerY,
        point.pixelX - rotationGeometry.centerX
      );
      editorDrag = {
        type: 'rotate',
        centerX: rotationGeometry.centerX,
        centerY: rotationGeometry.centerY,
        offset: editorRotationRadians() - pointerAngle
      };
    } else if (handle) {
      const geometry = editorOverlayGeometry(point.rect);
      editorDrag = {
        type: 'resize',
        anchorX: handle.anchorX,
        anchorY: handle.anchorY,
        signX: handle.signX,
        signY: handle.signY,
        ratio: geometry.height / geometry.width,
        angle: editorRotationRadians(),
        rectWidth: point.rect.width,
        rectHeight: point.rect.height
      };
    } else if (pointInsideOverlay(point)) {
      editorDrag = {
        type: 'move',
        offsetX: point.x - editorPlacement.x,
        offsetY: point.y - editorPlacement.y
      };
    } else {
      return;
    }
    el.editorCanvas.setPointerCapture(event.pointerId);
    el.editorCanvas.classList.add('dragging');
    el.editorCanvas.style.cursor = 'grabbing';
    event.preventDefault();
  }

  function moveEditorDrag(event) {
    const point = editorPointerPosition(event);
    if (!editorDrag || !editorPlacement) {
      const rotationGeometry = editorRotationHandleAt(point);
      const handle = editorHandleAt(point);
      if (rotationGeometry) {
        el.editorCanvas.style.cursor = 'crosshair';
      } else if (handle) {
        el.editorCanvas.style.cursor = handle.name === 'nw' || handle.name === 'se' ? 'nwse-resize' : 'nesw-resize';
      } else {
        el.editorCanvas.style.cursor = pointInsideOverlay(point) ? 'grab' : 'default';
      }
      return;
    }

    if (editorDrag.type === 'rotate') {
      const pointerAngle = Math.atan2(
        point.pixelY - editorDrag.centerY,
        point.pixelX - editorDrag.centerX
      );
      editorPlacement.rotation = normalizeRotation(
        (pointerAngle + editorDrag.offset) * 180 / Math.PI
      );
    } else if (editorDrag.type === 'move') {
      editorPlacement.x = point.x - editorDrag.offsetX;
      editorPlacement.y = point.y - editorDrag.offsetY;
    } else {
      const deltaY = point.pixelY - editorDrag.anchorY;
      const ratio = editorDrag.ratio;
      const deltaPixelX = point.pixelX - editorDrag.anchorX;
      const cosine = Math.cos(editorDrag.angle);
      const sine = Math.sin(editorDrag.angle);
      const basisX = editorDrag.signX * cosine - editorDrag.signY * ratio * sine;
      const basisY = editorDrag.signX * sine + editorDrag.signY * ratio * cosine;
      const projectedPixelWidth = (
        deltaPixelX * basisX + deltaY * basisY
      ) / (basisX * basisX + basisY * basisY);
      const width = Math.min(1.25, Math.max(.03, projectedPixelWidth / editorDrag.rectWidth));
      const pixelWidth = width * editorDrag.rectWidth;
      const pixelHeight = pixelWidth * ratio;
      const vectorX = (editorDrag.signX * pixelWidth) * cosine
        - (editorDrag.signY * pixelHeight) * sine;
      const vectorY = (editorDrag.signX * pixelWidth) * sine
        + (editorDrag.signY * pixelHeight) * cosine;
      const centerX = editorDrag.anchorX + vectorX / 2;
      const centerY = editorDrag.anchorY + vectorY / 2;
      editorPlacement.w = width;
      editorPlacement.x = (centerX - pixelWidth / 2) / editorDrag.rectWidth;
      editorPlacement.y = (centerY - pixelHeight / 2) / editorDrag.rectHeight;
    }
    drawEditor();
    event.preventDefault();
  }

  function stopEditorDrag(event) {
    if (!editorDrag) return;
    editorDrag = null;
    el.editorCanvas.classList.remove('dragging');
    el.editorCanvas.style.cursor = 'grab';
    if (el.editorCanvas.hasPointerCapture(event.pointerId)) el.editorCanvas.releasePointerCapture(event.pointerId);
    saveEditorPlacement();
  }

  function saveEditorPlacement() {
    if (!editorPlacement) return;
    const item = galleryItems[activeGalleryIndex];
    galleryEdits[item.src] = { ...editorPlacement };
    try { localStorage.setItem(GALLERY_EDITS_KEY, JSON.stringify(galleryEdits)); } catch { /* storage is optional */ }
    updatePreviewOverlay(activeGalleryIndex);
  }

  function flipEditorOverlay() {
    if (!editorPlacement) return;
    editorPlacement.flipped = !editorPlacement.flipped;
    const button = $('#overlayFlip');
    button.classList.toggle('active', editorPlacement.flipped);
    button.setAttribute('aria-pressed', String(editorPlacement.flipped));
    drawEditor();
    saveEditorPlacement();
  }

  function downloadEditedThumbnail() {
    if (!editorBaseImage || !editorOverlayImage || !editorPlacement) return;
    const canvas = document.createElement('canvas');
    canvas.width = editorBaseImage.naturalWidth;
    canvas.height = editorBaseImage.naturalHeight;
    drawEditor(false, canvas);
    canvas.toBlob(blob => {
      if (!blob) {
        showToast('PNGを作成できませんでした');
        return;
      }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `kofunei-thumbnail-${String(activeGalleryIndex + 1).padStart(2, '0')}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('編集したPNGを保存しました');
    }, 'image/png');
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showToast('このブラウザでは全画面表示を利用できません');
    }
  }

  function handleKeyboard(event) {
    if (event.key === 'Escape') {
      if (!el.galleryLightbox.hidden) closeLightbox();
      else if (!el.gallery.hidden) closeGallery();
      else closeDrawers();
      return;
    }
    if (!el.galleryLightbox.hidden && event.key === 'ArrowLeft') { stepLightbox(-1); return; }
    if (!el.galleryLightbox.hidden && event.key === 'ArrowRight') { stepLightbox(1); return; }
    if (!el.gallery.hidden || event.target.matches('input,textarea,button')) return;
    if (event.code === 'Space') { event.preventDefault(); toggleWork(); }
    if (event.key.toLowerCase() === 'm') toggleMusic();
  }

  function handleVisibility() {
    if (!document.hidden && state.active) {
      accountTime();
      renderAll();
      saveState();
    }
  }

  function applySoundSettings() {
    [[el.masterVolume, state.masterVolume, el.volumeValue], [el.musicVolume, state.musicVolume, el.musicVolumeValue], [el.rainVolume, state.rainVolume, el.rainVolumeValue], [el.nightVolume, state.nightVolume, el.nightVolumeValue]].forEach(([input, value, label]) => {
      input.value = value;
      label.textContent = value;
      paintRange(input);
    });
    applyVolumes();
  }

  function paintRange(input) {
    const minimum = Number(input.min || 0);
    const maximum = Number(input.max || 100);
    const percent = maximum > minimum ? (Number(input.value) - minimum) / (maximum - minimum) * 100 : 0;
    input.style.setProperty('--range', `${Math.min(100, Math.max(0, percent))}%`);
  }

  function toggleMusic() {
    ensureAudio();
    if (el.lofiAudio.paused) playMusic(); else el.lofiAudio.pause();
  }

  async function playMusic() {
    try {
      await el.lofiAudio.play();
    } catch {
      showToast('再生ボタンを押すとBGMが始まります');
    }
  }

  function renderMusic() {
    const playing = !el.lofiAudio.paused;
    el.musicIcon.setAttribute('href', playing ? '#i-pause' : '#i-play');
    el.musicButton.setAttribute('aria-label', playing ? 'BGMを一時停止' : 'BGMを再生');
    el.equalizer.classList.toggle('playing', playing);
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      startAmbience();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    applyVolumes();
  }

  function startAmbience() {
    if (ambienceStarted || !audioContext) return;
    ambienceStarted = true;
    const bufferSize = audioContext.sampleRate * 2;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
    const rainSource = audioContext.createBufferSource();
    const rainFilter = audioContext.createBiquadFilter();
    rainGain = audioContext.createGain();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1200;
    rainSource.connect(rainFilter).connect(rainGain).connect(masterGain);
    rainSource.start();
    nightGain = audioContext.createGain();
    nightGain.connect(masterGain);
    scheduleCricket();
    applyVolumes();
  }

  function scheduleCricket() {
    if (!audioContext || !nightGain) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 4100 + Math.random() * 650;
    gain.gain.setValueAtTime(0, now);
    for (let i = 0; i < 4; i++) {
      gain.gain.linearRampToValueAtTime(.028, now + i * .095 + .02);
      gain.gain.linearRampToValueAtTime(0, now + i * .095 + .065);
    }
    oscillator.connect(gain).connect(nightGain);
    oscillator.start(now);
    oscillator.stop(now + .45);
    setTimeout(scheduleCricket, 1800 + Math.random() * 3200);
  }

  function applyVolumes() {
    const master = state.masterVolume / 100;
    const midPlaying = !el.midAudio.paused && !el.midAudio.ended;
    el.midAudio.volume = Math.min(1, master);
    el.lofiAudio.volume = Math.min(1, master * state.musicVolume / 100 * (midPlaying ? .28 : 1));
    if (!audioContext) return;
    masterGain.gain.setTargetAtTime(master, audioContext.currentTime, .05);
    rainGain?.gain.setTargetAtTime(state.rainVolume / 100 * .34, audioContext.currentTime, .08);
    nightGain?.gain.setTargetAtTime(state.nightVolume / 100 * .85, audioContext.currentTime, .08);
  }

  function playSoftPop() {
    ensureAudio();
    if (!audioContext || !masterGain) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(730, now + .1);
    gain.gain.setValueAtTime(.045, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .14);
    oscillator.connect(gain).connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + .15);
  }

  function playLevelChime() {
    ensureAudio();
    if (!audioContext || !masterGain) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * .11;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.linearRampToValueAtTime(.08, start + .025);
      gain.gain.exponentialRampToValueAtTime(.001, start + .58);
      oscillator.connect(gain).connect(masterGain);
      oscillator.start(start);
      oscillator.stop(start + .6);
    });
  }

  function buildAtmosphere() {
    const rain = $('#rainLayer');
    for (let i = 0; i < 38; i++) {
      const drop = document.createElement('i');
      drop.className = 'rain-drop';
      drop.style.left = `${Math.random() * 115}%`;
      drop.style.opacity = `${.12 + Math.random() * .43}`;
      drop.style.animationDuration = `${.75 + Math.random() * .95}s`;
      drop.style.animationDelay = `${-Math.random() * 4}s`;
      rain.append(drop);
    }
    const dust = $('#dustLayer');
    for (let i = 0; i < 12; i++) {
      const mote = document.createElement('i');
      mote.className = 'dust';
      mote.style.left = `${30 + Math.random() * 66}%`;
      mote.style.top = `${44 + Math.random() * 38}%`;
      mote.style.animationDelay = `${-Math.random() * 8}s`;
      mote.style.animationDuration = `${6 + Math.random() * 5}s, ${2 + Math.random() * 2.5}s`;
      dust.append(mote);
    }
  }

  function schedulePerippaFlight(initial = false) {
    clearTimeout(perippaFlightTimer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wait = initial ? randomBetween(18_000, 34_000) : randomBetween(140_000, 300_000);
    perippaFlightTimer = setTimeout(() => {
      launchPerippaFlight();
      schedulePerippaFlight(false);
    }, wait);
  }

  function launchPerippaFlight() {
    if (document.hidden) return;
    const layer = $('#perippaFlightLayer');
    if (!layer || layer.querySelector('.perippa-fly')) return;
    const perippa = document.createElement('img');
    const fliesRight = Math.random() < .5;
    perippa.className = `perippa-fly ${fliesRight ? 'to-right' : 'to-left'}`;
    perippa.src = 'perippa.webp';
    perippa.alt = '';
    perippa.setAttribute('aria-hidden', 'true');
    perippa.style.top = `${randomBetween(11, 57)}%`;
    perippa.style.width = `${randomBetween(92, 148)}px`;
    perippa.style.setProperty('--flight-duration', `${randomBetween(9, 14)}s`);
    perippa.addEventListener('animationend', () => perippa.remove(), { once: true });
    layer.append(perippa);
  }

  function randomBetween(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  function showToast(message) {
    clearTimeout(toastHandle);
    el.toast.textContent = message;
    el.toast.classList.add('show');
    toastHandle = setTimeout(() => el.toast.classList.remove('show'), 2500);
  }
})();
