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
          data: {
            ...params.params,
            sourceType: params.sourceType,
            explorerNode: params.explorerNode,
          },
        })
      : params.scope === 'conversations'
        ? await sdk.generateUploadSignatureConversation({
            data: {
              ...params.params,
              agentId: params.agentId,
              conversationId: params.conversationId,
            },
          })
        : await sdk.generateUploadSignature({
            data: {
              accept: params.accept,
              maxFiles: params.maxFiles,
              maxSize: params.maxSize,
              expires: params.expires,
            },
            headers: {
              'x-app-secret-key': env.APP_SECRET_KEY,
            },
          })

  if (error) {
    return { error: { ...error } }
  }

  return { data: { signature: data.signature } }
}
