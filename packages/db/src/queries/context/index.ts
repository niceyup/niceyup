import * as agents from './agents'
import * as connections from './connections'
import * as conversations from './conversations'
import * as files from './files'
import * as invitations from './invitations'
import * as messages from './messages'
import * as organizations from './organizations'
import * as providers from './providers'
import * as sources from './sources'
import * as teams from './teams'

export const contextQueries = {
  ...organizations,
  ...teams,
  ...invitations,
  ...agents,
  ...conversations,
  ...messages,
  ...providers,
  ...sources,
  ...connections,
  ...files,
}
