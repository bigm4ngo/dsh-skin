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
body[data-dsh-skin='on'] [class*='_frame'] {
  background-color: transparent !important;
}

/* The sidebar is a content surface, not a window edge: give it the same
   translucent tint as cards so the wallpaper reads through it and the rail
   stops looking like a flat painted slab. */
body[data-dsh-skin='on'] [class*='sidebarCol'] {
  background-color: color-mix(
    in srgb,
    var(--dsh-skin-panel-tint, #0b1524) calc(var(--dsh-skin-panel-alpha, 0.72) * 100%),
    transparent
  ) !important;
}

/* The sidebar column's own wrapper paints an opaque literal; a column is
   chrome, never a card. */
body[data-dsh-skin='on'] [class*='sidebarCol'] [class*='_root'] {
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
 * The mark seat keeps its box; the shell's own mark is hidden and the skin's
 * logo is painted into the same square, so layout is unchanged. The shell may
 * nest its mark inside a build-version wrapper, so hide any descendant rather
 * than only a direct child. hideMark removes the shell mark without a
 * replacement logo. */
body[data-dsh-skin-mark='skin'] [class*='railMark'] svg,
body[data-dsh-skin-mark='skin'] [class*='brandMark'] svg,
body[data-dsh-skin-mark='hidden'] [class*='railMark'] svg,
body[data-dsh-skin-mark='hidden'] [class*='brandMark'] svg {
  display: none !important;
}

/* A background-image cannot inherit currentColor, so the mark is painted as
   a mask instead: the artwork's alpha channel is kept and the fill is the
   sidebar's own text colour, which matches the wordmark in both themes. */
body[data-dsh-skin-mark='skin'] [class*='railMark']::before,
body[data-dsh-skin-mark='skin'] [class*='brandMark']::before {
  content: '';
  display: block;
  width: var(--dsh-skin-mark-size, 26px);
  height: var(--dsh-skin-mark-size, 26px);
  background-color: var(--dsw-alias-label-primary);
  -webkit-mask-image: var(--dsh-skin-mark-url);
  mask-image: var(--dsh-skin-mark-url);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
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

/* ---- accent-driven controls ----
 * The composer's send button paints its glyph from a literal #fff; the skin
 * sets a computed foreground for the accent fill it ends up with. The running
 * "deep diving" line uses a fixed whale glyph that a skin can replace with its
 * own single-colour mark. */
body[data-dsh-skin='on'] [class*='_trailing'] > button[class*='_primary'] {
  color: var(--dsh-skin-send-foreground, #fff) !important;
}
body[data-dsh-skin-running='on'] [class*='_runningIcon'] > * {
  display: none !important;
}
body[data-dsh-skin-running='on'] [class*='_runningIcon']::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: var(--dsw-alias-label-deep-diving, currentColor);
  -webkit-mask-image: var(--dsh-skin-running-url);
  mask-image: var(--dsh-skin-running-url);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
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

/* ---- skin favourites ----
 * The select groups pinned skins first; the star toggles the active one and
 * the chip row makes pinned skins reachable without opening the dropdown. */
.dsh-skin-picker { display: flex; min-width: 0; align-items: center; gap: 8px; }
.dsh-skin-picker select { flex: 1; min-width: 0; }
.dsh-skin-star {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-button-elevated-fill);
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.dsh-skin-star:hover:not(:disabled) { background: var(--dsw-alias-button-floating-hover); }
.dsh-skin-star[aria-pressed='true'] { color: var(--dsw-alias-state-warn-primary); }
.dsh-skin-star:disabled { opacity: .5; cursor: default; }
.dsh-skin-star:focus-visible,
.dsh-skin-chip-select:focus-visible,
.dsh-skin-chip-remove:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.dsh-skin-favourites {
  display: grid;
  grid-template-columns: 170px 1fr;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.dsh-skin-favourites-label { color: var(--dsw-alias-label-secondary); }
.dsh-skin-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-skin-chip {
  display: inline-flex;
  overflow: hidden;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: 999px;
  background: var(--dsw-alias-button-elevated-fill);
  color: var(--dsw-alias-label-primary);
}
.dsh-skin-chip-select {
  max-width: 200px;
  overflow: hidden;
  padding: 3px 4px 3px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}
.dsh-skin-chip-select:hover { background: var(--dsw-alias-button-floating-hover); }
.dsh-skin-chip-select[aria-pressed='true'] { font-weight: 600; }
.dsh-skin-chip-remove {
  padding: 3px 8px;
  border: 0;
  border-left: .5px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh-skin-chip-remove:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-skin-chip-add {
  padding: 3px 8px;
  border: 0;
  border-left: .5px solid var(--dsw-alias-border-l3);
  background: transparent;
  color: var(--dsw-alias-state-business-primary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.dsh-skin-chip-add:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-skin-chip-add:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.dsh-skin-chip-shortcut { background: var(--dsw-alias-bg-layer-3); }
.dsh-skin-actions { grid-template-columns: 170px auto 1fr; }
.dsh-skin-action {
  padding: 5px 12px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--dsw-alias-button-elevated-fill);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.dsh-skin-action:hover { background: var(--dsw-alias-button-floating-hover); }
.dsh-skin-action:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.dsh-skin-status { overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }

/* ---- settings shortcut ----
 * A subtle tab on the right edge that opens Settings -> Skins. */
#dsh-skin-settings-fab {
  position: fixed;
  right: 0;
  top: 46%;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 54px;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l3);
  border-right: 0;
  border-radius: 9px 0 0 9px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent);
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: .35;
  transition: opacity .12s ease, color .12s ease;
}
#dsh-skin-settings-fab:hover,
#dsh-skin-settings-fab:focus-visible {
  color: var(--dsw-alias-label-primary);
  opacity: .95;
}
#dsh-skin-settings-fab:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) { #dsh-skin-settings-fab { transition: none; } }
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
