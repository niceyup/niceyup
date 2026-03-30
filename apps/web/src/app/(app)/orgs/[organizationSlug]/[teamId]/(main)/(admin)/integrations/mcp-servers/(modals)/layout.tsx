import type { OrganizationTeamParams } from '@/lib/types'
import Page from '../page'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  return (
    <>
      <Page params={params} />
      {children}
    </>
  )
}
