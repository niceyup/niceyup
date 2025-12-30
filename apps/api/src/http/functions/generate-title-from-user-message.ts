import { generateText } from '@workspace/ai'
import { gateway } from '@workspace/ai/providers'

const promptGenerateTitle = `
- You will generate a short title based on the first message a user begins a conversation with
- Ensure it is not more than 80 characters long
- The title should be a summary of the user's message
- Do not use quotes or colons`

export async function generateTitleFromUserMessage({
  userMessage,
}: { userMessage: string }) {
  const generatedTitle = await generateText({
    model: gateway.languageModel('openai/gpt-4.1'),
    messages: [
      {
        role: 'system',
        content: promptGenerateTitle,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  return generatedTitle.text
}
