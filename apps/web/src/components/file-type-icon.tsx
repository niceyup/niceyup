import {
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
} from 'lucide-react'

function getFileTypeIcon(fileName: string, fileType: string) {
  if (
    fileType.includes('pdf') ||
    fileName.endsWith('.pdf') ||
    fileType.includes('word') ||
    fileName.endsWith('.doc') ||
    fileName.endsWith('.docx')
  ) {
    return FileTextIcon
  }

  if (
    fileType.includes('zip') ||
    fileType.includes('archive') ||
    fileName.endsWith('.zip') ||
    fileName.endsWith('.rar')
  ) {
    return FileArchiveIcon
  }

  if (
    fileType.includes('excel') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsx')
  ) {
    return FileSpreadsheetIcon
  }

  if (fileType.includes('video/')) {
    return VideoIcon
  }

  if (fileType.includes('audio/')) {
    return HeadphonesIcon
  }

  if (fileType.startsWith('image/')) {
    return ImageIcon
  }

  return FileIcon
}

export function FileTypeIcon({
  file,
  ...props
}: {
  file: File | { type: string; name: string }
} & React.ComponentProps<'svg'>) {
  const FileTypeIcon = getFileTypeIcon(file.name, file.type)

  return <FileTypeIcon {...props} />
}
