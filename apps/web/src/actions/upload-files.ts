'use server'

import { env } from '@/lib/env'
import { sdk } from '@/lib/sdk'

export type GenerateUploadSignatureParams =
  | ({
      bucket: 'default'
    } & (
      | {
          scope: 'public'
          params?: {
            organizationSlug?: string | null
          }
          accept?: string
          maxFiles?: number
          maxSize?: number
          expires?: number
        }
      | {
          scope: 'conversations'
          params: {
            organizationSlug: string
          }
          agentId: string
          conversationId?: string | null
        }
    ))
  | ({
      bucket: 'engine'
    } & {
      scope: 'sources'
      params: {
        organizationSlug: string
      }
      sourceType?: 'file' | 'database'
      explorerNode?: { folderId?: string | null }
    })

export async function generateUploadSignature(
  params: GenerateUploadSignatureParams,
) {
  const { data, error } =
    params.scope === 'sources'
      ? await sdk.generateUploadSignatureSource({
          headers: {
            'x-organization-slug': params.params.organizationSlug,
          },
          data: {
            sourceType: params.sourceType,
            explorerNode: params.explorerNode,
          },
        })
      : params.scope === 'conversations'
        ? await sdk.generateUploadSignatureConversation({
            headers: {
              'x-organization-slug': params.params.organizationSlug,
            },
            data: {
              agentId: params.agentId,
              conversationId: params.conversationId,
            },
          })
        : await sdk.generateUploadSignature({
            headers: {
              'x-app-secret-key': env.APP_SECRET_KEY,
              'x-organization-slug':
                params.params?.organizationSlug ?? undefined,
            },
            data: {
              accept: params.accept,
              maxFiles: params.maxFiles,
              maxSize: params.maxSize,
              expires: params.expires,
            },
          })

  if (error) {
    return { error: { ...error } }
  }

  return { data: { signature: data.signature } }
}
