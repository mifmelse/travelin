import { format, parseISO } from 'date-fns'
import { DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listExpensesForTrip } from '@/services/expense.service'
import { listTripMembers } from '@/services/member.service'
import { getTripById } from '@/services/trip.service'
import { formatCurrency } from '@/lib/format'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { ItemRow } from '@/components/ui/item-row'
import { NewExpenseDialog } from '@/components/features/expense/new-expense-dialog'
import { ExpenseActionsMenu } from '@/components/features/expense/expense-actions-menu'
import { ExpenseTotals } from '@/components/features/expense/expense-totals'
import { BalanceSummary } from '@/components/features/expense/balance-summary'
import {
  expenseCategoryMeta,
  type ExpenseCategory,
} from '@/components/features/expense/expense-meta'
import type { Expense } from '@/components/features/expense/edit-expense-dialog'
import type { SplitMember } from '@/components/features/expense/split-editor'

function dateLabel(value: string | null): string | undefined {
  return value ? format(parseISO(value), 'd MMM yyyy') : undefined
}

export default async function TripExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [trip, expensesData, membersData] = await Promise.all([
    getTripById(supabase, id, user.id),
    listExpensesForTrip(supabase, id, user.id),
    listTripMembers(supabase, id, user.id),
  ])

  const baseCurrency = trip?.base_currency ?? 'IDR'
  const expenses = (expensesData ?? []) as Expense[]
  const members: SplitMember[] = membersData.map((m) => ({
    profile_id: m.profile_id,
    display_name: m.display_name,
  }))

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Expenses"
        action={
          <NewExpenseDialog
            tripId={id}
            members={members}
            currentUserId={user.id}
            baseCurrency={baseCurrency}
          />
        }
      />

      {expenses.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Belum ada expense"
          description="Pengeluaran trip lo bakal tercatat di sini, multi-currency."
        />
      ) : (
        <>
          <ExpenseTotals expenses={expenses} baseCurrency={baseCurrency} />

          <BalanceSummary
            tripId={id}
            expenses={expenses}
            members={members}
          />

          <div className="space-y-2">
            {expenses.map((expense) => {
              const meta = expenseCategoryMeta(
                expense.category as ExpenseCategory
              )
              return (
                <ItemRow
                  key={expense.id}
                  icon={meta.icon}
                  iconTone={meta.tone}
                  time={dateLabel(expense.occurred_at)}
                  title={expense.description || meta.label}
                  subtitle={formatCurrency(
                    expense.amount_cents,
                    expense.currency
                  )}
                  actions={
                    <ExpenseActionsMenu
                      expense={expense}
                      members={members}
                      baseCurrency={baseCurrency}
                    />
                  }
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
