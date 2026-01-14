import { SignOutLink } from '@/components/auth/sign-out-link'
import { authenticatedUser } from '@/lib/auth/server'
import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  BookIcon,
  ChevronDownIcon,
  LogOutIcon,
  MessageSquareMoreIcon,
} from 'lucide-react'
import Link from 'next/link'

export async function ProfileButton() {
  const { user } = await authenticatedUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <Avatar className="size-8">
            {user.image && <AvatarImage src={user.image} />}
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[200px]">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium text-foreground text-sm">
            {user.name}
          </span>
          <span className="truncate font-normal text-muted-foreground text-xs">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/">Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/settings">Account settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="https://docs.niceyup.com" target="_blank">
              Documentation
              <BookIcon className="ml-auto" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="mailto:hello@niceyup.team">
              Support
              <MessageSquareMoreIcon className="ml-auto" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <SignOutLink>
              Sign out
              <LogOutIcon className="ml-auto" />
            </SignOutLink>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
