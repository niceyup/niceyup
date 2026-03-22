import { generateText } from '@workspace/ai'
import { resolveAgentSystemConfiguration } from '@workspace/engine/agents'

const MAX_CONVERSATION_TITLE_LENGTH = 100
const CONVERSATION_TITLE_ELLIPSIS = '...'

export async function generateConversationTitle({
  agentId,
  userMessage,
}: {
  agentId: string
  userMessage: string | undefined
}) {
  try {
    if (!userMessage) {
      return null
    }

    const agentSystemConfiguration = await resolveAgentSystemConfiguration({
      agentId,
    })

    if (!agentSystemConfiguration) {
      return null
    }

    const auxiliaryLanguageModel =
      await agentSystemConfiguration.auxiliaryLanguageModel()

    if (!auxiliaryLanguageModel) {
      return null
    }

    const generatedTitle = await generateText({
      model: auxiliaryLanguageModel.model,
      system: agentSystemConfiguration.titleGenerationSystemMessage,
      prompt: userMessage,
    })

    const title = generatedTitle.text

    if (title.length <= MAX_CONVERSATION_TITLE_LENGTH) {
      return title
    }

    return `${title.slice(0, MAX_CONVERSATION_TITLE_LENGTH - CONVERSATION_TITLE_ELLIPSIS.length)}${CONVERSATION_TITLE_ELLIPSIS}`
  } catch {
    return null
  }
}
