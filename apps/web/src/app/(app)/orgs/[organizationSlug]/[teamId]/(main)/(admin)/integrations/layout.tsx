import { Sidebar, type SidebarItem } from '@/components/sidebar'
import type { OrganizationTeamParams } from '@/lib/types'
import { cn } from '@workspace/ui/lib/utils'
import { SquareArrowOutUpRightIcon } from 'lucide-react'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  const { organizationSlug } = await params

  const items: SidebarItem[] = [
    {
      label: 'Model Providers',
      href: `/orgs/${organizationSlug}/~/integrations/model-providers`,
    },
    {
      label: 'Vector Stores',
      href: `/orgs/${organizationSlug}/~/integrations/vector-stores`,
    },
    {
      label: 'Connections',
      href: `/orgs/${organizationSlug}/~/integrations/connections`,
    },
    {
      label: 'MCP Servers',
      href: `/orgs/${organizationSlug}/~/integrations/mcp-servers`,
    },
    {
      label: 'Documentation',
      href: 'https://docs.niceyup.com/sources',
      target: '_blank',
      icon: <SquareArrowOutUpRightIcon className="ml-auto" />,
    },
  ]

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div
          className={cn(
            'mx-auto flex max-w-5xl flex-col items-start gap-4',
            'justify-between md:flex-row md:items-center',
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Integrations</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Connect model providers, services, and tools to power your AI
                agents.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 lg:flex-row">
          <div
            className={cn(
              'flex w-full flex-col gap-1 lg:w-55',
              'lg:sticky lg:top-[58px] lg:self-start',
            )}
          >
            <Sidebar items={items} />
          </div>

          <div
            className={cn(
              'flex w-full flex-1 flex-col gap-4',
              'lg:sticky lg:top-[58px] lg:self-start',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
