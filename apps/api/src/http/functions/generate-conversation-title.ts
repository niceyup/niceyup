import { generateText } from '@workspace/ai'
import { gateway } from '@workspace/ai/providers'

export async function generateConversationTitle({
  userMessage,
}: {
  userMessage: string | undefined
}) {
  try {
    if (!userMessage) {
      return null
    }

    const generatedTitle = await generateText({
      model: gateway.languageModel('openai/gpt-4.1'),
      messages: [
        {
          role: 'system',
          content: `Generate a concise, 3-5 word title summarizing the chat history.
### Guidelines:
- The title should clearly represent the main theme or subject of the conversation.
- Avoid quotation marks or special formatting.
- Write the title in the chat's primary language; default to English if multilingual.
- Prioritize accuracy over excessive creativity; keep it clear and simple.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    return generatedTitle.text
  } catch {
    return null
  }
}
