import { logger } from '@trigger.dev/sdk'

export function pyPath(filePath: string): string {
  return `python/trigger/${filePath}.py`
}

export function pyArgs(args: Record<string, unknown>): string[] {
  return [JSON.stringify(args)]
}

type PyLoggerLevel = 'INFO' | 'WARNING' | 'ERROR' | string

type PyLogger<TResult> = {
  asctime: string
  name: string
  levelname: PyLoggerLevel
  message: TResult
}

function _pyLog(
  level: PyLoggerLevel,
  message: string,
  metadata?: Record<string, unknown>,
) {
  switch (level) {
    case 'INFO':
      logger.info(message, metadata)
      break
    case 'WARNING':
      logger.warn(message, metadata)
      break
    case 'ERROR':
      logger.error(message, metadata)
      break
    default:
      logger.log(message, metadata)
      break
  }
}

export function parsePyLogger<TResult>(
  pyLogger: string,
  { log }: { log?: false } = {},
): Partial<PyLogger<TResult>> {
  const regex = /^(.+?) - (.+?) - (.+?) - (.+)$/
  const match = pyLogger.match(regex)

  if (!match) {
    return {}
  }

  const [, asctime, name, levelname, message] = match

  if (log !== false && message) {
    try {
      const parsed = JSON.parse(message)

      _pyLog(levelname as PyLoggerLevel, parsed?.message || parsed, parsed)

      return { asctime, name, levelname, message: parsed } as Partial<
        PyLogger<TResult>
      >
    } catch {
      logger.info(message)
    }
  }

  return { asctime, name, levelname, message } as Partial<PyLogger<TResult>>
}

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>

export async function pyStreamingResult<TResult>(
  streamingResult: AsyncIterableStream<string>,
  { log, index }: { log?: false; index?: number } = {},
): Promise<TResult> {
  const results = []

  for await (const chunk of streamingResult) {
    results.push(parsePyLogger(chunk, { log }))
  }

  if (!results.length) {
    return undefined as TResult
  }

  if (index !== undefined) {
    return results[index]?.message as TResult
  }

  if (results.length > 2) {
    return results[results.length - 2]?.message as TResult
  }

  return results[results.length - 1]?.message as TResult
}
