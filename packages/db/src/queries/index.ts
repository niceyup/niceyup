import * as activeTools from './active-tools'
import { contextQueries } from './context'
import * as conversations from './conversations'
import * as files from './files'
import * as flags from './flags'
import * as mcpServers from './mcp-servers'
import * as messages from './messages'
import * as modelSettings from './model-settings'
import * as organizations from './organizations'
import * as sources from './sources'
import * as vectorStores from './vector-stores'

export const queries = {
  ...organizations,

  ...flags,
  ...vectorStores,
  ...mcpServers,
  ...activeTools,
  ...modelSettings,
  ...conversations,
  ...messages,
  ...sources,
  ...files,

  context: contextQueries,
}
