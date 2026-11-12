window.__ModuleLoader__.load({ id: "dsh-skin", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/state.ts
var ROUTE = "/dsh-skin";
var STORAGE_KEY = "dsh-skin:prefs";
function defaults() {
  return {
    skinId: null,
    favourites: [],
    dim: 0.4,
    panelOpacity: 0.78,
    panelBlur: 0,
    radius: 12,
    audioVolume: 0.3,
    audioMuted: false
  };
}
function normalizeFavourites(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of value) {
    if (typeof item !== "string" || item === "" || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}
function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed, favourites: normalizeFavourites(parsed.favourites) };
  } catch {
    return defaults();
  }
}
function themeSource() {
  const source = document.documentElement.getAttribute("data-ds-theme-source");
  return source === "light" || source === "dark" || source === "system" ? source : null;
}
function isDark() {
  const root = document.documentElement;
  const body = document.body;
  if (body.hasAttribute("data-ds-dark-theme") || root.hasAttribute("data-ds-dark-theme")) return true;
  const source = themeSource();
  if (source === "light") return false;
  if (source === "dark") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function tokenCssName(token) {
  const namespaced = /^(alias|specific|static|radius|font|elevation|focus|mask|menu|hovercard|toast|tooltip)-/;
  return namespaced.test(token) ? `--dsw-${token}` : `--dsw-alias-${token}`;
}
function resolveColor(value) {
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const match = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
function luminance([r, g, b]) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a, b) {
  const left = resolveColor(a);
  const right = resolveColor(b);
  if (left === null || right === null) return null;
  const [hi, lo] = [luminance(left), luminance(right)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
var CONTRAST_PAIRS = [
  ["alias-bg-base", "alias-label-primary"],
  ["alias-bg-layer-1", "alias-label-primary"],
  ["alias-bg-layer-2", "alias-label-primary"],
  ["alias-bg-layer-3", "alias-label-primary"],
  ["specific-bubble", "alias-label-primary"],
  ["specific-menu", "alias-label-secondary"],
  ["specific-input-major", "alias-label-primary"],
  ["alias-button-primary-fill", "alias-label-primary-foreground"],
  // The New Session button and the composer's "+" are painted from these
  // tokens but labelled from the general text token rather than a dedicated
  // foreground, so they need the same guard as the primary button.
  ["alias-button-elevated-fill", "alias-label-primary"],
  ["alias-button-floating-hover", "alias-label-primary"],
  ["specific-selector", "alias-label-primary"]
];
var MIN_CONTRAST = 3;
var SkinController = class {
  snapshot = { status: "idle", error: null, skins: [], prefs: readPrefs() };
  listeners = /* @__PURE__ */ new Set();
  bg = null;
  video = null;
  audio = null;
  appliedVars = [];
  scopeVars = [];
  baseLayerColors = /* @__PURE__ */ new Map();
  mediaUrl = null;
  disposers = [];
  getSnapshot = () => this.snapshot;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  emit(next) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
  async initialize() {
    this.emit({ status: "loading", error: null });
    try {
      const response = await fetch(`${ROUTE}/index.json`, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`skin library responded ${response.status}`);
      const skins = await response.json();
      const known = new Set(skins.map((skin) => skin.id));
      const favourites = this.snapshot.prefs.favourites.filter((id) => known.has(id));
      if (favourites.length !== this.snapshot.prefs.favourites.length) {
        this.setPrefs({ favourites }, { reapply: false });
      }
      this.emit({ status: "ready", skins, error: null });
      try {
        this.apply();
      } catch (error) {
        this.emit({ status: "error", error: error instanceof Error ? error.message : String(error) });
      }
      this.watchTheme();
    } catch (error) {
      this.emit({ status: "error", error: error instanceof Error ? error.message : String(error) });
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
  watchTheme() {
    const observer = new MutationObserver(() => {
      this.apply();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ds-dark-theme"]
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ds-theme-source", "data-ds-dark-theme", "class"]
    });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const source = themeSource();
      if (source === "light" || source === "dark") return;
      this.apply();
    };
    mq.addEventListener("change", onChange);
    this.disposers.push(() => {
      observer.disconnect();
      mq.removeEventListener("change", onChange);
    });
  }
  active(custom = this.snapshot.prefs) {
    if (custom.skinId === null) return null;
    return this.snapshot.skins.find((skin) => skin.id === custom.skinId) ?? null;
  }
  /**
   * Persist one preference patch and, unless it cannot affect the rendered
   * skin, re-apply it. Favourite changes pass `reapply: false`: pinning a skin
   * must not tear down and remount the current background (which restarts
   * video and audio).
   */
  setPrefs(patch, options = {}) {
    const prefs = { ...this.snapshot.prefs, ...patch };
    if (patch.favourites !== void 0) prefs.favourites = normalizeFavourites(patch.favourites);
    this.emit({ prefs });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
    }
    if (options.reapply !== false) this.apply();
  }
  /** Pin or unpin one skin without changing which skin is active. */
  toggleFavourite(id) {
    const favourites = this.snapshot.prefs.favourites;
    const next = favourites.includes(id) ? favourites.filter((entry) => entry !== id) : [...favourites, id];
    this.setPrefs({ favourites: next }, { reapply: false });
  }
  /** Effective values: skin manifest, overridden by the user's sliders. */
  effective(manifest, prefs) {
    return {
      dim: prefs.dim,
      panelOpacity: prefs.panelOpacity,
      panelBlur: prefs.panelBlur,
      radius: prefs.radius
    };
  }
  clearVars() {
    for (const name of this.appliedVars) document.documentElement.style.removeProperty(name);
    this.appliedVars = [];
    for (const [scope, name] of this.scopeVars) scope.style.removeProperty(name);
    this.scopeVars = [];
  }
  setVar(name, value) {
    document.documentElement.style.setProperty(name, value);
    this.appliedVars.push(name);
  }
  apply() {
    const prefs = this.snapshot.prefs;
    const entry = this.active();
    this.clearVars();
    this.teardownBackground();
    if (entry === null || entry.error !== void 0 && entry.error !== null) {
      document.body.dataset.dshSkin = "off";
      return;
    }
    const manifest = entry.manifest;
    const mode = isDark() ? "dark" : "light";
    const background = manifest.background ?? {};
    const ui = manifest.ui ?? {};
    const fit = background.fit ?? "cover";
    const position = background.position ?? "center";
    this.setVar("--dsh-skin-fit", fit === "repeat" ? "auto" : fit);
    this.setVar("--dsh-skin-position", position);
    this.setVar("--dsh-skin-blur", `${prefs.panelBlur === 0 ? background.blur ?? 0 : background.blur ?? 0}px`);
    this.setVar("--dsh-skin-dim", String(prefs.dim));
    if (background.file !== void 0 && background.file !== "") {
      this.mountBackground(entry.id, background.file, background);
    }
    document.body.dataset.dshSkin = "on";
    const scopes = this.tokenScopes();
    const computed = getComputedStyle(scopes[0] ?? document.body);
    const colours = manifest.colors?.[mode] ?? {};
    const alpha = Math.round(prefs.panelOpacity * 100);
    for (const scope of scopes) {
      for (const [token, value] of Object.entries(colours)) {
        this.setScopeVar(scope, tokenCssName(token), value);
      }
      const scopeStyle = getComputedStyle(scope);
      const surfaceTokens = [];
      for (const prop of scopeStyle) {
        if (!prop.startsWith("--dsw-alias-bg-")) continue;
        if (prop === "--dsw-alias-bg-skeleton") continue;
        surfaceTokens.push(prop);
      }
      for (const prop of surfaceTokens) {
        const key = `${prop}:${mode}`;
        const base = this.baseLayerColors.get(key) ?? scopeStyle.getPropertyValue(prop).trim();
        if (base === "" || base === "transparent" || base.startsWith("color-mix(")) continue;
        this.baseLayerColors.set(key, base);
        this.setScopeVar(scope, prop, `color-mix(in srgb, ${base} ${alpha}%, transparent)`);
      }
    }
    const radius = prefs.radius;
    for (const token of ["radius-xs", "radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-panel"]) {
      this.setVar(`--dsw-${token}`, `${radius}px`);
    }
    const tint = colours["bg-layer-1"] ?? (mode === "dark" ? "#0b1524" : "#ffffff");
    this.setVar("--dsh-skin-panel-tint", tint);
    this.setVar("--dsh-skin-panel-alpha", String(prefs.panelOpacity));
    if (ui.font !== void 0 && ui.font !== "") this.setVar("--dsw-font-family", ui.font);
    if (ui.codeFont !== void 0 && ui.codeFont !== "") {
      this.setVar("--dsw-font-markdown-code-font-family", ui.codeFont);
    }
    const branding = manifest.branding;
    if (branding?.mark !== void 0 && branding.mark !== "") {
      const url = `${ROUTE}/${encodeURIComponent(entry.id)}/${branding.mark.split("/").map(encodeURIComponent).join("/")}`;
      this.setVar("--dsh-skin-mark-url", `url("${url}")`);
      this.setVar("--dsh-skin-mark-size", `${branding.markSize ?? 26}px`);
    }
    if (branding?.name !== void 0 && branding.name !== "") {
      this.setVar("--dsh-skin-name", `"${branding.name.replace(/"/g, '\\"')}"`);
    }
    this.syncAudio(entry, prefs);
    this.enforceContrast(scopes, colours);
    this.clearChromeBackdrop();
  }
  /**
   * Make the shell's own containers transparent so the background layer shows.
   * Only ancestors of the sidebar are touched, so panels and cards keep their
   * translucent treatment.
   */
  clearChromeBackdrop() {
    const vw = window.innerWidth * window.innerHeight;
    const candidates = document.querySelectorAll("#root, #root > *, #root > * > *, body > div");
    const vh = window.innerHeight;
    for (const node of candidates) {
      const rect = node.getBoundingClientRect();
      const fullWindow = rect.width * rect.height >= vw * 0.8;
      const fullColumn = rect.height >= vh * 0.9 && rect.width <= window.innerWidth * 0.4;
      if (!fullWindow && !fullColumn) continue;
      const bg = getComputedStyle(node).backgroundColor;
      if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;
      node.style.setProperty("background-color", "transparent", "important");
      this.scopeVars.push([node, "background-color"]);
    }
  }
  /**
   * Keep text legible on the surfaces a skin re-colours. If a pair falls below
   * MIN_CONTRAST, the text token is re-coloured to black or white — whichever
   * reads better on that surface — and the skin's own value is overridden only
   * for that token.
   */
  enforceContrast(scopes, colours) {
    const probe = scopes[0] ?? document.body;
    const style = getComputedStyle(probe);
    for (const [surface, text] of CONTRAST_PAIRS) {
      const surfaceValue = style.getPropertyValue(`--dsw-${surface}`).trim();
      const textValue = style.getPropertyValue(`--dsw-${text}`).trim();
      if (surfaceValue === "" || textValue === "") continue;
      const ratio = contrast(surfaceValue, textValue);
      if (ratio === null || ratio >= MIN_CONTRAST) continue;
      const surfaceRgb = resolveColor(surfaceValue);
      if (surfaceRgb === null) continue;
      const replacement = luminance(surfaceRgb) > 0.45 ? "#0a0a0a" : "#ffffff";
      const better = contrast(surfaceValue, replacement) ?? 0;
      if (better <= ratio) continue;
      for (const scope of scopes) this.setScopeVar(scope, `--dsw-${text}`, replacement);
      const key = text.replace(/^alias-/, "");
      if (colours[key] !== void 0) {
        console.warn(`dsh-skin: "${key}" had ${ratio.toFixed(1)}:1 on --dsw-${surface}; using ${replacement}`);
      }
    }
  }
  /**
   * Elements that declare the design tokens: walk up from a themed surface and
   * keep every ancestor whose token value differs from its parent's.
   */
  tokenScopes() {
    const token = "--dsw-alias-bg-layer-1";
    const sample = document.querySelector("[class*=sidebar]") ?? document.body;
    const scopes = [];
    let node = sample;
    let childValue = getComputedStyle(sample).getPropertyValue(token).trim();
    while (node !== null) {
      const parent = node.parentElement;
      if (parent === null) break;
      const parentValue = getComputedStyle(parent).getPropertyValue(token).trim();
      if (parentValue !== childValue) scopes.push(node);
      childValue = parentValue;
      node = parent;
    }
    if (scopes.length === 0) scopes.push(document.body);
    return scopes;
  }
  setScopeVar(scope, name, value) {
    scope.style.setProperty(name, value);
    this.scopeVars.push([scope, name]);
  }
  mountBackground(id, file, background) {
    const layer = document.createElement("div");
    layer.id = "dsh-skin-bg";
    const url = `${ROUTE}/${encodeURIComponent(id)}/${file.split("/").map(encodeURIComponent).join("/")}`;
    const isVideo = /\.(mp4|webm)$/i.test(file);
    if (isVideo) {
      const video = document.createElement("video");
      video.className = "dsh-skin-media";
      video.src = url;
      video.loop = background.video?.loop ?? true;
      video.muted = this.snapshot.prefs.audioMuted || (background.video?.muted ?? true);
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "auto";
      video.playbackRate = background.video?.playbackRate ?? 1;
      layer.appendChild(video);
      this.video = video;
      void video.play().catch(() => {
      });
    } else {
      layer.style.backgroundImage = `url("${url}")`;
      layer.style.backgroundSize = background.fit === "repeat" ? "auto" : background.fit ?? "cover";
      layer.style.backgroundRepeat = background.fit === "repeat" ? "repeat" : "no-repeat";
      layer.style.backgroundPosition = background.position ?? "center";
    }
    const dimmer = document.createElement("div");
    dimmer.className = "dsh-skin-dimmer";
    layer.appendChild(dimmer);
    document.body.insertBefore(layer, document.body.firstChild);
    this.bg = layer;
    this.mediaUrl = url;
  }
  teardownBackground() {
    if (this.video !== null) {
      this.video.pause();
      this.video.src = "";
    }
    this.video = null;
    this.bg?.remove();
    this.bg = null;
  }
  syncAudio(entry, prefs) {
    const audio = entry.manifest.audio;
    const wants = audio?.enabled === true && prefs.audioMuted === false;
    if (audio === void 0 || wants === false) {
      this.stopAudio();
      return;
    }
    const file = audio.file === "@video" ? void 0 : audio.file;
    if (file === void 0) {
      if (this.video !== null) {
        this.video.muted = false;
        this.video.volume = prefs.audioVolume;
      }
      return;
    }
    const url = `${ROUTE}/${encodeURIComponent(entry.id)}/${file.split("/").map(encodeURIComponent).join("/")}`;
    if (this.audio === null || this.audio.src !== new URL(url, location.href).href) {
      this.stopAudio();
      const el = new Audio(url);
      el.loop = true;
      this.audio = el;
    }
    this.audio.volume = prefs.audioVolume;
    void this.audio.play().catch(() => {
    });
  }
  stopAudio() {
    if (this.audio !== null) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.video !== null) this.video.muted = true;
  }
  dispose() {
    this.teardownBackground();
    this.stopAudio();
    this.clearVars();
    document.body.dataset.dshSkin = "off";
    for (const off of this.disposers) off();
    this.disposers = [];
  }
};

// src/client/runtime.ts
var controller = new SkinController();

// src/client/section.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function Row(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skin-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { children: props.label }),
    props.children,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: props.value })
  ] });
}
function skinName(skin) {
  return skin.manifest.name ?? skin.id;
}
function SkinSection({ controller: controller2 }) {
  const snapshot = (0, import_react.useSyncExternalStore)(controller2.subscribe, controller2.getSnapshot);
  const prefs = snapshot.prefs;
  const chosen = snapshot.skins.find((skin) => skin.id === prefs.skinId);
  const byId = new Map(snapshot.skins.map((skin) => [skin.id, skin]));
  const favouriteSkins = prefs.favourites.map((id) => byId.get(id)).filter((skin) => skin !== void 0);
  const otherSkins = snapshot.skins.filter((skin) => !prefs.favourites.includes(skin.id));
  const isFavourite = chosen !== void 0 && prefs.skinId !== null && prefs.favourites.includes(prefs.skinId);
  const favouriteLabel = chosen === void 0 ? "Select a skin to favourite it" : isFavourite ? `Remove ${skinName(chosen)} from favourites` : `Add ${skinName(chosen)} to favourites`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skin-section", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Skins" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-skin-hint", children: [
      "Skins are folders in ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "~/.config/dsh/skins/" }),
      ". Drop one in, then pick it here. Star the ones you like to keep them at the top of the list."
    ] }),
    snapshot.status === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-skin-warn", children: [
      "Skin library unavailable: ",
      snapshot.error
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Skin", value: `${snapshot.skins.length} found`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skin-picker", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "select",
        {
          value: prefs.skinId ?? "",
          onChange: (event) => controller2.setPrefs({ skinId: event.target.value === "" ? null : event.target.value }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "None (default)" }),
            favouriteSkins.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", { label: "Favourites", children: favouriteSkins.map((skin) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: skin.id, children: skinName(skin) }, skin.id)) }) : null,
            otherSkins.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", { label: favouriteSkins.length > 0 ? "All skins" : "Skins", children: otherSkins.map((skin) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: skin.id, children: skinName(skin) }, skin.id)) }) : null
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dsh-skin-star",
          "aria-pressed": isFavourite,
          "aria-label": favouriteLabel,
          title: favouriteLabel,
          disabled: chosen === void 0,
          onClick: () => {
            if (prefs.skinId !== null) controller2.toggleFavourite(prefs.skinId);
          },
          children: isFavourite ? "\u2605" : "\u2606"
        }
      )
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skin-favourites", "aria-label": "Favourite skins", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-skin-favourites-label", children: "Favourites" }),
      favouriteSkins.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-skin-hint", children: "None yet \u2014 pick a skin and press \u2606." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-skin-chips", children: favouriteSkins.map((skin) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsh-skin-chip", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh-skin-chip-select",
            "aria-pressed": prefs.skinId === skin.id,
            title: `Use ${skinName(skin)}`,
            onClick: () => controller2.setPrefs({ skinId: skin.id }),
            children: skinName(skin)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "dsh-skin-chip-remove",
            "aria-label": `Remove ${skinName(skin)} from favourites`,
            title: "Remove from favourites",
            onClick: () => controller2.toggleFavourite(skin.id),
            children: "\xD7"
          }
        )
      ] }, skin.id)) })
    ] }),
    chosen?.error !== void 0 && chosen?.error !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-skin-warn", children: [
      chosen.id,
      ": ",
      chosen.error
    ] }) : null,
    chosen?.warnings?.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-skin-hint", children: [
      "\u26A0 ",
      warning
    ] }, warning)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Background dim", value: `${Math.round(prefs.dim * 100)}%`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "range",
        min: 0,
        max: 0.9,
        step: 0.05,
        value: prefs.dim,
        onChange: (event) => controller2.setPrefs({ dim: Number(event.target.value) })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Panel opacity", value: `${Math.round(prefs.panelOpacity * 100)}%`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "range",
        min: 0.3,
        max: 1,
        step: 0.02,
        value: prefs.panelOpacity,
        onChange: (event) => controller2.setPrefs({ panelOpacity: Number(event.target.value) })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Panel blur", value: `${prefs.panelBlur} px`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "range",
        min: 0,
        max: 12,
        step: 1,
        value: prefs.panelBlur,
        onChange: (event) => controller2.setPrefs({ panelBlur: Number(event.target.value) })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Corner radius", value: `${prefs.radius} px`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "range",
        min: 0,
        max: 24,
        step: 1,
        value: prefs.radius,
        onChange: (event) => controller2.setPrefs({ radius: Number(event.target.value) })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Ambient volume", value: prefs.audioMuted ? "muted" : `${Math.round(prefs.audioVolume * 100)}%`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "range",
        min: 0,
        max: 1,
        step: 0.05,
        value: prefs.audioVolume,
        onChange: (event) => controller2.setPrefs({ audioVolume: Number(event.target.value), audioMuted: false })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { label: "Ambient audio", value: prefs.audioMuted ? "off" : "on", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        type: "checkbox",
        checked: prefs.audioMuted === false,
        onChange: (event) => controller2.setPrefs({ audioMuted: event.target.checked === false })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsh-skin-hint", children: [
      "Audio starts muted by design: browsers refuse unmuted playback until you interact with the page. The switch above only takes effect once the skin declares an ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "audio" }),
      " block."
    ] })
  ] });
}

// src/client/styles.ts
var GLOBAL_STYLES = String.raw`
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
 * The mark seat keeps its box; the shell's own svg is hidden and the skin's
 * logo is painted into the same square, so layout is unchanged. */
body[data-dsh-skin='on'] [class*='railMark'] > svg,
body[data-dsh-skin='on'] [class*='brandMark'] > svg {
  display: none !important;
}

/* A background-image cannot inherit currentColor, so the mark is painted as
   a mask instead: the artwork's alpha channel is kept and the fill is the
   sidebar's own text colour, which matches the wordmark in both themes. */
body[data-dsh-skin='on'] [class*='railMark']::before,
body[data-dsh-skin='on'] [class*='brandMark']::before {
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
`;
function installStyles() {
  const id = "dsh-skin-styles";
  if (document.getElementById(id) !== null) return () => {
  };
  const el = document.createElement("style");
  el.id = id;
  el.textContent = GLOBAL_STYLES;
  document.head.appendChild(el);
  return () => {
    el.remove();
  };
}

// src/client/index.ts
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(() => installStyles(), "dsh-skin: styles");
  ctx.effect(() => {
    void controller.initialize();
    return () => {
      controller.dispose();
    };
  }, "dsh-skin: runtime");
  ctx.slots.inject("settings.section", () => ctx.slots.register(
    {
      name: "settings.section",
      id: "skin",
      order: 12,
      label: () => "Skins",
      inject: () => ({ controller })
    },
    SkinSection
  ));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
