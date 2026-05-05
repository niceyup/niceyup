import { sendOrganizationInvitation } from './organization-invitation'
import { sendPasswordResetEmail } from './reset-password'
import { sendVerificationEmail } from './verification-email'

export const sendEmail = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrganizationInvitation,
}
