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
  const chosen = snapshot.skins.find((skin) => skin.id === prefs.skinId)
  const byId = new Map(snapshot.skins.map((skin) => [skin.id, skin]))
  // Pinned skins keep the order they were pinned in; a stored id whose folder
  // is gone is already pruned when the library loads, and is ignored here.
  const favouriteSkins = prefs.favourites
    .map((id) => byId.get(id))
    .filter((skin): skin is SkinEntry => skin !== undefined)
  const otherSkins = snapshot.skins.filter((skin) => !prefs.favourites.includes(skin.id))
  const isFavourite = chosen !== undefined
    && prefs.skinId !== null
    && prefs.favourites.includes(prefs.skinId)
  const favouriteLabel = chosen === undefined
    ? 'Select a skin to favourite it'
    : isFavourite
      ? `Remove ${skinName(chosen)} from favourites`
      : `Add ${skinName(chosen)} to favourites`

  return (
    <div className="dsh-skin-section">
      <h2>Skins</h2>
      <p className="dsh-skin-hint">
        Skins are folders in <code>~/.config/dsh/skins/</code>. Drop one in, then pick it here.
        Star the ones you like to keep them at the top of the list.
      </p>

      {snapshot.status === 'error' ? (
        <p className="dsh-skin-warn">Skin library unavailable: {snapshot.error}</p>
      ) : null}

      <Row label="Skin" value={`${snapshot.skins.length} found`}>
        <div className="dsh-skin-picker">
          <select
            value={prefs.skinId ?? ''}
            onChange={(event) => controller.setPrefs({ skinId: event.target.value === '' ? null : event.target.value })}
          >
            <option value="">None (default)</option>
            {favouriteSkins.length > 0 ? (
              <optgroup label="Favourites">
                {favouriteSkins.map((skin) => (
                  <option key={skin.id} value={skin.id}>
                    {skinName(skin)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {otherSkins.length > 0 ? (
              <optgroup label={favouriteSkins.length > 0 ? 'All skins' : 'Skins'}>
                {otherSkins.map((skin) => (
                  <option key={skin.id} value={skin.id}>
                    {skinName(skin)}
                  </option>
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
        </div>
      </Row>

      <div className="dsh-skin-favourites" aria-label="Favourite skins">
        <span className="dsh-skin-favourites-label">Favourites</span>
        {favouriteSkins.length === 0 ? (
          <span className="dsh-skin-hint">None yet — pick a skin and press ☆.</span>
        ) : (
          <div className="dsh-skin-chips">
            {favouriteSkins.map((skin) => (
              <span className="dsh-skin-chip" key={skin.id}>
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
                  aria-label={`Remove ${skinName(skin)} from favourites`}
                  title="Remove from favourites"
                  onClick={() => controller.toggleFavourite(skin.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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
