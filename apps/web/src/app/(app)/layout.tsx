import { checkAccess } from '../access-required/_actions/check-access'
import { UploadLocalFileSourceOverlay } from './orgs/[organizationSlug]/[teamId]/(main)/(admin)/sources/create/_components/upload-local-file-source-overlay'

export default async function Layout({
  children,
  modals,
}: Readonly<{
  children: React.ReactNode
  modals: React.ReactNode
}>) {
  await checkAccess()

  return (
    <>
      <div className="flex min-h-svh flex-col items-stretch justify-center bg-foreground/3">
        {children}
      </div>

      {modals}

      <UploadLocalFileSourceOverlay />
    </>
  )
}
