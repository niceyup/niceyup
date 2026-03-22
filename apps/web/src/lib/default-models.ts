import type { ModelProvider } from '@workspace/core/model-providers'

export const defaultLanguageModels: {
  [provider in ModelProvider]?: { value: string; label: string }[]
} = {
  openai: [
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
    // { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat (latest)' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    // { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini' },
    // { value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex' },
    // { value: 'gpt-5.1-chat-latest', label: 'GPT-5.1 Chat (latest)' },
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-5-pro', label: 'GPT-5 Pro' },
    { value: 'gpt-5', label: 'GPT-5' },
    // { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    // { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
    // { value: 'gpt-5-codex', label: 'GPT-5 Codex' },
    // { value: 'gpt-5-chat-latest', label: 'GPT-5 Chat (latest)' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    // { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    // { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    // { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  google: [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (preview)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    // { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash Lite (preview 06-17)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    // { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (latest)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    // { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (latest)' },
    // { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
    // { value: 'gemini-1.5-flash-8b-latest', label: 'Gemini 1.5 Flash 8B (latest)' },
  ],
}

export const defaultEmbeddingModels: {
  [provider in ModelProvider]?: { value: string; label: string }[]
} = {
  openai: [
    { value: 'text-embedding-3-large', label: 'Text Embedding 3 Large' },
    { value: 'text-embedding-3-small', label: 'Text Embedding 3 Small' },
    { value: 'text-embedding-ada-002', label: 'Text Embedding Ada 002' },
  ],
  google: [
    { value: 'gemini-embedding-001', label: 'Gemini Embedding 001' },
    {
      value: 'gemini-embedding-2-preview',
      label: 'Gemini Embedding 2 (preview)',
    },
  ],
}
