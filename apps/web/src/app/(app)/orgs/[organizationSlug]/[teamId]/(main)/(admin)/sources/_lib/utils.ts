import type {
  SourceOperationStatus,
  SourceOperationType,
  SourceStatus,
  SourceType,
} from '@workspace/core/sources'
import type { SourceExplorerNodeStatus } from './types'

export const sourceExplorerNodeStatus = ({
  source,
}: {
  source: {
    type: SourceType | null
    status: SourceStatus | null
    operationType: SourceOperationType | null
    operationStatus: SourceOperationStatus | null
  }
}): SourceExplorerNodeStatus | null => {
  if (source.operationType === 'ingest') {
    switch (source.operationStatus) {
      case 'queued':
        return 'ingest-queued'
      case 'processing':
        return 'ingest-processing'
      // case 'completed':
      //   return 'ingest-completed'
      case 'failed':
        return 'ingest-failed'
    }
  }

  if (source.operationType === 'ingest-delete') {
    switch (source.operationStatus) {
      case 'queued':
        return 'ingest-delete-queued'
      case 'processing':
        return 'ingest-delete-processing'
      // case 'completed':
      //   return 'ingest-delete-completed'
      case 'failed':
        return 'ingest-delete-failed'
    }
  }

  switch (source.status) {
    case 'draft':
      return 'ingest-draft'
    case 'ready':
      return 'ingest-ready'
    case 'completed':
      return 'ingest-completed'
  }

  return null
}
