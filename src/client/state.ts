/**
 * Skin runtime: loads the skin library from the host half, applies the chosen
 * skin to the document, and owns the small set of live preferences.
 *
 * Everything here is presentation only: no model traffic, no host writes.
 */

export interface SkinManifest {
  name: string
  author?: string
  description?: string
  version?: number
  background?: {
    file?: string
    fit?: 'cover' | 'contain' | 'fill' | 'repeat'
    position?: string
    dim?: number
    blur?: number
    video?: { loop?: boolean; muted?: boolean; playbackRate?: number }
  }
  audio?: {
    enabled?: boolean
    file?: string
    volume?: number
    fadeMs?: number
    muteWhenUnfocused?: boolean
  }
  branding?: {
    mark?: string
    markSize?: number
    /** Hide the shell's product mark even when `mark` is absent. */
    hideMark?: boolean
    /** Single-colour artwork replacing the running "deep diving" whale glyph. */
    deepDivingMark?: string
    name?: string
    hideName?: boolean
  }
  ui?: { panelOpacity?: number; panelBlur?: number; radius?: number; font?: string; codeFont?: string }
  colors?: { dark?: Record<string, string>; light?: Record<string, string> }
}

export interface SkinEntry {
  id: string
  manifest: SkinManifest
  error?: string | null
  warnings?: string[]
}

export interface Prefs {
  skinId: string | null
  /** Skin ids the user pinned, in the order they were pinned. */
  favourites: string[]
  dim: number
  panelOpacity: number
  panelBlur: number
  radius: number
  audioVolume: number
  audioMuted: boolean
}

export interface Snapshot {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  skins: SkinEntry[]
  prefs: Prefs
}

const ROUTE = '/dsh-skin'
const STORAGE_KEY = 'dsh-skin:prefs'
const LAYERS = ['bg-layer-1', 'bg-layer-2', 'bg-layer-3', 'bg-layer-4'] as const

function defaults(): Prefs {
  return {
    skinId: null,
    favourites: [],
    dim: 0.4,
    panelOpacity: 0.78,
    panelBlur: 0,
    radius: 12,
    audioVolume: 0.3,
    audioMuted: false,
  }
}

/**
 * Keep only non-empty string ids, in order, without duplicates. Stored prefs
 * come from localStorage and may predate this field or have been edited by
 * hand, so the shape is checked instead of trusted.
 */
function normalizeFavourites(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item === '' || seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaults()
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return { ...defaults(), ...parsed, favourites: normalizeFavourites(parsed.favourites) }
  } catch {
    return defaults()
  }
}

/**
 * The shell publishes its theme in two places:
 *
 * - `<html data-ds-theme-source="light|dark|system">` is the user's *chosen*
 *   preference. A fixed built-in theme (or a registered theme id, published as
 *   its resolved scheme) appears as `light`/`dark`; `system` is used only when
 *   nothing fixed is selected.
 * - `<body data-ds-dark-theme>` is the *resolved* palette the token sheet is
 *   currently painting.
 *
 * Only the `system` preference may defer to the operating system. Reading the
 * OS preference first, as this used to, picked the dark skin whenever the OS
 * preferred dark even though DSH was explicitly in light mode.
 */
function themeSource(): 'light' | 'dark' | 'system' | null {
  const source = document.documentElement.getAttribute('data-ds-theme-source')
  return source === 'light' || source === 'dark' || source === 'system' ? source : null
}

function isDark(): boolean {
  const root = document.documentElement
  const body = document.body
  // The resolved palette is authoritative whenever the shell has published it.
  if (body.hasAttribute('data-ds-dark-theme') || root.hasAttribute('data-ds-dark-theme')) return true

  const source = themeSource()
  if (source === 'light') return false
  if (source === 'dark') return true

  // `system` (or a pre-theme-presenter shell that published no source) is the
  // only case where the operating-system preference decides.
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Turn a token name from a skin into the custom property the shell reads.
 *
 * Most tokens live in the `alias` namespace, so `bg-layer-1` is shorthand for
 * `--dsw-alias-bg-layer-1`. The shell also paints a few surfaces from tokens
 * outside it — `specific-bubble` (the message bubble), `specific-menu`,
 * `specific-input-major`, `radius-*`, `font-*` — so a name that already carries
 * its namespace is passed through instead of being double-prefixed.
 */
function tokenCssName(token: string): string {
  const namespaced = /^(alias|specific|static|radius|font|elevation|focus|mask|menu|hovercard|toast|tooltip)-/
  return namespaced.test(token) ? `--dsw-${token}` : `--dsw-alias-${token}`
}

/**
 * A colour the skin chose for the active mode, under either the short token
 * name (`state-business-primary`) or its namespace-qualified form
 * (`alias-state-business-primary`). `undefined` means the skin did not set it.
 */
function skinColour(colours: Record<string, string>, token: string): string | undefined {
  return colours[token] ?? colours[`alias-${token}`]
}

/** Resolve any CSS colour to rgb components by letting the browser parse it. */
function resolveColor(value: string): [number, number, number] | null {
  const probe = document.createElement('span')
  probe.style.color = value
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  const match = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed)
  if (match === null) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string): number | null {
  const left = resolveColor(a)
  const right = resolveColor(b)
  if (left === null || right === null) return null
  const [hi, lo] = [luminance(left), luminance(right)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Surfaces the shell pairs with a text colour. A skin that sets one half of a
 * pair and not the other — a white button over white ink — is unreadable, and
 * that is not something a designer should have to discover by looking.
 */
const CONTRAST_PAIRS: Array<[surface: string, text: string]> = [
  ['alias-bg-base', 'alias-label-primary'],
  ['alias-bg-layer-1', 'alias-label-primary'],
  ['alias-bg-layer-2', 'alias-label-primary'],
  ['alias-bg-layer-3', 'alias-label-primary'],
  ['specific-bubble', 'alias-label-primary'],
  ['specific-menu', 'alias-label-secondary'],
  ['specific-input-major', 'alias-label-primary'],
  ['alias-button-primary-fill', 'alias-label-primary-foreground'],
  // The New Session button and the composer's "+" are painted from these
  // tokens but labelled from the general text token rather than a dedicated
  // foreground, so they need the same guard as the primary button.
  ['alias-button-elevated-fill', 'alias-label-primary'],
  ['alias-button-floating-hover', 'alias-label-primary'],
  ['specific-selector', 'alias-label-primary'],
]

/** Minimum contrast below which the guard re-colours the text token. */
const MIN_CONTRAST = 3

export class SkinController {
  private snapshot: Snapshot = { status: 'idle', error: null, skins: [], prefs: readPrefs() }
  private listeners = new Set<() => void>()
  private bg: HTMLDivElement | null = null
  /** Identity of the mounted background (skin id + file); lets apply() keep it. */
  private bgKey: string | null = null
  private video: HTMLVideoElement | null = null
  private audio: HTMLAudioElement | null = null
  private appliedVars: string[] = []
  private scopeVars: Array<[HTMLElement, string]> = []
  private baseLayerColors = new Map<string, string>()
  private mediaUrl: string | null = null
  private disposers: Array<() => void> = []

  getSnapshot = (): Snapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private emit(next: Partial<Snapshot>): void {
    this.snapshot = { ...this.snapshot, ...next }
    for (const listener of this.listeners) listener()
  }

  async initialize(): Promise<void> {
    this.emit({ status: 'loading', error: null })
    try {
      const response = await fetch(`${ROUTE}/index.json`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(`skin library responded ${response.status}`)
      const skins = (await response.json()) as SkinEntry[]
      // A favourite whose folder was removed is dropped, but a library that
      // failed to load never prunes anything (that branch is above).
      const known = new Set(skins.map((skin) => skin.id))
      const favourites = this.snapshot.prefs.favourites.filter((id) => known.has(id))
      if (favourites.length !== this.snapshot.prefs.favourites.length) {
        this.setPrefs({ favourites }, { reapply: false })
      }
      this.emit({ status: 'ready', skins, error: null })
      try {
        this.apply()
      } catch (error) {
        // A broken skin must not take the page down with it.
        this.emit({ status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
      this.watchTheme()
    } catch (error) {
      this.emit({ status: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  }

  /**
   * Re-apply when the shell flips between light and dark.
   *
   * The theme presenter writes the resolved palette to `<body>` and the
   * preference to `<html>`, and a flip can change either one, so both are
   * observed. The operating-system listener is only relevant while DSH has no
   * fixed preference; firing it in explicit light/dark mode would needlessly
   * tear down and remount the background (restarting video and audio).
   */
  private watchTheme(): void {
    const observer = new MutationObserver(() => { this.apply() })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-ds-dark-theme'],
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-ds-theme-source', 'data-ds-dark-theme', 'class'],
    })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => {
      const source = themeSource()
      if (source === 'light' || source === 'dark') return
      this.apply()
    }
    mq.addEventListener('change', onChange)
    this.disposers.push(() => { observer.disconnect(); mq.removeEventListener('change', onChange) })
  }

  private active(custom = this.snapshot.prefs): SkinEntry | null {
    if (custom.skinId === null) return null
    return this.snapshot.skins.find((skin) => skin.id === custom.skinId) ?? null
  }

  /**
   * Persist one preference patch and, unless it cannot affect the rendered
   * skin, re-apply it. Favourite changes pass `reapply: false`: pinning a skin
   * must not tear down and remount the current background (which restarts
   * video and audio).
   */
  setPrefs(patch: Partial<Prefs>, options: { reapply?: boolean } = {}): void {
    const prefs = { ...this.snapshot.prefs, ...patch }
    if (patch.favourites !== undefined) prefs.favourites = normalizeFavourites(patch.favourites)
    this.emit({ prefs })
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
    if (options.reapply !== false) this.apply()
  }

  /** Pin or unpin one skin without changing which skin is active. */
  toggleFavourite(id: string): void {
    const favourites = this.snapshot.prefs.favourites
    const next = favourites.includes(id)
      ? favourites.filter((entry) => entry !== id)
      : [...favourites, id]
    this.setPrefs({ favourites: next }, { reapply: false })
  }

  /** Effective values: skin manifest, overridden by the user's sliders. */
  effective(manifest: SkinManifest, prefs: Prefs): Required<Pick<Prefs, 'dim' | 'panelOpacity' | 'panelBlur' | 'radius'>> {
    return {
      dim: prefs.dim,
      panelOpacity: prefs.panelOpacity,
      panelBlur: prefs.panelBlur,
      radius: prefs.radius,
    }
  }

  private clearVars(): void {
    for (const name of this.appliedVars) document.documentElement.style.removeProperty(name)
    this.appliedVars = []
    for (const [scope, name] of this.scopeVars) scope.style.removeProperty(name)
    this.scopeVars = []
  }

  private setVar(name: string, value: string): void {
    document.documentElement.style.setProperty(name, value)
    this.appliedVars.push(name)
  }

  apply(): void {
    const prefs = this.snapshot.prefs
    const entry = this.active()
    this.clearVars()

    if (entry === null || (entry.error !== undefined && entry.error !== null)) {
      this.teardownBackground()
      document.body.dataset.dshSkin = 'off'
      delete document.body.dataset.dshSkinMark
      delete document.body.dataset.dshSkinRunning
      return
    }

    const manifest = entry.manifest
    const mode = isDark() ? 'dark' : 'light'
    const background = manifest.background ?? {}
    const ui = manifest.ui ?? {}

    // ---- background ----
    const fit = background.fit ?? 'cover'
    const position = background.position ?? 'center'
    this.setVar('--dsh-skin-fit', fit === 'repeat' ? 'auto' : fit)
    this.setVar('--dsh-skin-position', position)
    this.setVar('--dsh-skin-blur', `${prefs.panelBlur === 0 ? (background.blur ?? 0) : (background.blur ?? 0)}px`)
    this.setVar('--dsh-skin-dim', String(prefs.dim))

    // Preferences re-run apply(); only a different skin/file may remount the
    // background, because replacing the <video> would restart playback from
    // zero. Same background: update its element in place.
    const backgroundFile = background.file !== undefined && background.file !== '' ? background.file : null
    if (backgroundFile === null) {
      this.teardownBackground()
    } else if (this.bgKey !== `${entry.id}:${backgroundFile}`) {
      this.teardownBackground()
      this.mountBackground(entry.id, backgroundFile, background)
    } else {
      this.syncBackground(background)
    }
    document.body.dataset.dshSkin = 'on'

    // ---- token colours ----
    // The design tokens are declared on a scoped theme element, not on :root,
    // so an override must land on that same element (inline wins over the
    // class rule). Otherwise a descendant keeps inheriting the original value.
    const scopes = this.tokenScopes()
    const computed = getComputedStyle(scopes[0] ?? document.body)
    const colours = manifest.colors?.[mode] ?? {}
    const alpha = Math.round(prefs.panelOpacity * 100)

    for (const scope of scopes) {
      for (const [token, value] of Object.entries(colours)) {
        this.setScopeVar(scope, tokenCssName(token), value)
      }
      // Every surface token gets the transparency treatment, not just
      // bg-layer-1..4: the shell paints sidebars and rails from bg-base and
      // bg-module-platform too, and those would otherwise stay opaque.
      const scopeStyle = getComputedStyle(scope)
      const surfaceTokens: string[] = []
      for (const prop of scopeStyle) {
        if (!prop.startsWith('--dsw-alias-bg-')) continue
        if (prop === '--dsw-alias-bg-skeleton') continue
        surfaceTokens.push(prop)
      }
      for (const prop of surfaceTokens) {
        const key = `${prop}:${mode}`
        const base = this.baseLayerColors.get(key) ?? scopeStyle.getPropertyValue(prop).trim()
        if (base === '' || base === 'transparent' || base.startsWith('color-mix(')) continue
        this.baseLayerColors.set(key, base)
        this.setScopeVar(scope, prop, `color-mix(in srgb, ${base} ${alpha}%, transparent)`)
      }
    }

    // ---- accent-driven controls ----
    // DSH paints the active tab, the active workspace glyph, the composer's
    // send button and the running-status line from fixed brand tokens that are
    // separate from `brand-primary`. A skin that names an accent should own
    // those controls too: derive each token from `brand-primary` unless the
    // skin set that specific token itself.
    const accent = skinColour(colours, 'brand-primary')
    if (accent !== undefined) {
      const derived: Array<[property: string, token: string, value: string]> = [
        ['--dsw-alias-state-business-primary', 'state-business-primary', accent],
        ['--dsw-alias-button-info-fill', 'button-info-fill', accent],
        ['--dsw-alias-button-info-hover', 'button-info-hover',
          `color-mix(in srgb, ${accent} 84%, ${mode === 'dark' ? '#ffffff' : '#000000'})`],
        ['--dsw-alias-label-deep-diving', 'label-deep-diving', accent],
        ['--dsw-alias-label-deep-diving-shimmer', 'label-deep-diving-shimmer',
          `color-mix(in srgb, ${accent} 45%, transparent)`],
      ]
      for (const scope of scopes) {
        for (const [property, token, value] of derived) {
          if (skinColour(colours, token) !== undefined) continue
          this.setScopeVar(scope, property, value)
        }
      }
    }

    // The send glyph is painted from a literal `#fff`, so expose a readable
    // foreground for the fill the skin ended up with.
    const sendFill = skinColour(colours, 'button-info-fill') ?? accent
    if (sendFill !== undefined) {
      const onWhite = contrast(sendFill, '#ffffff')
      this.setVar('--dsh-skin-send-foreground', onWhite !== null && onWhite >= MIN_CONTRAST ? '#ffffff' : '#0a0a0a')
    }

    // ---- radii ----
    const radius = prefs.radius
    for (const token of ['radius-xs', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-panel']) {
      this.setVar(`--dsw-${token}`, `${radius}px`)
    }

    // Variables for the shell surfaces that are painted from literals rather
    // than tokens; the stylesheet consumes these.
    const tint = colours['bg-layer-1'] ?? (mode === 'dark' ? '#0b1524' : '#ffffff')
    this.setVar('--dsh-skin-panel-tint', tint)
    this.setVar('--dsh-skin-panel-alpha', String(prefs.panelOpacity))

    // ---- fonts ----
    if (ui.font !== undefined && ui.font !== '') this.setVar('--dsw-font-family', ui.font)
    if (ui.codeFont !== undefined && ui.codeFont !== '') {
      this.setVar('--dsw-font-markdown-code-font-family', ui.codeFont)
    }

    // ---- branding ----
    // The sidebar brand slots are owner-declared and do not accept an
    // out-of-tree occupant here, so branding is applied to the existing seat:
    // the shell's own mark is hidden and the skin's logo is painted in the
    // same box, sized by the manifest. `hideMark` removes the product mark even
    // when the skin has no logo of its own.
    const branding = manifest.branding
    const markFile = branding?.mark !== undefined && branding.mark !== '' ? branding.mark : null
    if (markFile !== null) {
      const url = `${ROUTE}/${encodeURIComponent(entry.id)}/${markFile.split('/').map(encodeURIComponent).join('/')}`
      this.setVar('--dsh-skin-mark-url', `url("${url}")`)
      this.setVar('--dsh-skin-mark-size', `${branding?.markSize ?? 26}px`)
      document.body.dataset.dshSkinMark = 'skin'
    } else if (branding?.hideMark === true) {
      document.body.dataset.dshSkinMark = 'hidden'
    } else {
      delete document.body.dataset.dshSkinMark
    }
    const runningFile = branding?.deepDivingMark !== undefined && branding.deepDivingMark !== '' ? branding.deepDivingMark : null
    if (runningFile !== null) {
      const url = `${ROUTE}/${encodeURIComponent(entry.id)}/${runningFile.split('/').map(encodeURIComponent).join('/')}`
      this.setVar('--dsh-skin-running-url', `url("${url}")`)
      document.body.dataset.dshSkinRunning = 'on'
    } else {
      delete document.body.dataset.dshSkinRunning
    }
    if (branding?.name !== undefined && branding.name !== '') {
      this.setVar('--dsh-skin-name', `"${branding.name.replace(/"/g, '\\"')}"`)
    }

    // ---- audio ----
    this.syncAudio(entry, prefs)

    // ---- contrast guard ----
    this.enforceContrast(scopes, colours)

    // ---- chrome backdrop ----
    // The shell's outer containers paint their own background. Class names are
    // build-hashed and change between releases, so instead of naming them we
    // walk up from the sidebar and clear every ancestor that paints a colour:
    // those are chrome, never content cards.
    this.clearChromeBackdrop()
  }

  /**
   * Make the shell's own containers transparent so the background layer shows.
   * Only ancestors of the sidebar are touched, so panels and cards keep their
   * translucent treatment.
   */
  private clearChromeBackdrop(): void {
    const vw = window.innerWidth * window.innerHeight
    const candidates = document.querySelectorAll<HTMLElement>('#root, #root > *, #root > * > *, body > div')
    const vh = window.innerHeight
    for (const node of candidates) {
      const rect = node.getBoundingClientRect()
      // Only chrome is cleared: a full-window container, or a tall narrow rail.
      // The width cap matters — a full-height *content* column must keep its
      // surface, or text ends up sitting directly on the wallpaper.
      const fullWindow = rect.width * rect.height >= vw * 0.8
      const fullColumn = rect.height >= vh * 0.9 && rect.width <= window.innerWidth * 0.4
      if (!fullWindow && !fullColumn) continue
      const bg = getComputedStyle(node).backgroundColor
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue
      node.style.setProperty('background-color', 'transparent', 'important')
      this.scopeVars.push([node, 'background-color'])
    }
  }

  /**
   * Keep text legible on the surfaces a skin re-colours. If a pair falls below
   * MIN_CONTRAST, the text token is re-coloured to black or white — whichever
   * reads better on that surface — and the skin's own value is overridden only
   * for that token.
   */
  private enforceContrast(scopes: HTMLElement[], colours: Record<string, string>): void {
    const probe = scopes[0] ?? document.body
    const style = getComputedStyle(probe)
    for (const [surface, text] of CONTRAST_PAIRS) {
      const surfaceValue = style.getPropertyValue(`--dsw-${surface}`).trim()
      const textValue = style.getPropertyValue(`--dsw-${text}`).trim()
      if (surfaceValue === '' || textValue === '') continue
      const ratio = contrast(surfaceValue, textValue)
      if (ratio === null || ratio >= MIN_CONTRAST) continue
      const surfaceRgb = resolveColor(surfaceValue)
      if (surfaceRgb === null) continue
      const replacement = luminance(surfaceRgb) > 0.45 ? '#0a0a0a' : '#ffffff'
      const better = contrast(surfaceValue, replacement) ?? 0
      if (better <= ratio) continue
      for (const scope of scopes) this.setScopeVar(scope, `--dsw-${text}`, replacement)
      // A skin that set the text token explicitly is told, rather than silently
      // corrected, so the fix can be made at the source.
      const key = text.replace(/^alias-/, '')
      if (colours[key] !== undefined) {
        console.warn(`dsh-skin: "${key}" had ${ratio.toFixed(1)}:1 on --dsw-${surface}; using ${replacement}`)
      }
    }
  }

  /**
   * Elements that declare the design tokens: walk up from a themed surface and
   * keep every ancestor whose token value differs from its parent's.
   */
  private tokenScopes(): HTMLElement[] {
    const token = '--dsw-alias-bg-layer-1'
    const sample = (document.querySelector('[class*=sidebar]') as HTMLElement | null) ?? document.body
    const scopes: HTMLElement[] = []
    let node: HTMLElement | null = sample
    let childValue = getComputedStyle(sample).getPropertyValue(token).trim()
    while (node !== null) {
      const parent: HTMLElement | null = node.parentElement
      if (parent === null) break
      const parentValue = getComputedStyle(parent).getPropertyValue(token).trim()
      if (parentValue !== childValue) scopes.push(node)
      childValue = parentValue
      node = parent
    }
    if (scopes.length === 0) scopes.push(document.body)
    return scopes
  }

  private setScopeVar(scope: HTMLElement, name: string, value: string): void {
    scope.style.setProperty(name, value)
    this.scopeVars.push([scope, name])
  }

  private mountBackground(id: string, file: string, background: NonNullable<SkinManifest['background']>): void {
    const layer = document.createElement('div')
    layer.id = 'dsh-skin-bg'
    const url = `${ROUTE}/${encodeURIComponent(id)}/${file.split('/').map(encodeURIComponent).join('/')}`
    const isVideo = /\.(mp4|webm)$/i.test(file)

    if (isVideo) {
      const video = document.createElement('video')
      video.className = 'dsh-skin-media'
      video.src = url
      video.loop = background.video?.loop ?? true
      video.muted = this.snapshot.prefs.audioMuted || (background.video?.muted ?? true)
      video.autoplay = true
      video.playsInline = true
      video.preload = 'auto'
      video.playbackRate = background.video?.playbackRate ?? 1
      layer.appendChild(video)
      this.video = video
      void video.play().catch(() => { /* autoplay refused; frame still shows */ })
    } else {
      // A replaced <img> with inset/auto sizing does not paint reliably inside
      // this shell's stacking context; a CSS background on the layer does.
      layer.style.backgroundImage = `url("${url}")`
      layer.style.backgroundSize = background.fit === 'repeat' ? 'auto' : (background.fit ?? 'cover')
      layer.style.backgroundRepeat = background.fit === 'repeat' ? 'repeat' : 'no-repeat'
      layer.style.backgroundPosition = background.position ?? 'center'
    }

    const dimmer = document.createElement('div')
    dimmer.className = 'dsh-skin-dimmer'
    layer.appendChild(dimmer)
    document.body.insertBefore(layer, document.body.firstChild)
    this.bg = layer
    this.bgKey = `${id}:${file}`
    this.mediaUrl = url
  }

  /**
   * Keep an already-mounted background alive across preference/theme changes.
   * Dim, blur, opacity and radius are CSS variables, so the element and its
   * playback position must survive; only manifest-owned player settings are
   * re-applied.
   */
  private syncBackground(background: NonNullable<SkinManifest['background']>): void {
    if (this.video !== null) {
      this.video.loop = background.video?.loop ?? true
      this.video.playbackRate = background.video?.playbackRate ?? 1
      return
    }
    const layer = this.bg
    if (layer === null) return
    layer.style.backgroundSize = background.fit === 'repeat' ? 'auto' : (background.fit ?? 'cover')
    layer.style.backgroundRepeat = background.fit === 'repeat' ? 'repeat' : 'no-repeat'
    layer.style.backgroundPosition = background.position ?? 'center'
  }

  private teardownBackground(): void {
    if (this.video !== null) { this.video.pause(); this.video.src = '' }
    this.video = null
    this.bg?.remove()
    this.bg = null
    this.bgKey = null
  }

  private syncAudio(entry: SkinEntry, prefs: Prefs): void {
    const audio = entry.manifest.audio
    const wants = audio?.enabled === true && prefs.audioMuted === false
    if (audio === undefined || wants === false) { this.stopAudio(); return }
    const file = audio.file === '@video' ? undefined : audio.file
    if (file === undefined) {
      // Use the background video's own track.
      if (this.video !== null) {
        this.video.muted = false
        this.video.volume = prefs.audioVolume
      }
      return
    }
    const url = `${ROUTE}/${encodeURIComponent(entry.id)}/${file.split('/').map(encodeURIComponent).join('/')}`
    if (this.audio === null || this.audio.src !== new URL(url, location.href).href) {
      this.stopAudio()
      const el = new Audio(url)
      el.loop = true
      this.audio = el
    }
    this.audio.volume = prefs.audioVolume
    void this.audio.play().catch(() => { /* needs a user gesture */ })
  }

  private stopAudio(): void {
    if (this.audio !== null) { this.audio.pause(); this.audio = null }
    if (this.video !== null) this.video.muted = true
  }

  dispose(): void {
    this.teardownBackground()
    this.stopAudio()
    this.clearVars()
    document.body.dataset.dshSkin = 'off'
    for (const off of this.disposers) off()
    this.disposers = []
  }
}
