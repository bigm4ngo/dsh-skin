# DSH Skin Format — v1

**What this is:** the file format for a DSH theme/skin. A skin is a folder. Drop the folder in,
pick it in Settings → Appearance, and the harness changes — background (image or video), colours,
panel translucency, typography, logo and product name.

**Who this is for:** the person or agent *making* skins. You do not need to touch code, and you do
not need to know how the harness works. Follow the folder layout and the field rules below.

**One rule above all:** a skin is **data + media**. No scripts, no CSS files, no HTML. Anything the
format does not list is ignored rather than executed — deliberately, because a skin runs inside a
logged-in session.

---

## 1. Folder layout

```
my-skin/
├── skin.json              required — the manifest
├── logo.svg               optional — brand mark (SVG preferred)
├── logo.png               optional — brand mark fallback
├── background.jpg         optional — still background
├── background.mp4         optional — video background (muted by default)
└── ambient.mp3            optional — looping ambient audio
```

File names in `skin.json` are relative to the skin folder. Any name works as long as the manifest
matches; the names above are the defaults when a field is omitted.

---

## 2. `skin.json` — full reference

```json
{
  "name": "Night Harbour",
  "author": "your name",
  "version": 1,
  "description": "One line shown under the name in the picker.",

  "background": {
    "file": "background.mp4",
    "fit": "cover",
    "position": "center",
    "dim": 0.45,
    "blur": 8,
    "video": { "loop": true, "muted": true, "playbackRate": 1.0 }
  },

  "audio": {
    "enabled": false,
    "file": "ambient.mp3",
    "volume": 0.3,
    "fadeMs": 800,
    "muteWhenUnfocused": true
  },

  "branding": {
    "mark": "logo.svg",
    "markSize": 26,
    "name": "My Harness",
    "hideName": false
  },

  "ui": {
    "panelOpacity": 0.78,
    "panelBlur": 14,
    "radius": 12,
    "font": "Inter",
    "codeFont": "JetBrains Mono"
  },

  "colors": {
    "dark": {
      "bg-base": "#0a0f16",
      "bg-layer-1": "#111823",
      "label-primary": "#e8eef7",
      "brand-primary": "#7ad1ff"
    },
    "light": {
      "bg-base": "#f6f8fb",
      "bg-layer-1": "#ffffff",
      "label-primary": "#101722",
      "brand-primary": "#0a6ea8"
    }
  }
}
```

Only `name` is required. Everything else has a sane default.

---

## 3. Fields

### Identity
- `name` — string, required. Shown in the Appearance picker.
- `author`, `description` — optional strings.
- `version` — integer, bump when you change the skin.

### `background`
- `file` — image (`.jpg`, `.jpeg`, `.png`, `.webp`) or video (`.mp4`, `.webm`).
- `fit` — `cover` | `contain` | `fill` | `repeat`. Default `cover`.
- `position` — `center` | `top` | `bottom` | `left` | `right`, or `"x% y%"`.
- `dim` — `0.0`–`0.9`. Darkening layer over the media so text stays readable. Default `0.4`.
- `blur` — `0`–`30` px. Default `0`.
- `video.loop` — `true` by default.
- `video.muted` — `true` by default and should stay `true` unless the skin is a deliberate
  audio-led piece (§5).
- `video.playbackRate` — `0.5`–`2.0`, default `1.0`.

Media limits: images ≤ 20 MB, video ≤ 100 MB. Larger files are rejected with a message naming the
file. Prefer 1920×1080 or 2560×1440; a 16:9 source crops cleanly at every window size.

### `audio`
- `enabled` — boolean, default `false`.
- `file` — a separate loop. If omitted and the background is a video, the video's own track can be
  used instead (`"file": "@video"`).
- `volume` — `0.0`–`1.0`.
- `fadeMs` — fade in/out on start, window blur and skin switch.
- `muteWhenUnfocused` — default `true`.

### `branding`
- `mark` — the logo file. See §4 for the drawing rules.
- `markSize` — rendered height in px, `16`–`48`. Default `26`.
- `hideMark` — `true` removes the shell's product mark even when `mark` is absent. Use it when the
  skin name should stand alone.
- `deepDivingMark` — optional single-colour artwork replacing the whale glyph on the running
  “Deep diving” status line. Masked like `mark`, so it inherits the accent colour. SVG/PNG/WebP.
- `name` — the product name shown beside the mark. Plain text, any length.
- `hideName` — `true` renders only the mark.

### `ui`
- `panelOpacity` — `0.0`–`1.0`. How opaque panels are *over the background*. `1.0` = solid, no
  transparency.
- `panelBlur` — `0`–`30` px backdrop blur behind panels.
- `radius` — `0`–`24` px corner radius for panels, cards and inputs.
- `font` — a font family already available to the browser, or a family you ship (see §6).
- `codeFont` — same, for code blocks and the terminal.

### `colors`
Two optional objects, `dark` and `light`. Each maps **token names to colours**; a token set under
`dark` applies only in dark mode, `light` only in light mode. Tokens you omit keep the built-in
value, so a skin can change ten things or ninety.

Mode follows DSH's own theme selection, not the operating system: an explicit Light or Dark
preference in Settings decides which table applies, and only the System preference falls back to
`prefers-color-scheme`. The skin is re-applied when that selection changes.

Accepted colour syntax: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()`, or `transparent`.

**The accent drives the controls, too.** Set `brand-primary` once and the plugin derives the rest of
the app's accent surfaces from it unless you override them per token: the active Chat/Trajectory tab
and its underline (`state-business-primary`), the active workspace folder glyph
(`state-business-primary`), the composer's send button (`button-info-fill` / `button-info-hover`) and
the running “Deep diving” line (`label-deep-diving` / `label-deep-diving-shimmer`). The send glyph
switches between white and near-black automatically so it stays readable on your accent.

#### The tokens worth knowing (safe set)

Surfaces — this is what makes panels and windows readable over a background:
- `bg-base` — the app background layer behind everything.
- `bg-layer-1` … `bg-layer-4` — panels, raised panels, nested cards, highest overlays.
- `bg-mask-1` — modal scrim.
- `bg-module-platform` — the outer frame.
- `bg-skeleton` — loading placeholders.

Text:
- `label-primary`, `label-secondary`, `label-tertiary`, `label-caption`, `label-dimmed`.
- `label-primary-foreground` — text on an inverted (filled) surface.
- `label-deep-diving`, `label-deep-diving-shimmer` — the running “Deep diving” status line.
- `link`.

Lines and separation:
- `border-l1` … `border-l4` — from faintest separation to strongest outline.
- `focus-ring-color`, `focus-ring-width`.

Interaction:
- `brand-primary` — accent, selection, primary actions.
- `button-primary-fill`, `button-primary-hover`.
- `button-elevated-fill`, `button-floating-hover` — the New Session button (rest / hover).
- `button-info-fill`, `button-info-hover` — the composer's send button.
- `button-ghost-active-fill`, `button-ghost-active-border`.
- `button-tool-bar-fill`, `button-tool-bar-hover`.
- `interactive-bg-hover`, `interactive-bg-active`.

Chrome:
- `menu-surface-fill`, `menu-backdrop-filter`, `menu-group-header-fill`, `menu-icon`.
- `tooltip-bg`, `tooltip-key-bg`, `toast-bg`, `toast-label`, `hovercard-bg`.
- `scrollbar-bg-l2`, `scrollbar-hover-l2`.

Content:
- `markdown-code-block`, `markdown-code-block-banner`, `markdown-inline-code`, `markdown-tag`.
- `code-diff-added`, `code-diff-deleted`.

State:
- `state-success-primary`, `state-warn-primary`, `state-error-primary`, `state-idle-primary`,
  `state-business-primary`.

Depth (accepts a full shadow value, not just a colour):
- `elevation-panel`, `elevation-prominent`, `elevation-soft`.

Shapes:
- `radius-xs`, `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`, `radius-panel`.

Outside the `alias` namespace — write the full name, the plugin passes it through:
- `specific-bubble` — the message bubble behind your own turns.
- `specific-menu` — the popup menu surface.
- `specific-input-major` — the composer field.
- `specific-selector` — the composer's round "+" / tool button.
- `elevation-panel`, `elevation-prominent`, `elevation-soft` — shadows (full shadow value, not just a colour).

The full token list shipped by this harness has ~98 `--dsw-alias-*` / `--dsw-elevation-*` /
`--dsw-radius-*` / `--dsw-font-*` entries. Anything not in the safe set above still works if you
name it exactly; the safe set is what a designer can change without breaking contrast or
legibility.

**Contrast rule:** body text on `bg-base`, `bg-layer-1` and `bg-layer-2` must stay at or above
4.5:1 in both modes. The Appearance page reports a warning per pair it can measure.

---

## 4. Drawing the logo

The mark replaces the product mark at the top of the sidebar, and `branding.name` replaces the
product wordmark beside it. The mark appears at two sizes: **26 px** (default, sidebar) and **48 px**
(large surfaces).

- **Format:** SVG preferred — crisp at any density, usually a few KB. PNG or WebP accepted.
- **Canvas:** square. Draw on a 128×128 or 512×512 canvas.
- **Safe area:** keep all artwork inside the central 80%. The mark is sometimes clipped to a
  rounded square.
- **Background:** transparent. Do not bake in a plate or a gradient panel.
- **Legibility:** must read at 26 px in one colour. If the design needs three tones to be
  recognisable, it will not read in the sidebar.
- **Both modes:** must work on a near-black and a near-white surface. Prefer a shape that carries
  itself, optionally with `currentColor` in the SVG so it inherits text colour.
- **It is painted as a mask:** the artwork's alpha channel is kept and it is filled with the sidebar's
  text colour, so the mark and the wordmark always match in both modes. Draw a single-colour
  silhouette — a full-colour logo will render flat.
- **No baked text.** Any lettering belongs in `branding.name`, not in the image.
- **Limit:** 512 KB. SVG must not contain `<script>`, event attributes (`on*`), or external
  references — the loader strips them, and a stripped-SVG warning is shown.

Optional extras the format accepts later, if you want to design ahead: an app icon (512×512) and an
empty-state hero image (1600×900). Neither is required for v1.

---

## 5. Which token paints what

If a surface looks grey and you want to change it, this is the map. Names are written as they go in
`colors` — the plugin adds the namespace when it is missing.

| What you see | Token | Confidence |
|---|---|---|
| Your own message bubble | `specific-bubble` | confirmed against the shell's bubble rule |
| Popup / dropdown menu | `specific-menu`, `menu-surface-fill` | from the stylesheet |
| Text inputs, the composer field | `bg-layer-3` | from the stylesheet |
| Input chips and image previews | `specific-input-major` | confirmed |
| Hovered and selected rows (settings nav, sidebar) | `interactive-bg-hover`, `interactive-bg-active` | from the stylesheet |
| Toolbar and ghost buttons ("New Session") | `button-tool-bar-fill`, `button-tool-bar-hover`, `button-ghost-active-fill` | inferred — check with the inspector |
| New Session button (rest / hover) | `button-elevated-fill`, `button-floating-hover` + `label-primary` | confirmed against the shell's rule (macOS paints this button from literals, so the token only applies elsewhere) |
| Composer attach / tool buttons ("+") | `specific-selector` + `label-primary` | confirmed against the shell's rule (hover uses `interactive-bg-hover-solid`) |
| Chat / Trajectory tabs (active tab + underline) | `state-business-primary` (rest: `label-tertiary`) | confirmed against the shell's tab rule; derived from `brand-primary` by default |
| Active workspace folder glyph | `state-business-primary` | confirmed; derived from `brand-primary` by default |
| Send button | `button-info-fill` / `button-info-hover` | confirmed; derived from `brand-primary` by default, glyph foreground chosen for contrast |
| “Deep diving” status line | `label-deep-diving`, `label-deep-diving-shimmer`; glyph via `branding.deepDivingMark` | confirmed; derived from `brand-primary` by default |
| Primary buttons (Send, Sign in) | `button-primary-fill`, `button-primary-hover` + `label-primary-foreground` | confirmed |
| Cards and panels | `bg-layer-1` … `bg-layer-4` | confirmed |

**Making text survive a custom surface.** The plugin checks a set of surface/text pairs after applying
a skin. If a pair drops below 3:1 contrast — pale ink on a white button is the usual way this happens
— it re-colours the *text* token to black or white, whichever reads better, and logs a warning to the
console when the skin had set that token itself. So a skin can set a bold surface without also
hand-pairing every foreground, but the warning is there to be fixed at the source.

**Finding a token that isn't in this table.** Open the browser's developer tools, pick the element,
and look at Computed styles, filtered to `--dsw`. The variable whose value matches the colour you see
is the one to set. That is exactly how every row above was found.



## 6. Audio, and what a video background can carry

A video background *may* have an audio track. Two facts decide how it is used:

1. **Browsers block unmuted autoplay.** A background video that starts with sound will silently
   refuse to play until the user clicks something. So `audio.enabled` defaults to `false` and video
   audio stays muted unless the skin explicitly opts in, in which case the track starts only after
   the user's first interaction and a small badge shows that the skin has sound.
2. **A background video loop is a bad music player.** It restarts with the visual loop. For actual
   music, ship a separate `ambient.mp3` (or `"file": "@video"` if the track is genuinely loop-safe)
   and let it loop independently of the video.

Delivered audio rules:
- Loop points must be seamless for `ambient.*`; a hard cut is audible every cycle.
- Normalise to roughly −16 LUFS; the volume slider is a multiplier, not a leveller.
- Format: `.mp3` or `.ogg` (`.wav` works but is large). ≤ 20 MB.
- No sudden transients above −3 dBFS — this plays under conversation.

---

## 7. Fonts

- Use a family the browser already has (`Inter`, `Georgia`, `system-ui`, `ui-monospace`).
- To ship a font, place the file in the skin folder and name the file in `ui.font`. Accepted:
  `.woff2` (preferred), `.woff`, `.ttf`. Include the licence file — skins with a font and no
  licence are refused.
- Weights 400 and 600 are used. A family without them is substituted automatically and the
  Appearance page says so.

---

## 8. Validation

A skin is checked on import and on load. A skin that fails is **not applied**; the previous skin
stays and the problem is named in one line:

| Problem | Message |
|---|---|
| `skin.json` missing or invalid JSON | `skin.json could not be read` |
| `name` missing | `skin.json has no name` |
| referenced file absent | `background file "x.mp4" not found` |
| wrong extension | `"x.gif" is not a supported background` |
| over the size limit | `"x.mp4" is 240 MB; the limit is 100 MB` |
| unreadable colour | `colors.dark["bg-base"] = "blurple" is not a colour` |
| SVG with script | `logo.svg contained script and was sanitised` (warning, not fatal) |
| font without licence | `font "x.woff2" needs a licence file` |

Warnings never block; errors do.

---

## 9. Checklist for a designer

1. Folder named after the skin, all lowercase with hyphens.
2. `skin.json` with at least `name`.
3. Background: 16:9, 1920×1080 or 2560×1440. If video: ≤ 100 MB, H.264 MP4, seamless loop, no
   hard cut.
4. Choose `dim` by looking at the result, not by theory: open a chat with long text and check
   contrast.
5. Colours: fill `dark` first, then `light`. Change `bg-*` and `label-*` as a pair.
6. Logo: square SVG, transparent, inside 80%, legible at 26 px in one colour.
7. Product name: plain text, sentence case.
8. Optional ambient audio: seamless loop, −16 LUFS.
9. Import, screenshot light and dark, adjust `dim` / `panelOpacity`.

---

## 10. Worked example — a minimal image skin

`skin.json`:
```json
{
  "name": "Aegean",
  "background": { "file": "background.jpg", "dim": 0.55, "blur": 2 },
  "colors": {
    "dark":  { "bg-layer-1": "#0d1a2b", "brand-primary": "#5fc8ff" },
    "light": { "bg-layer-1": "#f2f7fb", "brand-primary": "#1b6f9e" }
  },
  "ui": { "panelOpacity": 0.72, "radius": 14 }
}
```
Folder contents: `skin.json` + `background.jpg`. Nothing else needed.

---

## 11. Worked example — a video skin with branding
```json
{
  "name": "Harbour Night",
  "background": {
    "file": "background.mp4",
    "dim": 0.6,
    "blur": 6,
    "video": { "loop": true, "muted": true, "playbackRate": 0.75 }
  },
  "audio": { "enabled": true, "file": "ambient.mp3", "volume": 0.25 },
  "branding": { "mark": "logo.svg", "name": "Night Ops" },
  "ui": { "panelOpacity": 0.65, "panelBlur": 18, "radius": 10, "font": "Inter" },
  "colors": {
    "dark": {
      "bg-base": "#050a12",
      "bg-layer-1": "#0b1524",
      "bg-layer-2": "#101d30",
      "label-primary": "#e6eefb",
      "label-secondary": "#9fb2c9",
      "border-l2": "#1d2d44",
      "brand-primary": "#7ad1ff"
    }
  }
}
```

---

## 12. What appears in Settings → Skins

The **Skins** page (Settings → Skins) is deliberately small. Everything in `skin.json` is optional, and only these controls
are live:

- **Skin** — one dropdown listing every folder found in the skins directory, plus "None (default)".
- **Background dim** — 0–90 %.
- **Panel opacity** — 0–100 %.
- **Panel blur** — 0–30 px.
- **Corner radius** — 0–24 px.
- **Ambient volume** — 0–100 %, with a mute toggle. It applies to `ambient.*` and, when a skin
  opts in, to the video's own track. Muted and at zero when no audio is configured.
- **Loop audio when window is unfocused** — on/off (default on, matching `muteWhenUnfocused`).

Those five knobs override the same values in `skin.json` and are remembered per browser, so a
designer's `dim` is a starting point rather than a lock. Everything else — colours, fonts, logo,
name, background file — comes from the skin and is changed by editing the folder, not by fiddling
in the UI.

---

## Appendix — where skins and media live

Skins are folders on this machine:

```
~/.config/dsh/skins/<skin-name>/
```

The host half serves that directory to the browser, so a skin is **dropped in as a folder and
appears in the dropdown on refresh** — no upload step, no import dialog. The chosen skin, the
knobs above and the current background are browser preferences (localStorage); nothing is uploaded
to the harness server or any third party.

Removing a folder removes it from the dropdown. Another browser, another port, or another machine
sees the same folders but keeps its own choice of skin.
