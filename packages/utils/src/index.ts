import { uuidv7 } from 'uuidv7'

export const generateId = (): string => uuidv7()

export function stripSpecialCharacters(inputString: string) {
  // Remove special characters and spaces, keep alphanumeric, hyphens/underscores, and dots
  return inputString
    .replace(/[^a-zA-Z0-9-_\s.]/g, '') // Remove special chars except hyphen/underscore/dot
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase() // Convert to lowercase for consistency
}

export function validateSlug(inputString: string): boolean {
  return /^[a-z0-9-]+$/.test(inputString)
}
