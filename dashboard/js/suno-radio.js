/* ============================================================
   SunoRadio — Floating music player widget for FPCS Dashboard
   Plays/simulates songs from Suno.com channels
   ============================================================ */

class SunoRadio {
  static STORAGE_KEY = 'suno-radio-state'
  static FAVORITES_KEY = 'suno-radio-favorites'

  static DEFAULT_CHANNEL = 'DanM'

  static DEFAULT_PLAYLIST = [
    { title: 'Digital Sunset',     duration: '3:24', seconds: 204, genre: 'Electronic/Ambient',  color: ['#f97316', '#7c3aed'] },
    { title: 'Code Runner',        duration: '2:58', seconds: 178, genre: 'Synthwave',           color: ['#06b6d4', '#3b82f6'] },
    { title: 'Midnight Protocol',  duration: '4:12', seconds: 252, genre: 'Dark Ambient',        color: ['#1e1b4b', '#6366f1'] },
    { title: 'Neural Networks',    duration: '3:45', seconds: 225, genre: 'Electronica',         color: ['#059669', '#34d399'] },
    { title: 'Binary Dreams',      duration: '3:01', seconds: 181, genre: 'Lo-fi',               color: ['#8b5cf6', '#c084fc'] },
    { title: 'Firewall Anthem',    duration: '2:33', seconds: 153, genre: 'Rock/Electronic',     color: ['#dc2626', '#f59e0b'] },
    { title: 'Data Stream',        duration: '4:07', seconds: 247, genre: 'Ambient',             color: ['#0284c7', '#22d3ee'] },
    { title: 'The Algorithm',      duration: '3:19', seconds: 199, genre: 'Synthwave',           color: ['#d946ef', '#f472b6'] },
  ]

  constructor(opts = {}) {
    this.channel = opts.channel || SunoRadio.DEFAULT_CHANNEL
    this.playlist = [...SunoRadio.DEFAULT_PLAYLIST]
    this.currentIndex = 0
    this.isPlaying = false
    this.isExpanded = false
    this.isShuffle = false
    this.volume = 80
    this.progress = 0
    this.elapsed = 0
    this.channelInputOpen = false
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.tickInterval = null
    this.el = null
    this._favorites = this._loadFavorites()
    this._restoreState()
  }

  /* -------- Public API -------- */

  init(container) {
    if (this.el) return this
    this._buildDOM()
    const target = container
      ? (typeof container === 'string' ? document.querySelector(container) : container)
      : document.body
    target.appendChild(this.el)
    this._bindEvents()
    this._render()
    if (this.isPlaying) this._startTick()
    return this
  }

  play() {
    this.isPlaying = true
    this._startTick()
    this._render()
    this._saveState()
  }

  pause() {
    this.isPlaying = false
    this._stopTick()
    this._render()
    this._saveState()
  }

  toggle() {
    this.isPlaying ? this.pause() : this.play()
  }

  next() {
    if (this.isShuffle) {
      let idx
      do { idx = Math.floor(Math.random() * this.playlist.length) } while (idx === this.currentIndex && this.playlist.length > 1)
      this.currentIndex = idx
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length
    }
    this.progress = 0
    this.elapsed = 0
    this._render()
    this._saveState()
  }

  prev() {
    if (this.elapsed > 3) {
      this.progress = 0
      this.elapsed = 0
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
      this.progress = 0
      this.elapsed = 0
    }
    this._render()
    this._saveState()
  }

  shuffle() {
    this.isShuffle = !this.isShuffle
    this._render()
    this._saveState()
  }

  setChannel(name) {
    this.channel = (name || '').replace(/^https?:\/\/(www\.)?suno\.com\/@?/, '').replace(/\/.*$/, '') || SunoRadio.DEFAULT_CHANNEL
    this._render()
    this._saveState()
  }

  seek(pct) {
    const track = this.playlist[this.currentIndex]
    this.progress = Math.max(0, Math.min(100, pct))
    this.elapsed = Math.round(track.seconds * this.progress / 100)
    this._render()
    this._saveState()
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(100, val))
    this._render()
    this._saveState()
  }

  expand() { this.isExpanded = true; this._render(); this._saveState() }
  collapse() { this.isExpanded = false; this._render(); this._saveState() }

  destroy() {
    this._stopTick()
    if (this.el) this.el.remove()
    this.el = null
  }

  get currentTrack() { return this.playlist[this.currentIndex] || null }

  /* -------- DOM Construction -------- */

  _buildDOM() {
    const root = document.createElement('div')
    root.className = 'suno-radio'
    root.setAttribute('role', 'region')
    root.setAttribute('aria-label', 'Suno Radio Player')

    root.innerHTML = `
      <div class="sr-drag-handle" title="Drag to reposition"></div>

      <!-- Minimized pill -->
      <div class="suno-radio-pill" role="button" tabindex="0" aria-label="Expand radio player">
        <span class="sr-icon">&#127925;</span>
        <div class="sr-title-scroll"><span></span></div>
        <button class="sr-playpause" aria-label="Play/Pause">&#9654;</button>
      </div>

      <!-- Expanded panel -->
      <div class="suno-radio-panel">

        <!-- Header -->
        <div class="sr-header">
          <div class="sr-header-left">
            <div class="sr-channel-avatar"></div>
            <div class="sr-channel-info">
              <div class="sr-channel-name"></div>
              <div class="sr-channel-sub">Suno Channel</div>
            </div>
          </div>
          <div class="sr-header-actions">
            <button class="sr-btn-channel" title="Change channel" aria-label="Change channel">&#128462;</button>
            <button class="sr-btn-minimize" title="Minimize" aria-label="Minimize player">&#8722;</button>
          </div>
        </div>

        <!-- Channel input -->
        <div class="sr-channel-input-wrap">
          <input type="text" class="sr-channel-input" placeholder="Enter Suno channel name or URL..." spellcheck="false" />
        </div>

        <!-- Now Playing -->
        <div class="sr-now-playing">
          <div class="sr-cover-art">
            <div class="sr-cover-gradient"></div>
          </div>
          <div class="sr-track-info">
            <div class="sr-track-title"></div>
            <div class="sr-track-genre"></div>
            <div class="sr-visualizer">
              <div class="bar"></div><div class="bar"></div><div class="bar"></div>
              <div class="bar"></div><div class="bar"></div><div class="bar"></div>
              <div class="bar"></div>
            </div>
          </div>
        </div>

        <!-- Progress -->
        <div class="sr-progress-wrap">
          <div class="sr-progress-bar"><div class="sr-progress-fill"></div></div>
        </div>
        <div class="sr-time-row">
          <span class="sr-time-current">0:00</span>
          <span class="sr-time-total">0:00</span>
        </div>

        <!-- Controls -->
        <div class="sr-controls">
          <button class="sr-shuffle" title="Shuffle" aria-label="Toggle shuffle">&#128256;</button>
          <button class="sr-prev" title="Previous" aria-label="Previous track">&#9198;</button>
          <button class="sr-main-play" aria-label="Play/Pause">&#9654;</button>
          <button class="sr-next" title="Next" aria-label="Next track">&#9197;</button>
          <button class="sr-open-tab" title="Open in Suno" aria-label="Open in Suno">&#128279;</button>
        </div>

        <!-- Volume -->
        <div class="sr-volume-wrap">
          <span class="sr-volume-icon">&#128266;</span>
          <input type="range" class="sr-volume-slider" min="0" max="100" value="80" aria-label="Volume" />
          <span class="sr-volume-pct">80%</span>
        </div>

        <!-- Playlist -->
        <div class="sr-playlist"></div>

        <!-- Footer -->
        <div class="sr-footer">
          <a class="sr-open-suno" href="#" target="_blank" rel="noopener noreferrer">
            &#127925; Open in Suno
          </a>
          <span class="sr-footer-brand">Suno Radio</span>
        </div>
      </div>
    `

    this.el = root
    this._cacheEls()
  }

  _cacheEls() {
    const q = (sel) => this.el.querySelector(sel)
    this.$ = {
      pill:           q('.suno-radio-pill'),
      pillTitle:      q('.suno-radio-pill .sr-title-scroll span'),
      pillPlay:       q('.suno-radio-pill .sr-playpause'),
      panel:          q('.suno-radio-panel'),
      channelAvatar:  q('.sr-channel-avatar'),
      channelName:    q('.sr-channel-name'),
      btnChannel:     q('.sr-btn-channel'),
      btnMinimize:    q('.sr-btn-minimize'),
      channelWrap:    q('.sr-channel-input-wrap'),
      channelInput:   q('.sr-channel-input'),
      coverGradient:  q('.sr-cover-gradient'),
      trackTitle:     q('.sr-track-title'),
      trackGenre:     q('.sr-track-genre'),
      visualizer:     q('.sr-visualizer'),
      progressBar:    q('.sr-progress-bar'),
      progressFill:   q('.sr-progress-fill'),
      timeCurrent:    q('.sr-time-current'),
      timeTotal:      q('.sr-time-total'),
      btnShuffle:     q('.sr-shuffle'),
      btnPrev:        q('.sr-prev'),
      btnMainPlay:    q('.sr-main-play'),
      btnNext:        q('.sr-next'),
      btnOpenTab:     q('.sr-open-tab'),
      volumeSlider:   q('.sr-volume-slider'),
      volumeIcon:     q('.sr-volume-icon'),
      volumePct:      q('.sr-volume-pct'),
      playlist:       q('.sr-playlist'),
      openSuno:       q('.sr-open-suno'),
      dragHandle:     q('.sr-drag-handle'),
    }
  }

  /* -------- Event Binding -------- */

  _bindEvents() {
    const { $, el } = this

    // Pill interactions
    $.pill.addEventListener('click', (e) => {
      if (e.target.closest('.sr-playpause')) return
      this.expand()
    })
    $.pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.expand() }
    })
    $.pillPlay.addEventListener('click', (e) => { e.stopPropagation(); this.toggle() })

    // Panel buttons
    $.btnMinimize.addEventListener('click', () => this.collapse())
    $.btnMainPlay.addEventListener('click', () => this.toggle())
    $.btnPrev.addEventListener('click', () => this.prev())
    $.btnNext.addEventListener('click', () => this.next())
    $.btnShuffle.addEventListener('click', () => this.shuffle())

    $.btnOpenTab.addEventListener('click', () => {
      window.open(`https://suno.com/@${encodeURIComponent(this.channel)}`, '_blank', 'noopener')
    })

    // Channel input
    $.btnChannel.addEventListener('click', () => {
      this.channelInputOpen = !this.channelInputOpen
      this._render()
      if (this.channelInputOpen) $.channelInput.focus()
    })
    $.channelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.setChannel($.channelInput.value.trim())
        this.channelInputOpen = false
        this._render()
      }
      if (e.key === 'Escape') {
        this.channelInputOpen = false
        this._render()
      }
    })

    // Progress bar seeking
    $.progressBar.addEventListener('click', (e) => {
      const rect = $.progressBar.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      this.seek(pct)
    })

    // Volume
    $.volumeSlider.addEventListener('input', (e) => {
      this.setVolume(Number(e.target.value))
    })
    $.volumeIcon.addEventListener('click', () => {
      if (this.volume > 0) {
        this._prevVolume = this.volume
        this.setVolume(0)
      } else {
        this.setVolume(this._prevVolume || 80)
      }
    })

    // Suno link
    $.openSuno.addEventListener('click', (e) => {
      e.preventDefault()
      window.open(`https://suno.com/@${encodeURIComponent(this.channel)}`, '_blank', 'noopener')
    })

    // Keyboard shortcuts (global when player is focused or anywhere on page)
    document.addEventListener('keydown', (e) => {
      // Only handle if no input/textarea is focused (except our channel input)
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (document.activeElement !== $.channelInput) return
        return
      }
      switch (e.key) {
        case ' ':
          e.preventDefault()
          this.toggle()
          break
        case 'ArrowRight':
          if (e.shiftKey) { this.next() } else { this.seek(this.progress + 5) }
          break
        case 'ArrowLeft':
          if (e.shiftKey) { this.prev() } else { this.seek(this.progress - 5) }
          break
        case 'ArrowUp':
          this.setVolume(this.volume + 5)
          break
        case 'ArrowDown':
          this.setVolume(this.volume - 5)
          break
        case 'm':
        case 'M':
          $.volumeIcon.click()
          break
      }
    })

    // Drag support
    this._bindDrag()
  }

  _bindDrag() {
    const handle = this.$.dragHandle
    const el = this.el

    const onStart = (e) => {
      this.isDragging = true
      const rect = el.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      this.dragOffset = { x: clientX - rect.left, y: clientY - rect.top }
      document.body.style.userSelect = 'none'
    }

    const onMove = (e) => {
      if (!this.isDragging) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const x = clientX - this.dragOffset.x
      const y = clientY - this.dragOffset.y
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      el.style.right = 'auto'
      el.style.bottom = 'auto'
    }

    const onEnd = () => {
      if (!this.isDragging) return
      this.isDragging = false
      document.body.style.userSelect = ''
      this._saveState()
    }

    handle.addEventListener('mousedown', onStart)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    handle.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
  }

  /* -------- Render -------- */

  _render() {
    if (!this.el) return
    const { $ } = this
    const track = this.currentTrack

    // Expanded/collapsed state
    this.el.classList.toggle('expanded', this.isExpanded)

    // Pill state
    $.pill.classList.toggle('playing', this.isPlaying)
    $.pillTitle.textContent = track ? track.title : 'No track'
    // Check if text overflows to enable scroll
    const scrollParent = $.pillTitle.parentElement
    if ($.pillTitle.scrollWidth > scrollParent.clientWidth) {
      $.pillTitle.textContent = track.title + '    ' + track.title + '    '
      $.pillTitle.classList.remove('no-scroll')
    } else {
      $.pillTitle.classList.add('no-scroll')
    }
    $.pillPlay.innerHTML = this.isPlaying ? '&#10074;&#10074;' : '&#9654;'

    // Channel
    $.channelAvatar.textContent = this.channel.charAt(0).toUpperCase()
    $.channelName.textContent = '@' + this.channel
    $.channelInput.value = this.channel
    $.channelWrap.classList.toggle('open', this.channelInputOpen)
    $.openSuno.href = `https://suno.com/@${encodeURIComponent(this.channel)}`

    // Track info
    if (track) {
      $.trackTitle.textContent = track.title
      $.trackGenre.textContent = track.genre
      $.coverGradient.style.background = `linear-gradient(135deg, ${track.color[0]}, ${track.color[1]})`
      $.timeTotal.textContent = track.duration
      $.timeCurrent.textContent = this._fmtTime(this.elapsed)
      $.progressFill.style.width = this.progress + '%'
    }

    // Visualizer
    $.visualizer.classList.toggle('active', this.isPlaying)

    // Main play button
    $.btnMainPlay.innerHTML = this.isPlaying ? '&#10074;&#10074;' : '&#9654;'

    // Shuffle indicator
    $.btnShuffle.classList.toggle('active', this.isShuffle)

    // Volume
    $.volumeSlider.value = this.volume
    $.volumePct.textContent = this.volume + '%'
    if (this.volume === 0) {
      $.volumeIcon.innerHTML = '&#128263;'
    } else if (this.volume < 50) {
      $.volumeIcon.innerHTML = '&#128265;'
    } else {
      $.volumeIcon.innerHTML = '&#128266;'
    }

    // Playlist
    this._renderPlaylist()
  }

  _renderPlaylist() {
    const { $ } = this
    $.playlist.innerHTML = ''
    this.playlist.forEach((track, i) => {
      const item = document.createElement('div')
      item.className = 'sr-playlist-item' + (i === this.currentIndex ? ' active' : '')
      item.innerHTML = `
        <span class="sr-pl-num">${i === this.currentIndex && this.isPlaying ? '&#9654;' : (i + 1)}</span>
        <div class="sr-pl-info">
          <div class="sr-pl-name">${this._esc(track.title)}</div>
          <div class="sr-pl-genre">${this._esc(track.genre)}</div>
        </div>
        <span class="sr-pl-dur">${track.duration}</span>
      `
      item.addEventListener('click', () => {
        this.currentIndex = i
        this.progress = 0
        this.elapsed = 0
        this.play()
      })
      $.playlist.appendChild(item)
    })
  }

  /* -------- Simulated Playback Timer -------- */

  _startTick() {
    this._stopTick()
    this.tickInterval = setInterval(() => {
      if (!this.isPlaying) return
      const track = this.currentTrack
      if (!track) return
      this.elapsed += 1
      this.progress = (this.elapsed / track.seconds) * 100
      if (this.elapsed >= track.seconds) {
        this.next()
        if (this.isPlaying) this._startTick()
        return
      }
      // Lightweight partial render (just progress/time)
      if (this.$) {
        this.$.progressFill.style.width = this.progress + '%'
        this.$.timeCurrent.textContent = this._fmtTime(this.elapsed)
      }
    }, 1000)
  }

  _stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  /* -------- Persistence -------- */

  _saveState() {
    const state = {
      channel: this.channel,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      isExpanded: this.isExpanded,
      isShuffle: this.isShuffle,
      volume: this.volume,
      progress: this.progress,
      elapsed: this.elapsed,
    }
    // Save position if dragged
    if (this.el && this.el.style.left) {
      state.pos = { left: this.el.style.left, top: this.el.style.top }
    }
    try { localStorage.setItem(SunoRadio.STORAGE_KEY, JSON.stringify(state)) } catch {}
  }

  _restoreState() {
    try {
      const raw = localStorage.getItem(SunoRadio.STORAGE_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.channel) this.channel = s.channel
      if (typeof s.currentIndex === 'number') this.currentIndex = Math.min(s.currentIndex, this.playlist.length - 1)
      if (typeof s.isPlaying === 'boolean') this.isPlaying = s.isPlaying
      if (typeof s.isExpanded === 'boolean') this.isExpanded = s.isExpanded
      if (typeof s.isShuffle === 'boolean') this.isShuffle = s.isShuffle
      if (typeof s.volume === 'number') this.volume = s.volume
      if (typeof s.progress === 'number') this.progress = s.progress
      if (typeof s.elapsed === 'number') this.elapsed = s.elapsed
      if (s.pos) this._pendingPos = s.pos
    } catch {}
  }

  _applyRestoredPosition() {
    if (this._pendingPos && this.el) {
      this.el.style.left = this._pendingPos.left
      this.el.style.top = this._pendingPos.top
      this.el.style.right = 'auto'
      this.el.style.bottom = 'auto'
      this._pendingPos = null
    }
  }

  _loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem(SunoRadio.FAVORITES_KEY)) || []
    } catch { return [] }
  }

  _saveFavorites() {
    try { localStorage.setItem(SunoRadio.FAVORITES_KEY, JSON.stringify(this._favorites)) } catch {}
  }

  addFavorite(channelName) {
    if (!this._favorites.includes(channelName)) {
      this._favorites.push(channelName)
      this._saveFavorites()
    }
  }

  removeFavorite(channelName) {
    this._favorites = this._favorites.filter(c => c !== channelName)
    this._saveFavorites()
  }

  get favorites() { return [...this._favorites] }

  /* -------- Helpers -------- */

  _fmtTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m + ':' + String(s).padStart(2, '0')
  }

  _esc(str) {
    const d = document.createElement('div')
    d.textContent = str
    return d.innerHTML
  }
}

/* -------- Auto-Init -------- */
// Instantiate and attach when the DOM is ready.
// Other scripts can access the instance via window.sunoRadio

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initSunoRadio)
} else {
  _initSunoRadio()
}

function _initSunoRadio() {
  if (window.sunoRadio) return
  const radio = new SunoRadio()
  radio.init()
  radio._applyRestoredPosition()
  window.sunoRadio = radio
}
