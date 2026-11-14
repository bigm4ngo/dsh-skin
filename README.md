# dsh-skin

**English** · [简体中文](README.zh.md)

Skins for **DeepSeek Harness Web** — the kind where you point it at a wallpaper and the whole
interface sits on top of it.

A skin is a folder. Drop it in `~/.config/dsh/skins/` — or group skins into collection folders under
it — refresh, and pick it in **Settings → Skins**. Image or video background, translucent panels,
your own colours, logo and wordmark, optional ambient audio, plus collections, favourites, shortcuts
and an optional random skin on every start. No build step, no upload dialog, nothing leaves the
machine.

![Skins settings page](screenshots/settings.png)

## Requirements

- dsh **0.2.2-rc.x**. The client peers are pinned to that range; the plugin manager refuses anything
  outside it rather than half-loading.
- The **web** profile (`dsh web`). The desktop app loads its client differently and is not supported
  yet.

## Install

```bash
# from a checkout
dsh plugin --profile web add /path/to/dsh-skin

# or from GitHub
dsh plugin --profile web add github:bigm4ngo/dsh-skin
```

Restart `dsh web` and open **Settings → Skins**.

Nothing is installed system-wide: `dsh plugin` puts the package in the profile's own `node_modules`,
and `lib/` ships pre-built, so your machine needs no compiler or build step.

## Example skins

Two complete examples live in [`example_skins/`](example_skins):

| Folder | Background |
| --- | --- |
| `lavender-dream` | still image |
| `winter-pines` | video loop |

Copy one into `~/.config/dsh/skins/`, or into a collection folder such as
`~/.config/dsh/skins/natural-view/`, then pick it in **Settings → Skins**. Each folder is a normal
skin: `skin.json` plus its media and logo.

## Make a skin

The full format — every field, the colour tokens, the rules for drawing a logo — is in
**[SKIN-FORMAT.md](SKIN-FORMAT.md)**. It is written to be handed to a designer, not only to a
developer.

The short version:

```
~/.config/dsh/skins/harbour/
├── skin.json
├── background.jpg      (or .mp4 / .webm)
├── logo.svg            (optional)
└── ambient.mp3         (optional)
```

```json
{
  "name": "Harbour",
  "background": { "file": "background.jpg", "dim": 0.5 },
  "colors": {
    "dark":  { "bg-layer-1": "#0b1524", "brand-primary": "#7ad1ff" },
    "light": { "bg-layer-1": "#ffffff", "brand-primary": "#1b6f9e" }
  }
}
```

Reload the page and it appears in the list. If something is wrong — a missing file, a value that
isn't a colour, a 700 MB video — the skin is refused and the reason is printed under the dropdown
instead of being applied silently.

![Skin applied](screenshots/applied.png)

## What you can change

- **Background** — image or video; `cover` / `contain` / `fill` / `repeat`; position; dimming; blur.
- **Collections** — one extra folder level under `~/.config/dsh/skins/` groups skins (for example
  `natural-view/` and `retro-vibe/`). The Folder selector scopes the picker, the randomiser and the
  favourite/shortcut lists to one collection.
- **Random skin on start** — picks a random skin from the selected folder every time the app starts.
- **Favourites and shortcuts** — star any skin to pin it above the rest, then press **+** beside the
  skin picker to keep the active skin in the compact shortcut row. Both survive restarts and are
  stored per browser.
- **Surfaces** — panel opacity, backdrop blur, corner radius, the message bubble, the composer field,
  the popup menu, and any `--dsw-*` colour token, separately for light and dark mode.
- **Logo and wordmark** — your own SVG/PNG/WebP replaces the product mark; a plain string replaces the
  wordmark. `hideMark` removes the product mark without a replacement, `deepDivingMark` swaps the
  whale on the running status line, and `deepDivingText` replaces its “Deep diving for …” message
  while keeping the shimmer and screen-reader status.
- **Accent-driven controls** — one `brand-primary` also themes the Chat/Trajectory tabs, the active
  workspace glyph, the send button and the “Deep diving” line, with readable send-button contrast.
- **Ambient audio** — a looping file, or the video's own track; muted by default, with a volume
  slider.
- **Folder tools** — an **Open skins folder** button in Settings, and a subtle **✦** tab on the
  right edge of the app that jumps straight to the skins section.

The sliders (dim, panel opacity, blur, radius, ambient volume) and the browser preferences
(collection, randomise, favourites, shortcuts) are remembered per browser. Everything else comes
from `skin.json`, so a designer can ship a look without the user having to fiddle.

## Notes and limits

- **Branding is applied to the existing brand seat**, not through the sidebar's brand slots: on
  0.2.2-rc.1 those slots do not accept an out-of-tree occupant. The shell's mark is hidden and the
  skin's logo is painted into the same box, so layout is unchanged.
- One level of collection folders is read. A folder with its own `skin.json` is a skin; a folder
  without one is treated as a collection of skins.
- Class names in the shell are build-hashed, so the plugin finds the outer containers by geometry and
  by stable class suffixes rather than exact selectors. A future dsh release may move them; if a
  wallpaper stops showing through, that is where to look.

## How it is put together

Two halves, both small:

- **Host** (`src/index.ts`) registers `/dsh-skin` on the web server and serves the skins directory —
  listings at `/dsh-skin/index.json`, media at `/dsh-skin/<skin>/<file>` with HTTP range support so
  video can stream. It validates each manifest on read.
- **Browser** (`src/client/`) fetches the listing, paints the background layer, overrides the design
  tokens at the element that declares them, and registers the Skins settings page.

A skin is data plus media: no CSS, no scripts, no HTML. Unknown fields are ignored, not executed.

## Development

```bash
pnpm install
node scripts/build.mjs     # lib/index.js (host) + lib/client.js (browser)
```

`lib/` is committed, so installing from a fresh clone needs no build.

## Licence

MIT.
