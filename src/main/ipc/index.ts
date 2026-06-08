import { registerAiHandlers } from './ai.handler'
import { registerDbHandlers } from './db.handler'
import { registerFileHandlers } from './file.handler'
import { registerCalendarHandlers } from './calendar.handler'

import { registerSystemHandlers } from './system.handler'

export function registerAllHandlers(): void {
  registerAiHandlers()
  registerDbHandlers()
  registerFileHandlers()
  registerCalendarHandlers()
  registerSystemHandlers()
}
