import { type CookiesFn, getCookie as getCookieNext } from 'cookies-next'

export async function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (typeof window === 'undefined') {
    const { headers: serverHeaders } = await import('next/headers')

    const headersCookies = (await serverHeaders()).get('cookie')

    return { ...headers, Cookie: headersCookies || '' }
  }

  return headers
}

async function getCookieStore(): Promise<CookiesFn | undefined> {
  if (typeof window === 'undefined') {
    const { cookies: serverCookies } = await import('next/headers')

    return serverCookies
  }
}

export async function getCookie(key: string): Promise<string | undefined> {
  const cookieStore = await getCookieStore()

  return await getCookieNext(key, { cookies: cookieStore })
}
