import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { JSONLoader } from '@langchain/classic/document_loaders/fs/json'
import { JSONLinesLoader } from '@langchain/classic/document_loaders/fs/json'
import { MultiFileLoader } from '@langchain/classic/document_loaders/fs/multi_file'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { PPTXLoader } from '@langchain/community/document_loaders/fs/pptx'
import type { DocumentLoader } from '@langchain/core/document_loaders/base'

type FileLoadersParams = {
  pdf?: {
    parsedItemSeparator?: string
    splitPages?: boolean
  }
  csv?: {
    column?: string
    separator?: string
  }
  json?: {
    pointers?: string | string[]
  }
  jsonl?: {
    pointer?: string
  }
}

function fileLoaders(params?: FileLoadersParams): {
  [extension: string]: (path: string) => DocumentLoader
} {
  return {
    '.txt': (path) => new TextLoader(path),
    '.pdf': (path) =>
      new PDFLoader(path, {
        // See: https://docs.langchain.com/oss/javascript/integrations/document_loaders/file_loaders/pdf#usage%2C-custom-pdfjs-build
        pdfjs: () => import('pdfjs-dist/legacy/build/pdf.mjs'),
        parsedItemSeparator: params?.pdf?.parsedItemSeparator,
        splitPages: params?.pdf?.splitPages,
      }),
    '.docx': (path) => new DocxLoader(path),
    '.doc': (path) => new DocxLoader(path, { type: 'doc' }),
    '.pptx': (path) => new PPTXLoader(path),
    '.csv': (path) =>
      new CSVLoader(path, {
        column: params?.csv?.column,
        separator: params?.csv?.separator,
      }),
    '.json': (path) => new JSONLoader(path, params?.json?.pointers || '/texts'),
    '.jsonl': (path) =>
      new JSONLinesLoader(path, params?.jsonl?.pointer || '/html'),
  } as const
}

export async function filesLoader({
  paths,
  fileLoadersParams,
}: { paths: string[]; fileLoadersParams?: FileLoadersParams }) {
  const loader = new MultiFileLoader(paths, fileLoaders(fileLoadersParams))

  const documents = await loader.load()

  return documents
}

export async function directoryLoader({
  path,
  fileLoadersParams,
}: { path: string; fileLoadersParams?: FileLoadersParams }) {
  const loader = new DirectoryLoader(path, fileLoaders(fileLoadersParams))

  const documents = await loader.load()

  return documents
}

// export async function pdfFileLoader({
//   path,
//   loaderParams,
// }: { path: string; loaderParams?: FileLoadersParams['pdf'] }) {
//   const pdfSupportedExtensions = ['.pdf']

//   const extension = extname(path)

//   if (!pdfSupportedExtensions.includes(extension)) {
//     throw new Error(`Unsupported PDF file type: "${extension}"`)
//   }

//   const loader = fileLoaders({ pdf: loaderParams })[extension as '.pdf']?.(path)

//   if (!loader) {
//     throw new Error(`Loader not found for PDF file type: "${extension}"`)
//   }

//   const documents = await loader.load()

//   return documents
// }
