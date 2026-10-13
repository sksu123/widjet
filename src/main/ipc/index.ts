import { registerAiHandlers } from './ai.handler'
import { registerDbHandlers } from './db.handler'
import { registerFileHandlers } from './file.handler'
import { registerCalendarHandlers } from './calendar.handler'
import { registerAdminCalendarHandlers } from './admin_calendar.handler'

import { registerSystemHandlers } from './system.handler'
import { setupRuleAiHandlers } from './rule_ai.handler'
import { registerMobileHandlers } from './mobile.handler'
import { registerCloudHandlers } from './cloud.handler'

export function registerAllHandlers(): void {
  registerAiHandlers()
  registerDbHandlers()
  registerFileHandlers()
  registerCalendarHandlers()
  registerAdminCalendarHandlers()
  registerSystemHandlers()
  setupRuleAiHandlers()
  registerMobileHandlers()
  registerCloudHandlers()
}
