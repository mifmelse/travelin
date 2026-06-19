'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { register, type AuthState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const initialState: AuthState = {}

function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect_to') ?? ''

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to travelin</CardTitle>
        <CardDescription>Bikin akun, mulai rencanain trip lo</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <CardContent className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nama (opsional)</Label>
            <Input id="displayName" name="displayName" placeholder="Nama panggilan" />
            {state.fieldErrors?.displayName && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.displayName[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="kamu@email.com" required />
            {state.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="Min 8 karakter" required />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Loading...' : 'Daftar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Udah punya akun?{' '}
            <Link
              href={redirectTo ? `/login?redirect_to=${encodeURIComponent(redirectTo)}` : '/login'}
              className="underline"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
