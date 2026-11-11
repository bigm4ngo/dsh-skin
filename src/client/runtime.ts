/**
 * Single shared controller instance.
 *
 * The settings section and the sidebar brand occupants all read the same
 * snapshot, so the skin runtime is created once and imported by every
 * component instead of being threaded through props.
 */

import { SkinController } from './state.ts'

export const controller = new SkinController()
