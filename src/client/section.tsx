import { useState } from 'react'
import { useSyncExternalStore } from 'react'
import type { SkinController, SkinEntry, Snapshot } from './state.ts'

interface Props {
  controller: SkinController
}

function Row(props: {
  label: string
  value: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="dsh-skin-row">
      <label>{props.label}</label>
      {props.children}
      <output>{props.value}</output>
    </div>
  )
}

function skinName(skin: SkinEntry): string {
  return skin.manifest.name ?? skin.id
}

export function SkinSection({ controller }: Props): React.ReactElement {
  const snapshot: Snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const prefs = snapshot.prefs
  const groups = controller.groups()
  const byId = new Map(snapshot.skins.map((skin) => [skin.id, skin]))
  const inScope = (skin: SkinEntry): boolean => prefs.scope === null || skin.group === prefs.scope
  const scopedSkins = snapshot.skins.filter(inScope)
  const chosen = snapshot.skins.find((skin) => skin.id === prefs.skinId)
  // Pinned skins keep the order they were pinned in; entries whose folder is
  // gone are pruned when the library loads, and non-scoped ones stay hidden.
  const favouriteSkins = prefs.favourites
    .map((id) => byId.get(id))
    .filter((skin): skin is SkinEntry => skin !== undefined && inScope(skin))
  const otherSkins = scopedSkins.filter((skin) => !prefs.favourites.includes(skin.id))
  // Shortcuts stay visible across folders; a shortcut selected from another
  // collection remains reachable even while the picker is scoped elsewhere.
  const shortcutSkins = prefs.shortcuts
    .map((id) => byId.get(id))
    .filter((skin): skin is SkinEntry => skin !== undefined && prefs.favourites.includes(skin.id))
  const chosenOutsideScope = chosen !== undefined && !scopedSkins.some((skin) => skin.id === chosen.id)
  const isFavourite = chosen !== undefined
    && prefs.skinId !== null
    && prefs.favourites.includes(prefs.skinId)
  const isShortcut = chosen !== undefined
    && prefs.skinId !== null
    && prefs.shortcuts.includes(prefs.skinId)
  const shortcutLabel = chosen === undefined
    ? 'Select a skin to shortcut it'
    : isShortcut
      ? `Remove ${skinName(chosen)} from shortcuts`
      : `Add ${skinName(chosen)} to shortcuts`
  const favouriteLabel = chosen === undefined
    ? 'Select a skin to favourite it'
    : isFavourite
      ? `Remove ${skinName(chosen)} from favourites`
      : `Add ${skinName(chosen)} to favourites`
  const [folderStatus, setFolderStatus] = useState<string | null>(null)

  const openFolder = (): void => {
    setFolderStatus('Opening…')
    void controller.openSkinsFolder()
      .then((path) => setFolderStatus(path === '' ? 'Opened the skins folder.' : `Opened ${path}`))
      .catch((error: unknown) => setFolderStatus(error instanceof Error ? error.message : String(error)))
  }

  return (
    <div className="dsh-skin-section">
      <h2>Skins</h2>
      <p className="dsh-skin-hint">
        Skins are folders in <code>~/.config/dsh/skins/</code>. Group them into subfolders to keep
        collections together. Star a skin to pin it to the top of the picker; press <strong>+</strong>
        beside the picker to keep it in the shortcut row.
      </p>

      {snapshot.status === 'error' ? (
        <p className="dsh-skin-warn">Skin library unavailable: {snapshot.error}</p>
      ) : null}

      {groups.length > 0 ? (
        <Row label="Folder" value={`${scopedSkins.length} skins`}>
          <select
            value={prefs.scope ?? ''}
            onChange={(event) => controller.setScope(event.target.value === '' ? null : event.target.value)}
          >
            <option value="">All folders</option>
            {groups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </Row>
      ) : null}

      <Row label="Random skin" value={prefs.randomise ? 'each start' : 'off'}>
        <input
          type="checkbox"
          checked={prefs.randomise}
          onChange={(event) => controller.setRandomise(event.target.checked)}
        />
      </Row>
      <p className="dsh-skin-hint">
        Picks a random skin from the selected folder every time the app starts.
      </p>

      <Row label="Skin" value={`${scopedSkins.length} found`}>
        <div className="dsh-skin-picker">
          <select
            value={prefs.skinId ?? ''}
            onChange={(event) => controller.setPrefs({ skinId: event.target.value === '' ? null : event.target.value })}
          >
            <option value="">None (default)</option>
            {chosenOutsideScope ? (
              <option value={chosen.id}>{skinName(chosen)}</option>
            ) : null}
            {favouriteSkins.length > 0 ? (
              <optgroup label="Favourites">
                {favouriteSkins.map((skin) => (
                  <option key={skin.id} value={skin.id}>{skinName(skin)}</option>
                ))}
              </optgroup>
            ) : null}
            {otherSkins.length > 0 ? (
              <optgroup label={favouriteSkins.length > 0 ? 'All skins' : 'Skins'}>
                {otherSkins.map((skin) => (
                  <option key={skin.id} value={skin.id}>{skinName(skin)}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <button
            type="button"
            className="dsh-skin-star"
            aria-pressed={isFavourite}
            aria-label={favouriteLabel}
            title={favouriteLabel}
            disabled={chosen === undefined}
            onClick={() => {
              if (prefs.skinId !== null) controller.toggleFavourite(prefs.skinId)
            }}
          >
            {isFavourite ? '★' : '☆'}
          </button>
          <button
            type="button"
            className="dsh-skin-shortcut"
            aria-pressed={isShortcut}
            aria-label={shortcutLabel}
            title={shortcutLabel}
            disabled={chosen === undefined}
            onClick={() => {
              if (prefs.skinId !== null) controller.toggleShortcut(prefs.skinId)
            }}
          >
            {isShortcut ? '✓' : '+'}
          </button>
        </div>
      </Row>

      <div className="dsh-skin-favourites" aria-label="Shortcut skins">
        <span className="dsh-skin-favourites-label">Shortcuts</span>
        {shortcutSkins.length === 0 ? (
          <span className="dsh-skin-hint">None yet — press + beside the skin picker.</span>
        ) : (
          <div className="dsh-skin-chips">
            {shortcutSkins.map((skin) => (
              <span className="dsh-skin-chip dsh-skin-chip-shortcut" key={skin.id}>
                <button
                  type="button"
                  className="dsh-skin-chip-select"
                  aria-pressed={prefs.skinId === skin.id}
                  title={`Use ${skinName(skin)}`}
                  onClick={() => controller.setPrefs({ skinId: skin.id })}
                >
                  {skinName(skin)}
                </button>
                <button
                  type="button"
                  className="dsh-skin-chip-remove"
                  aria-label={`Remove ${skinName(skin)} from shortcuts`}
                  title="Remove from shortcuts"
                  onClick={() => controller.removeShortcut(skin.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="dsh-skin-row dsh-skin-actions">
        <span />
        <button type="button" className="dsh-skin-action" onClick={openFolder}>
          Open skins folder
        </button>
        <span className="dsh-skin-status" role="status">{folderStatus ?? ''}</span>
      </div>

      {chosen?.error !== undefined && chosen?.error !== null ? <p className="dsh-skin-warn">{chosen.id}: {chosen.error}</p> : null}
      {chosen?.warnings?.map((warning) => (
        <p className="dsh-skin-hint" key={warning}>⚠ {warning}</p>
      ))}

      <Row label="Background dim" value={`${Math.round(prefs.dim * 100)}%`}>
        <input
          type="range" min={0} max={0.9} step={0.05} value={prefs.dim}
          onChange={(event) => controller.setPrefs({ dim: Number(event.target.value) })}
        />
      </Row>

      <Row label="Panel opacity" value={`${Math.round(prefs.panelOpacity * 100)}%`}>
        <input
          type="range" min={0.3} max={1} step={0.02} value={prefs.panelOpacity}
          onChange={(event) => controller.setPrefs({ panelOpacity: Number(event.target.value) })}
        />
      </Row>

      <Row label="Panel blur" value={`${prefs.panelBlur} px`}>
        <input
          type="range" min={0} max={12} step={1} value={prefs.panelBlur}
          onChange={(event) => controller.setPrefs({ panelBlur: Number(event.target.value) })}
        />
      </Row>

      <Row label="Corner radius" value={`${prefs.radius} px`}>
        <input
          type="range" min={0} max={24} step={1} value={prefs.radius}
          onChange={(event) => controller.setPrefs({ radius: Number(event.target.value) })}
        />
      </Row>

      <Row label="Ambient volume" value={prefs.audioMuted ? 'muted' : `${Math.round(prefs.audioVolume * 100)}%`}>
        <input
          type="range" min={0} max={1} step={0.05} value={prefs.audioVolume}
          onChange={(event) => controller.setPrefs({ audioVolume: Number(event.target.value), audioMuted: false })}
        />
      </Row>

      <Row label="Ambient audio" value={prefs.audioMuted ? 'off' : 'on'}>
        <input
          type="checkbox" checked={prefs.audioMuted === false}
          onChange={(event) => controller.setPrefs({ audioMuted: event.target.checked === false })}
        />
      </Row>

      <p className="dsh-skin-hint">
        Audio starts muted by design: browsers refuse unmuted playback until you interact with the page.
        The switch above only takes effect once the skin declares an <code>audio</code> block.
      </p>
    </div>
  )
}
