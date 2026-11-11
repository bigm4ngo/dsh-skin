/** Global stylesheet owned by the skin plugin. */

export const GLOBAL_STYLES = String.raw`
/* Background layer sits behind the app shell. */
#dsh-skin-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--dsh-skin-fallback, #0a0f16);
}

#dsh-skin-bg > .dsh-skin-media {
  position: absolute;
  inset: calc(var(--dsh-skin-blur, 0px) * -1.5);
  width: auto;
  height: auto;
  min-width: 100%;
  min-height: 100%;
  object-fit: var(--dsh-skin-fit, cover);
  object-position: var(--dsh-skin-position, center);
  filter: blur(var(--dsh-skin-blur, 0px));
}

#dsh-skin-bg > .dsh-skin-dimmer {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / var(--dsh-skin-dim, 0.4));
}

/* The app paints its own opaque background; make it transparent so the layer shows. */
body[data-dsh-skin='on'],
body[data-dsh-skin='on'] #root,
body[data-dsh-skin='on'] #root > * {
  background-color: transparent !important;
}

/*
 * The shell paints several surfaces from literals rather than the design
 * tokens (the sidebar column and the app frame), so token overrides alone
 * cannot reach them. These rules name the surfaces by their stable class
 * suffix, which survives the build-time hash prefix.
 */
body[data-dsh-skin='on'] [class*='sidebarCol'],
body[data-dsh-skin='on'] [class*='_frame'] {
  background-color: transparent !important;
}

body[data-dsh-skin='on'] [class*='_card'] {
  background-color: color-mix(
    in srgb,
    var(--dsh-skin-panel-tint, #0b1524) calc(var(--dsh-skin-panel-alpha, 0.72) * 100%),
    transparent
  ) !important;
}

/* Dialogs and menus carry text that must stay readable over any wallpaper:
   keep them nearly opaque regardless of the panel slider. */
body[data-dsh-skin='on'] [role='dialog'],
body[data-dsh-skin='on'] [role='menu'],
body[data-dsh-skin='on'] [role='listbox'] {
  background-color: color-mix(
    in srgb,
    var(--dsh-skin-panel-tint, #0b1524) 94%,
    transparent
  ) !important;
}

/* ---- branding ----
 * The mark seat keeps its box; the shell's own svg is hidden and the skin's
 * logo is painted into the same square, so layout is unchanged. */
body[data-dsh-skin='on'] [class*='railMark'] > svg,
body[data-dsh-skin='on'] [class*='brandMark'] > svg {
  display: none !important;
}

body[data-dsh-skin='on'] [class*='railMark']::before,
body[data-dsh-skin='on'] [class*='brandMark']::before {
  content: '';
  display: block;
  width: var(--dsh-skin-mark-size, 26px);
  height: var(--dsh-skin-mark-size, 26px);
  background-image: var(--dsh-skin-mark-url);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

/* The wordmark is an SVG, so hiding the text node is not enough: the svg is
   removed from the flow and the skin's name is painted as text instead. */
body[data-dsh-skin='on'] [class*='brandName'] svg {
  display: none !important;
}
body[data-dsh-skin='on'] [class*='brandName']::after {
  content: var(--dsh-skin-name, '');
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .04em;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}

/* ---- settings section ---- */
.dsh-skin-section {
  display: flex;
  max-width: 720px;
  flex-direction: column;
  gap: 18px;
  color: var(--dsw-alias-label-primary);
}
.dsh-skin-section h2 { margin: 0; font-size: 18px; font-weight: 600; }
.dsh-skin-section p { margin: 0; }
.dsh-skin-hint { color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.55; }
.dsh-skin-warn { color: var(--dsw-alias-state-warn-primary); font-size: 13px; }
.dsh-skin-row {
  display: grid;
  grid-template-columns: 170px 1fr 56px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.dsh-skin-row > label { color: var(--dsw-alias-label-secondary); }
.dsh-skin-row > output { text-align: right; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dsh-skin-row input[type='range'] { width: 100%; }
.dsh-skin-row select { width: 100%; }
`

/** Inject the stylesheet once per document. */
export function installStyles(): () => void {
  const id = 'dsh-skin-styles'
  if (document.getElementById(id) !== null) return () => {}
  const el = document.createElement('style')
  el.id = id
  el.textContent = GLOBAL_STYLES
  document.head.appendChild(el)
  return () => { el.remove() }
}
