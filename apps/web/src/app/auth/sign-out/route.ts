import { auth } from '@workspace/auth'
import {
  COOKIE_SESSION_TOKEN_NAME,
  DOMAIN_COOKIES,
  ENABLE_SECURE_COOKIES,
} from '@workspace/auth/constants'
import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/auth/sign-in'

  try {
    // Delete session token from database
    await auth.api.signOut({
      headers: await headers(),
    })
  } catch {}

  const response = NextResponse.redirect(redirectUrl)

  response.cookies.delete({
    name: COOKIE_SESSION_TOKEN_NAME,
    domain: DOMAIN_COOKIES,
    secure: ENABLE_SECURE_COOKIES,
  })

  return response
}
