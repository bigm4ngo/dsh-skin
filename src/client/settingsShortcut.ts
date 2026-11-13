/**
 * A subtle right-edge tab that opens Settings → Skins.
 *
 * The shell owns the settings dialog and exposes it through the account menu;
 * there is no in-tree service to call, so this walks the same DOM path a person
 * does (account menu → Settings → Skins). Every step is polled because the menu
 * and dialog mount asynchronously. The label of our own section is fixed, so
 * only the account-menu item needs a semantic match (icon first, English label
 * as a fallback).
 */

const FAB_ID = 'dsh-skin-settings-fab'

function findSettingsDialog(): HTMLElement | null {
  const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
  return dialogs.find((dialog) =>
    [...dialog.querySelectorAll('button')].some((button) => (button.textContent || '').trim() === 'General')) ?? null
}

function findSkinsNav(): HTMLElement | null {
  const buttons = [...document.querySelectorAll<HTMLElement>('[role="dialog"] button')]
  return buttons.find((button) => (button.textContent || '').trim() === 'Skins') ?? null
}

async function waitFor<T>(check: () => T | null, timeoutMs = 2500): Promise<T | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = check()
    if (value !== null) return value
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return null
}

async function openSkinSettings(): Promise<void> {
  if (findSettingsDialog() === null) {
    const trigger = document.querySelector<HTMLElement>('button[data-signed-out]')
      ?? document.querySelector<HTMLElement>('button[aria-label="Account menu"]')
    if (trigger === null) return
    trigger.click()
    const settingsItem = await waitFor(() => {
      const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      return items.find((item) => item.querySelector('svg[data-icon*="settings"]') !== null)
        ?? items.find((item) => (item.textContent || '').trim().toLowerCase() === 'settings')
        ?? null
    })
    if (settingsItem === null) return
    settingsItem.click()
    if (await waitFor(findSettingsDialog) === null) return
  }
  const nav = await waitFor(findSkinsNav)
  nav?.click()
}

/** Install the edge tab once; returns its disposer. */
export function installSettingsShortcut(): () => void {
  if (document.getElementById(FAB_ID) !== null) return () => {}
  const button = document.createElement('button')
  button.id = FAB_ID
  button.type = 'button'
  button.textContent = '✦'
  button.title = 'Skin settings'
  button.setAttribute('aria-label', 'Open skin settings')
  button.addEventListener('click', () => { void openSkinSettings() })
  document.body.appendChild(button)
  return () => button.remove()
}
