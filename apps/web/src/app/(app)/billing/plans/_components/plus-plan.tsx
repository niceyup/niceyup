'use client'

import { Button } from '@workspace/ui/components/button'
import { CheckCircleIcon } from 'lucide-react'

const features = [
  'Full access to all features',
  '$5 included in AI usage',
  'Pay only for additional usage',
  'Priority support',
]

export function PlusPlan() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-5 rounded-lg border border-border bg-background p-5">
      <h2 className="font-bold text-xl">Plus Plan</h2>

      <p className="text-foreground text-sm leading-relaxed">
        The Plus plan is the best way to get started with Niceyup.
      </p>

      <h1 className="font-bold text-3xl">
        $10 <span className="text-muted-foreground text-sm">/month</span>
      </h1>

      <Button disabled>Get Started</Button>

      <ul className="flex flex-col gap-2">
        {features.map((feature) => (
          <li className="flex items-start gap-2" key={feature}>
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />

            <span className="text-foreground text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
