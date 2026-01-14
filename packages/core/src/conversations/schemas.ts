import { z } from 'zod'

export const conversationVisibilitySchema = z.enum([
  'private',
  'shared',
  'team',
])
