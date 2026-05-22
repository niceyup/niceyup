import path from 'node:path'
import type { DatabaseSourceTableMetadata } from '@workspace/core/sources'
import { env } from './env'

export function tmpDir(...paths: string[]): string {
  const rootPath = '/tmp/.niceyup-engine' as const

  if (env.APP_ENV === 'development') {
    return path.join('./', rootPath, ...paths)
  }

  return path.join(rootPath, ...paths)
}

export function createSchemaDDL(tablesMetadata: DatabaseSourceTableMetadata[]) {
  const lines = []

  for (const table of tablesMetadata) {
    let tableLine = `CREATE TABLE "${table.name}" (\n`

    const columnsLine = []

    for (const column of table.columns) {
      let referenceLine = ''

      if (column.foreignTable && column.foreignColumn) {
        referenceLine = ` REFERENCES "${column.foreignTable}" ("${column.foreignColumn}")`
      }

      columnsLine.push(`  "${column.name}" ${column.dataType}${referenceLine}`)
    }

    tableLine += `${columnsLine.join(',\n')}\n)\n`

    lines.push(tableLine)
  }

  return lines.join('\n')
}
