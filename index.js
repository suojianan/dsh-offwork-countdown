import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const executable = path.join(here, 'OffWorkCountdown.exe')

/**
 * Host half of the DSH companion bundle.
 *
 * The widget is a normal Windows desktop process. This plugin only starts it
 * when the DSH profile loads and stops it again when the plugin is disposed;
 * the widget owns its settings, tray menu and click-through hotkey.
 */
export function apply(ctx) {
  if (process.platform !== 'win32') {
    ctx.logger?.warn?.('[offwork-countdown] Windows-only; the desktop widget was not started.')
    return
  }

  if (!existsSync(executable)) {
    ctx.logger?.warn?.('[offwork-countdown] OffWorkCountdown.exe is missing from the bundle.')
    return
  }

  ctx.effect(() => {
    let child
    try {
      child = spawn(executable, [], {
        stdio: 'ignore',
        windowsHide: false,
        // The widget must outlive the short-lived plugin apply/HMR operation.
        detached: true,
      })
    } catch (error) {
      ctx.logger?.warn?.(`[offwork-countdown] could not start: ${error.message}`)
      return undefined
    }

    child.on('error', (error) => {
      ctx.logger?.warn?.(`[offwork-countdown] widget process error: ${error.message}`)
    })
    // Do not keep the DSH host process alive just because the widget is open.
    child.unref()

    return () => {
      try {
        child.kill()
      } catch {
        // The widget may already have exited; nothing to clean up.
      }
    }
  }, 'offwork-countdown-desktop: launch widget')
}
