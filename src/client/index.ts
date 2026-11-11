/**
 * dsh-skin — browser half.
 *
 * Registers the Skins settings page and, when the active skin declares
 * branding, takes over the sidebar brand slots. Everything visual is applied
 * by the shared `SkinController`; this file only wires it to the client
 * context.
 */

import { controller } from './runtime.ts'
import { SkinSection } from './section.tsx'
import { installStyles } from './styles.ts'

/** Client services required before registration. */
export const inject = ['slots']

interface SlotsApi {
  inject: (name: string, callback: () => unknown) => unknown
  register: (definition: Record<string, unknown>, component: unknown) => unknown
}

interface ClientContext {
  slots: SlotsApi
  effect: (fn: () => unknown, label?: string) => void
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'dsh-skin: styles')
  ctx.effect(() => {
    void controller.initialize()
    return () => { controller.dispose() }
  }, 'dsh-skin: runtime')

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'skin',
      order: 12,
      label: () => 'Skins',
      inject: () => ({ controller }),
    },
    SkinSection,
  ))
}
