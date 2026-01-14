import { getInvitation } from '@/actions/invitations'
import { Header } from '@/components/header'
import { authenticatedUser } from '@/lib/auth/server'
import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@workspace/ui/components/card'
import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { InitationActions } from './_components/initation-actions'

export default async function Page({
  params,
}: {
  params: Promise<{ invitationId: string }>
}) {
  const { invitationId } = await params

  const invitation = await getInvitation({ invitationId })

  if (!invitation) {
    return (
      <>
        <Header selectedOrganizationLabel="Not found" />

        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <h1 className="font-bold text-xl">404 - Invitation Not Found</h1>
            <span className="text-muted-foreground text-sm">
              Oops! The invitation you are looking for does not exist or you
              don&apos;t have access to it.
            </span>

            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </main>
      </>
    )
  }

  const { user } = await authenticatedUser()

  return (
    <>
      <Header selectedOrganizationLabel="Onboarding" />

      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="w-full max-w-xl p-4">
          <Card>
            <CardHeader>
              <div className="mx-auto flex flex-row items-center justify-center gap-4">
                <Avatar className="size-12">
                  {user.image && <AvatarImage src={user.image} />}
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <PlusIcon className="size-4 text-muted-foreground" />

                <Avatar className="size-12">
                  {invitation.organization.logo && (
                    <AvatarImage src={invitation.organization.logo} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(invitation.organization.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <h1 className="text-center font-medium text-xl leading-none">
                Join <strong>{invitation.organization.name}</strong> on{' '}
                <strong>Niceyup</strong>
              </h1>
            </CardHeader>

            <CardContent>
              <p className="text-balance text-center text-sm leading-relaxed">
                <strong>{invitation.inviter.name}</strong> (
                {invitation.inviter.email}) has invited you the{' '}
                <strong>{invitation.organization.name}</strong> organization on{' '}
                <strong>Niceyup</strong> with the{' '}
                <strong>{invitation.role}</strong> role.
              </p>
            </CardContent>

            <CardFooter>
              <InitationActions
                invitationId={invitationId}
                organizationSlug={invitation.organization.slug}
              />
            </CardFooter>
          </Card>
        </div>
      </main>
    </>
  )
}
