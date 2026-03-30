import { CirclePlusIcon } from 'lucide-react'

export const availableMcpServers = {
  'custom-mcp': {
    value: 'custom-mcp' as const,
    label: 'Custom MCP',
    description: 'Add MCP server details manually.',
    icon: <CirclePlusIcon className="size-4" />,
  },
}

export type AvailableMcpServer = typeof availableMcpServers
