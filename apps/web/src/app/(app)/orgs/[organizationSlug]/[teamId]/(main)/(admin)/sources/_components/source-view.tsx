'use client'

import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@workspace/ui/components/drawer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query'
import { cn } from '@workspace/ui/lib/utils'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId?: AgentParams['agentId']
}

export function SourceView({
  params,
  sourceId,
  open,
  onOpenChange,
}: {
  params: Params
  sourceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <>
      {isDesktop && (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Source View</SheetTitle>
              <SheetDescription>View the source here.</SheetDescription>
            </SheetHeader>
            <SourceViewContent
              params={params}
              sourceId={sourceId}
              className="px-4"
            />
          </SheetContent>
        </Sheet>
      )}

      {!isDesktop && (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="h-full">
            <DrawerHeader className="text-left">
              <DrawerTitle>Source View</DrawerTitle>
              <DrawerDescription>View the source here.</DrawerDescription>
            </DrawerHeader>
            <SourceViewContent
              params={params}
              sourceId={sourceId}
              className="px-4"
            />
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}

export function SourceViewContent({
  params,
  sourceId,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  params: Params
  sourceId: string
}) {
  return (
    <div className={cn(className)} {...props}>
      <p className="py-24 text-center text-muted-foreground text-xs">
        Coming soon ({sourceId})
      </p>
    </div>
  )
}

// function SourceViewAlertIngesting({
//   params,
//   sourceId,
// }: {
//   params: Params
//   sourceId: string
// }) {
//   const [isPending, startTransition] = React.useTransition()

//   const handleCancel = () => {
//     startTransition(async () => {
//       try {
//         const { error } = await sdk.cancelSource({
//           headers: {
//             'x-organization-slug': params.organizationSlug,
//           },
//           sourceId,
//           data: {},
//         })

//         if (error) {
//           toast.error(error.message)
//           return
//         }

//         toast.success('Source cancellation started')
//       } catch {
//         toast.error('Failed to start source cancellation')
//       }
//     })
//   }

//   return (
//     <Alert>
//       <Spinner />
//       <AlertTitle>Ingesting Source</AlertTitle>
//       <AlertDescription>
//         This source is currently being ingested. You can cancel this operation
//         at any time.
//       </AlertDescription>
//       <AlertAction>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={handleCancel}
//           disabled={isPending}
//         >
//           {isPending && <Spinner />}
//           Cancel
//         </Button>
//       </AlertAction>
//     </Alert>
//   )
// }
