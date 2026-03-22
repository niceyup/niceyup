import { type UserConfig, defineConfig } from '@kubb/core'
import { pluginClient } from '@kubb/plugin-client'
import { pluginOas } from '@kubb/plugin-oas'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs } from '@kubb/plugin-ts'
// import { pluginZod } from '@kubb/plugin-zod'
import { env } from './src/lib/env'

export const config: UserConfig = {
  name: 'Niceyup API',
  root: '.',
  input: {
    path: `${env.API_URL}/api/docs/openapi.json`,
  },
  output: {
    path: './src/api/generated',
    clean: true,
    extension: {
      '.ts': '',
    },
  },
  hooks: {
    done: ['pnpm run sdk:generate:format'],
  },
  plugins: [
    pluginOas({
      validate: false,
      generators: [],
    }),
    pluginTs({
      output: {
        path: './types',
      },
    }),
    // pluginZod({
    //   output: {
    //     path: './schemas',
    //   },
    //   typed: true,
    //   inferred: true,
    // }),
    pluginClient({
      importPath: '../../../../client/fetch-react-query',
      dataReturnType: 'data',
      // parser: 'zod',
      paramsType: 'object',
      pathParamsType: 'object',
      output: {
        path: './react-query/operations',
        barrelType: false,
      },
    }),
    pluginReactQuery({
      client: {
        importPath: '../../../../client/fetch-react-query',
        dataReturnType: 'data',
      },
      // parser: 'zod',
      paramsType: 'object',
      pathParamsType: 'object',
      output: {
        path: './react-query/hooks',
      },
    }),
    pluginClient({
      importPath: '../../../client/fetch',
      dataReturnType: 'full',
      // parser: 'zod',
      paramsType: 'object',
      pathParamsType: 'object',
      output: {
        path: './operations',
      },
    }),
  ],
}

export default defineConfig(config)
