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
    { type: 'audio', elementId: 'lofiAudio', label: 'Lo-Fi BGM' },
    { type: 'audio', elementId: 'midAudio', label: 'こふねゐボイス' }
  ];

  const backgrounds = {
    evening: { name: '甲府の夕暮れ', src: 'assets/kofu-evening.webp' },
    radio: { name: '深夜のゲームラジオ', src: 'assets/kofu-midnight-radio.webp' },
    rain: { name: '雨のゲーム部屋', src: 'assets/kofu-rain-room.webp' },
    morning: { name: 'ぶどう畑の朝', src: 'assets/kofu-vineyard-morning.webp' }
  };

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
    loadingStart: $('#loadingStart'), loadingRetry: $('#loadingRetry')
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

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showToast('このブラウザでは全画面表示を利用できません');
    }
  }

  function handleKeyboard(event) {
    if (event.target.matches('input,textarea,button')) return;
    if (event.code === 'Space') { event.preventDefault(); toggleWork(); }
    if (event.key.toLowerCase() === 'm') toggleMusic();
    if (event.key === 'Escape') closeDrawers();
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
    input.style.setProperty('--range', `${input.value}%`);
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
