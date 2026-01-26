import type {
  SourceIndexStatus,
  SourceOperationStatus,
  SourceOperationType,
  SourceStatus,
  SourceType,
} from '@workspace/core/sources'
import type { SourceExplorerNodeStatus } from './types'

export const sourceExplorerNodeStatus = ({
  source,
  sourceIndex,
}: {
  source:
    | {
        type: SourceType | null
        status: SourceStatus | null
        operationType: SourceOperationType | null
        operationStatus: SourceOperationStatus | null
      }
    | undefined
  sourceIndex:
    | {
        status: SourceIndexStatus | null
        operationType: SourceOperationType | null
        operationStatus: SourceOperationStatus | null
      }
    | undefined
}): SourceExplorerNodeStatus | null => {
  // Source Index Status
  if (sourceIndex) {
    if (sourceIndex.operationType === 'index') {
      switch (sourceIndex.operationStatus) {
        case 'queued':
          return 'index-queued'
        case 'processing':
          return 'index-processing'
        // case 'completed':
        //   return 'index-completed'
        case 'failed':
          return 'index-failed'
      }
    }

    if (sourceIndex.operationType === 'index-delete') {
      switch (sourceIndex.operationStatus) {
        case 'queued':
          return 'index-delete-queued'
        case 'processing':
          return 'index-delete-processing'
        // case 'completed':
        //   return 'index-delete-completed'
        case 'failed':
          return 'index-delete-failed'
      }
    }

    switch (sourceIndex.status) {
      case 'idle':
        return 'index-idle'
      case 'completed':
        return 'index-completed'
    }
  }

  // Source Status
  if (source) {
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
  }

  return null
}
