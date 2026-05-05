import { resend } from './resend'
import { sendEmail } from './send'

export const email = {
  ...sendEmail,
  resend,
}
