import { FileTextIcon, TextIcon } from 'lucide-react'

export const availableSourceTypes = {
  file: {
    value: 'file' as const,
    label: 'File',
    description:
      'Upload documents to index your AI. Extract text from PDFs, DOCX, and TXT files.',
    icon: <FileTextIcon className="size-4" />,
  },
  text: {
    value: 'text' as const,
    label: 'Text',
    description:
      'Add plain text-based sources to index your AI Agent with precise information.',
    icon: <TextIcon className="size-4" />,
  },
  // website: {
  //   value: 'website' as const,
  //   label: 'Website',
  //   description:
  //     'Crawl web pages or submit sitemaps to update your AI with the latest content.',
  //   icon: <GlobeIcon className="size-4" />,
  // },
  // 'question-answer': {
  //   value: 'question-answer' as const,
  //   label: 'Q&A',
  //   description:
  //     'Craft responses for key questions, ensuring your AI shares relevant info.',
  //   icon: <MessagesSquareIcon className="size-4" />,
  // },
}

export type AvailableSourceType = typeof availableSourceTypes
