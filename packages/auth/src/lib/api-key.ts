export const apiKeyConfigs = {
  user: {
    configId: 'user-keys',
    defaultPrefix: 'user_',
    references: 'user',
  },
  organization: {
    configId: 'organization-keys',
    defaultPrefix: 'org_',
    references: 'organization',
  },
} as const

type ResolveApiKeyConfigIdParams = {
  apiKey: string | null | undefined
}

export function resolveApiKeyConfigId(params: ResolveApiKeyConfigIdParams) {
  if (!params.apiKey) {
    return null
  }

  for (const config of Object.values(apiKeyConfigs)) {
    if (params.apiKey.startsWith(config.defaultPrefix)) {
      return config.configId
    }
  }

  return null
}
