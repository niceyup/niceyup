'use client'

import { authClient } from '@/lib/auth/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@workspace/ui/components/form'

import { updateTag } from '@/actions/cache'
import type { listTeams } from '@/actions/teams'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@workspace/ui/components/command'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Separator } from '@workspace/ui/components/separator'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { CheckIcon, ChevronsUpDownIcon, MailIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  organizationId: string
}

type Team = Awaited<ReturnType<typeof listTeams>>[number]

const formSchema = z.object({
  email: z.email().trim(),
  role: z.enum(['member', 'admin', 'billing']),
  teamId: z.string().optional(),
})

export function InviteMemberDialog({
  params,
  isPremium,
  teams,
  open,
  onOpenChange,
}: {
  params: Params
  isPremium?: boolean
  teams?: Team[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'member',
      teamId: undefined,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await authClient.organization.inviteMember({
      organizationId: params.organizationId,
      email: values.email,
      role: values.role,
      teamId: values.teamId,
    })

    if (data) {
      form.reset()
      toast.success('Member invited successfully')
      onOpenChange(false)
      await updateTag('invite-member')
    }

    if (error) {
      toast.error(error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col items-stretch justify-center gap-4"
          >
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>
                Invite a member to your organization.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormDescription>
                    The email address of the member you want to invite.
                  </FormDescription>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <MailIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        placeholder="davy.jones@example.com"
                        disabled={!isPremium}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-2" />

            <FormField
              control={form.control}
              name="role"
              render={() => (
                <FormItem>
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <FormLabel>Role</FormLabel>
                      <FormDescription>The role of the member.</FormDescription>
                    </div>

                    <RoleSelect disabled={!isPremium} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamId"
              render={() => (
                <FormItem>
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <FormLabel>Team</FormLabel>
                      <FormDescription>
                        The initial team to which the member will be added.
                      </FormDescription>
                    </div>
                    <TeamSelect teams={teams} disabled={!isPremium} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-2" />

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
              </DialogClose>
              {isPremium ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Spinner />}
                  Invite
                </Button>
              ) : (
                <Button type="button" asChild>
                  <Link
                    href={`/orgs/${params.organizationSlug}/~/settings/billing`}
                  >
                    Upgrade Plan
                  </Link>
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function RoleSelect({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false)

  const { getValues, setValue } = useFormContext()
  const { name } = useFormField()

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <FormControl className="col-span-3">
          <Button
            variant="outline"
            className="w-[200px] justify-between capitalize"
            disabled={disabled}
          >
            {getValues(name)}
            <ChevronsUpDownIcon className="shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search" />
          <CommandEmpty>No results found</CommandEmpty>
          <CommandGroup>
            {getValues(name) && (
              <>
                <CommandItem
                  onSelect={() => setOpen(false)}
                  className="capitalize"
                >
                  {getValues(name)}
                  <CheckIcon className="ml-auto shrink-0 opacity-100" />
                </CommandItem>
                <CommandSeparator className="m-1" />
              </>
            )}

            {['member', 'admin', 'billing']
              .filter((value) => value !== getValues(name))
              .map((value) => (
                <CommandItem
                  key={value}
                  value={value}
                  onSelect={() => {
                    setValue(name, value, { shouldDirty: true })
                    setOpen(false)
                  }}
                  className="capitalize"
                >
                  {value}
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function TeamSelect({
  teams,
  disabled,
}: {
  teams?: { id: string; name: string }[]
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  const { getValues, setValue } = useFormContext()
  const { name } = useFormField()

  const selectedTeam = teams?.find(({ id }) => id === getValues(name))

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <FormControl className="col-span-3">
          <Button
            variant="outline"
            className={cn(
              'w-[200px] justify-between',
              !getValues(name) && 'text-muted-foreground',
            )}
            disabled={disabled}
          >
            {selectedTeam ? selectedTeam.name : 'Select a team'}
            <ChevronsUpDownIcon className="shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search" />
          <CommandEmpty>No results found</CommandEmpty>
          <CommandGroup>
            {selectedTeam && (
              <>
                <CommandItem onSelect={() => setOpen(false)}>
                  {selectedTeam.name}
                  <CheckIcon className="ml-auto shrink-0 opacity-100" />
                </CommandItem>
                <CommandSeparator className="m-1" />
              </>
            )}

            {teams
              ?.filter(({ id }) => id !== selectedTeam?.id)
              .map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.name}
                  onSelect={() => {
                    setValue(name, team.id, { shouldDirty: true })
                    setOpen(false)
                  }}
                >
                  {team.name}
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
