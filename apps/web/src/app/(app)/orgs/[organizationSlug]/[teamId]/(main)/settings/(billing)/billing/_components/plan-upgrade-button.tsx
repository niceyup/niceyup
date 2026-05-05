'use client'

import { Button } from '@workspace/ui/components/button'
import { toast } from 'sonner'

export function PlanUpgradeButton() {
  const handleUpgrade = async () => {
    toast.info('Coming soon')
  }

  return <Button onClick={handleUpgrade}>Upgrade</Button>
}
