import { ConfettiSideCannons } from '@/components/confetti-side-cannons'
import { Header } from '@/components/header'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import Link from 'next/link'

export default async function Page() {
  return (
    <>
      <Header selectedOrganizationLabel="Onboarding" />

      <main className="relative flex flex-1 flex-col bg-background">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-4">
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
            <Skeleton className="aspect-video" />
          </div>
          <Skeleton className="mx-auto max-h-300 w-full max-w-5xl flex-1" />
        </div>

        <div className="absolute flex h-full max-h-300 w-full items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-5 rounded-lg border border-border bg-background p-5">
            <h2 className="font-bold text-xl">Success!</h2>

            <p className="text-foreground text-sm leading-relaxed">
              Your order was successfully!
            </p>

            <p className="text-foreground text-sm leading-relaxed">
              Thank you very much for accessing <strong>Niceyup</strong>! We
              will do our best to implement new features and we appreciate your
              support.
            </p>

            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>

      <ConfettiSideCannons />
    </>
  )
}
