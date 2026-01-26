'use client'

import type { OrganizationTeamParams } from '@/lib/types'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Button } from '@workspace/ui/components/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@workspace/ui/components/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { useIsMobile } from '@workspace/ui/hooks/use-mobile'
import { cn } from '@workspace/ui/lib/utils'
import { SlashIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

const ITEMS_TO_DISPLAY = 3

export function BreadcrumbFile({
  params,
  className,
  items,
}: {
  params: Params
  className?: string
  items: {
    label: React.ReactNode | string
    folderId?: string
  }[]
}) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  if (!items.length) {
    return null
  }

  if (ITEMS_TO_DISPLAY < 2) {
    throw new Error('ITEMS_TO_DISPLAY must be at least 2')
  }

  const middleItems = items.slice(1, -(ITEMS_TO_DISPLAY - 1))

  const endItems = items.slice(
    items.length < ITEMS_TO_DISPLAY ? 1 : items.length - (ITEMS_TO_DISPLAY - 1),
  )

  function navigateTo(folderId?: string) {
    return `/orgs/${params.organizationSlug}/~/sources${folderId ? `?folderId=${folderId}` : ''}`
  }

  const separator = (
    <BreadcrumbSeparator className="[&>svg]:size-3">
      <SlashIcon className="-rotate-[24deg]" />
    </BreadcrumbSeparator>
  )

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={navigateTo(items[0]?.folderId)}>
              {items[0]?.label || 'Home'}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {separator}

        {items.length > ITEMS_TO_DISPLAY ? (
          <>
            <BreadcrumbItem>
              {!isMobile ? (
                <DropdownMenu open={open} onOpenChange={setOpen}>
                  <DropdownMenuTrigger className="flex items-center gap-1">
                    <BreadcrumbEllipsis className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {middleItems.map((item, index) => (
                      <DropdownMenuItem
                        key={`${item.label}-${index}`}
                        className={cn({ italic: !item.label })}
                        asChild
                      >
                        <Link href={navigateTo(item.folderId)}>
                          {item.label || 'Unnamed folder'}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Drawer open={open} onOpenChange={setOpen}>
                  <DrawerTrigger>
                    <BreadcrumbEllipsis className="size-4" />
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader className="text-left">
                      <DrawerTitle>Navigate to</DrawerTitle>
                      <DrawerDescription>
                        Select a page to navigate to
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="grid gap-1 px-4">
                      {middleItems.map((item, index) => (
                        <Link
                          key={`${item.folderId}-${index}`}
                          href={navigateTo(item.folderId)}
                          className={cn('py-1 text-xs', {
                            italic: !item.label,
                          })}
                        >
                          {item.label || 'Unnamed folder'}
                        </Link>
                      ))}
                    </div>
                    <DrawerFooter className="pt-4">
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              )}
            </BreadcrumbItem>
            {separator}
          </>
        ) : null}
        {endItems.map((item, index) => (
          <React.Fragment key={`${item.folderId}-${index}`}>
            <BreadcrumbItem>
              {item.folderId ? (
                <BreadcrumbLink
                  asChild
                  className={cn('truncate', { italic: !item.label })}
                >
                  <Link href={navigateTo(item.folderId)}>
                    {item.label || 'Unnamed folder'}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage
                  className={cn('truncate', { italic: !item.label })}
                >
                  {item.label || 'Unnamed folder'}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < endItems.length - 1 && <>{separator}</>}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
