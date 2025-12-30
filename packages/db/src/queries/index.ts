import { contextQueries } from './context'
import * as conversations from './conversations'
import * as files from './files'
import * as flags from './flags'
import * as messages from './messages'
import * as organizations from './organizations'

export const queries = {
  ...organizations,
  ...flags,
  ...conversations,
  ...messages,
  ...files,
  context: contextQueries,
}
