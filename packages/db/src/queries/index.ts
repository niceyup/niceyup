import { contextQueries } from './context'
import * as conversations from './conversations'
import * as files from './files'
import * as flags from './flags'
import * as messages from './messages'
import * as modelSettings from './model-settings'
import * as organizations from './organizations'
import * as providerSettings from './provider-settings'

export const queries = {
  ...organizations,
  ...flags,
  ...conversations,
  ...messages,
  ...files,
  ...modelSettings,
  ...providerSettings,
  context: contextQueries,
}
