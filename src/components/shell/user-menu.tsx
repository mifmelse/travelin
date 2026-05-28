'use client'

import { LogOut, User, Settings } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { avatarInitials } from '@/lib/avatar'
import { cn } from '@/lib/utils'

type UserMenuProps = {
  displayName: string | null
  email: string | null
  variant?: 'icon' | 'compact'
  className?: string
}

export function UserMenu({
  displayName,
  email,
  variant = 'compact',
  className,
}: UserMenuProps) {
  const initials = avatarInitials(displayName ?? email)
  const label = displayName ?? email ?? 'Akun'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-2 rounded-lg text-sm transition-colors hover:bg-muted',
          variant === 'icon' ? 'h-9 w-9 justify-center' : 'px-2 py-1.5',
          className
        )}
        aria-label="Akun"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {initials}
        </span>
        {variant === 'compact' ? (
          <span className="hidden md:inline truncate max-w-[8rem] text-muted-foreground">
            {label}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {displayName ?? 'Traveler'}
              </span>
              {email ? (
                <span className="text-xs text-muted-foreground truncate">
                  {email}
                </span>
              ) : null}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
