import * as agents from './agents'
import * as connections from './connections'
import * as conversations from './conversations'
import * as files from './files'
import * as invitations from './invitations'
import * as mcpServers from './mcp-servers'
import * as messages from './messages'
import * as modelProviders from './model-providers'
import * as organizations from './organizations'
import * as sources from './sources'
import * as teams from './teams'
import * as vectorStores from './vector-stores'

export const contextQueries = {
  ...organizations,
  ...teams,
  ...invitations,

  ...modelProviders,
  ...vectorStores,
  ...connections,
  ...mcpServers,
  ...agents,
  ...conversations,
  ...messages,
  ...sources,
  ...files,
}
