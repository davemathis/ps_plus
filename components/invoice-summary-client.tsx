"use client"

import { useEffect, useRef, useState } from "react"
import { PauseCircle, PlayCircle, X } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { InvoiceDetailRecord } from "@/lib/azure-sql"

type InvoiceCustomerGroup = {
  customerName: string
  total: number
  rows: InvoiceDetailRecord[]
}

type WalkthroughBucket = {
  refNumber: string
  earnedDate: string
  expirationDate: string
  originalAmount: number
  remainingAmount: number
}

type WalkthroughStep = {
  title: string
  eventDate: string
  description: string
  earnedAmount: number
  spentAmount: number
  expiredAmount: number
  cumulativeEarnedAmount: number
  cumulativeSpentAmount: number
  cumulativeExpiredAmount: number
  availableBalance: number
  buckets: WalkthroughBucket[]
}

type CustomerChartPoint = {
  monthLabel: string
  sortDate: number
  invoiceAmt: number
  creditAmt: number
  expiredCredits: number
  futureExpiringCredits: number
}

const customerChartConfig = {
  invoiceAmt: {
    label: "Earned Amount",
    color: "#0f766e",
  },
  creditAmt: {
    label: "Spent Credits",
    color: "#2563eb",
  },
  expiredCredits: {
    label: "Expired Credits",
    color: "#dc2626",
  },
  futureExpiringCredits: {
    label: "Future Expiring Credits",
    color: "#ca8a04",
  },
} satisfies ChartConfig

export function InvoiceSummaryClient({
  groups,
}: {
  groups: InvoiceCustomerGroup[]
}) {
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({})
  const [selectedGroup, setSelectedGroup] = useState<InvoiceCustomerGroup | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const activeTimelineItemRef = useRef<HTMLButtonElement | null>(null)
  const walkthrough = selectedGroup ? buildWalkthrough(selectedGroup.rows) : null
  const totalSteps = walkthrough?.steps.length ?? 0

  useEffect(() => {
    if (!selectedGroup || !isPlaying || totalSteps <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setCurrentStepIndex((previousIndex) => {
        if (previousIndex >= totalSteps - 1) {
          setIsPlaying(false)
          return previousIndex
        }

        return previousIndex + 1
      })
    }, 2200)

    return () => window.clearInterval(timer)
  }, [isPlaying, selectedGroup, totalSteps])

  useEffect(() => {
    activeTimelineItemRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    })
  }, [currentStepIndex])

  const activeStep =
    walkthrough && walkthrough.steps.length > 0
      ? walkthrough.steps[Math.min(currentStepIndex, walkthrough.steps.length - 1)]
      : null

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
        No invoice rows were returned for the selected fiscal period.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => {
          const summary = getCustomerSummary(group.rows)

          return (
          <details
            key={group.customerName}
            open={expandedCustomers[group.customerName] ?? false}
            onToggle={(event) => {
              const isOpen = (event.currentTarget as HTMLDetailsElement).open
              setExpandedCustomers((previousState) => ({
                ...previousState,
                [group.customerName]: isOpen,
              }))
            }}
            className="overflow-hidden rounded-lg border bg-background"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:hidden">
              <div>
                <div className="font-medium">{group.customerName}</div>
                <div className="text-xs text-muted-foreground">
                  {group.rows.length} invoice row{group.rows.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setCurrentStepIndex(0)
                    setIsPlaying(false)
                    setSelectedGroup(group)
                  }}
                >
                  <PlayCircle className="size-4" />
                  Show Me
                </Button>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    PS+ Available
                  </div>
                  <div className="font-semibold">{formatCurrency(summary.available)}</div>
                </div>
              </div>
            </summary>
            <div className="border-t bg-muted/10 p-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="mb-4 flex w-full gap-1">
                  <SummaryCard
                    label="Available"
                    value={formatCurrency(summary.available)}
                    color="#ffffff"
                  />
                  <SummaryCard
                    label="Earned"
                    value={formatCurrency(summary.earned)}
                    color="#0f766e"
                  />
                  <SummaryCard
                    label="Spent"
                    value={formatCurrency(summary.spent)}
                    color="#2563eb"
                  />
                  <SummaryCard
                    label="Expired"
                    value={formatCurrency(summary.expired)}
                    color="#dc2626"
                  />
                  <SummaryCard
                    label="Exp. 90 Days"
                    value={formatCurrency(summary.expiringSoon)}
                    color="#ca8a04"
                  />
                </div>
                <div className="mb-4">
                  <div className="text-sm font-medium">Monthly Activity</div>
                  <div className="text-xs text-muted-foreground">
                    Invoice, credit, and expired credit amounts by invoice month.
                  </div>
                </div>
                {expandedCustomers[group.customerName] ? (
                  <CustomerAreaChart rows={group.rows} />
                ) : null}
              </div>
            </div>
          </details>
          )
        })}
      </div>
      {selectedGroup && walkthrough && activeStep ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  How PS+ Changes for {selectedGroup.customerName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Step {Math.min(currentStepIndex + 1, totalSteps)} of {totalSteps}. The walkthrough
                  applies credits to the oldest earned balance first and expires unused earnings one
                  year after the last day of the earned month.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsPlaying(false)
                  setSelectedGroup(null)
                }}
                aria-label="Close walkthrough"
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
              <div className="overflow-y-auto p-6">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Current Step
                  </div>
                  <div className="mt-3 text-lg font-semibold">{activeStep.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {activeStep.eventDate} - {activeStep.description}
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <MetricCard
                      label="Earned Total"
                      value={formatCurrency(activeStep.cumulativeEarnedAmount)}
                    />
                    <MetricCard
                      label="Spent Total"
                      value={formatCurrency(activeStep.cumulativeSpentAmount)}
                    />
                    <MetricCard
                      label="Expired Total"
                      value={formatCurrency(activeStep.cumulativeExpiredAmount)}
                    />
                    <MetricCard
                      label="Available After Step"
                      value={formatCurrency(activeStep.availableBalance)}
                    />
                  </div>
                </div>
                <div className="mt-6 rounded-xl border">
                  <div className="border-b px-4 py-3">
                    <div className="text-sm font-medium">Balances Still Available</div>
                    <div className="text-xs text-muted-foreground">
                      Remaining earned buckets after the current step.
                    </div>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">RefNumber</th>
                          <th className="px-4 py-3 text-left font-medium">Earned</th>
                          <th className="px-4 py-3 text-left font-medium">Expires</th>
                          <th className="px-4 py-3 text-right font-medium">Original</th>
                          <th className="px-4 py-3 text-right font-medium">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeStep.buckets.length > 0 ? (
                          activeStep.buckets.map((bucket) => (
                            <tr key={`${bucket.refNumber}-${bucket.expirationDate}`} className="border-t">
                              <td className="px-4 py-3">{bucket.refNumber}</td>
                              <td className="px-4 py-3">{bucket.earnedDate}</td>
                              <td className="px-4 py-3">{bucket.expirationDate}</td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(bucket.originalAmount)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(bucket.remainingAmount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t">
                            <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                              No remaining earned balance after this step.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="border-l bg-muted/10 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Playback Timeline</div>
                    <div className="text-xs text-muted-foreground">
                      Manual by default. Press play to auto-advance through the timeline.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isPlaying ? "secondary" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsPlaying((previousValue) => !previousValue)}
                    >
                      {isPlaying ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsPlaying(false)
                        setCurrentStepIndex((previousIndex) => Math.max(previousIndex - 1, 0))
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsPlaying(false)
                        setCurrentStepIndex((previousIndex) =>
                          Math.min(previousIndex + 1, totalSteps - 1)
                        )
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {walkthrough.steps.map((step, index) => (
                    <button
                      key={`${step.title}-${index}`}
                      ref={index === currentStepIndex ? activeTimelineItemRef : null}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false)
                        setCurrentStepIndex(index)
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        index === currentStepIndex
                          ? "border-primary bg-background shadow-sm"
                          : "bg-background/70 hover:bg-background"
                      }`}
                    >
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {step.eventDate} - {step.description}
                      </div>
                      <div className="mt-3 text-xs font-medium">
                        Available: {formatCurrency(step.availableBalance)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-muted/20 px-2 py-2">
      <div className="truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-1 truncate whitespace-nowrap text-sm font-semibold leading-tight"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}

function CustomerAreaChart({ rows }: { rows: InvoiceDetailRecord[] }) {
  const data = buildCustomerChartData(rows)

  return (
    <ChartContainer config={customerChartConfig} className="h-72 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillInvoiceAmt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-invoiceAmt)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-invoiceAmt)" stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="fillCreditAmt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-creditAmt)" stopOpacity={0.7} />
            <stop offset="95%" stopColor="var(--color-creditAmt)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillExpiredCredits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-expiredCredits)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-expiredCredits)" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="fillFutureExpiringCredits" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-futureExpiringCredits)"
              stopOpacity={0.75}
            />
            <stop
              offset="95%"
              stopColor="var(--color-futureExpiringCredits)"
              stopOpacity={0.08}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical horizontal={false} strokeOpacity={0.12} />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={72}
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => formatCurrency(Number(value))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              valueFormatter={(value) => formatCurrency(value)}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="natural"
          dataKey="invoiceAmt"
          stroke="var(--color-invoiceAmt)"
          fill="url(#fillInvoiceAmt)"
          strokeWidth={2}
        />
        <Area
          type="natural"
          dataKey="creditAmt"
          stroke="var(--color-creditAmt)"
          fill="url(#fillCreditAmt)"
          strokeWidth={2}
        />
        <Area
          type="natural"
          dataKey="expiredCredits"
          stroke="var(--color-expiredCredits)"
          fill="url(#fillExpiredCredits)"
          strokeWidth={2}
        />
        <Area
          type="natural"
          dataKey="futureExpiringCredits"
          stroke="var(--color-futureExpiringCredits)"
          fill="url(#fillFutureExpiringCredits)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function getCustomerSummary(rows: InvoiceDetailRecord[]) {
  const today = startOfDay(new Date())
  const ninetyDaysFromNow = addDays(today, 90)

  return rows.reduce(
    (totals, row) => {
      totals.earned += row.Invoice_AMT ?? 0
      totals.spent += row.Credit_AMT ?? 0
      totals.expired += row.Expired_Credits ?? 0
      totals.available += getPsPlusCredit(row)

      const invoiceDate = getEffectiveInvoiceDate(row)
      const expirationDate = getExpirationDate(row, invoiceDate)
      const remainingAmount = row.Invoice_AMT_Remaining ?? 0

      if (
        remainingAmount > 0 &&
        startOfDay(expirationDate).getTime() >= today.getTime() &&
        startOfDay(expirationDate).getTime() <= ninetyDaysFromNow.getTime()
      ) {
        totals.expiringSoon += remainingAmount
      }

      return totals
    },
    {
      available: 0,
      earned: 0,
      spent: 0,
      expired: 0,
      expiringSoon: 0,
    }
  )
}

function buildCustomerChartData(rows: InvoiceDetailRecord[]): CustomerChartPoint[] {
  const groupedRows = new Map<
    string,
    {
      sortDate: number
      monthLabel: string
      invoiceAmt: number
      creditAmt: number
      expiredCredits: number
      futureExpiringCredits: number
    }
  >()
  const today = startOfDay(new Date())

  for (const row of rows) {
    const invoiceDate = getEffectiveInvoiceDate(row)
    const invoiceMonthKey = getMonthKey(invoiceDate)
    const invoiceMonthRow = getOrCreateChartMonth(groupedRows, invoiceMonthKey, invoiceDate)
    invoiceMonthRow.invoiceAmt = (invoiceMonthRow.invoiceAmt ?? 0) + (row.Invoice_AMT ?? 0)
    invoiceMonthRow.creditAmt = (invoiceMonthRow.creditAmt ?? 0) + (row.Credit_AMT ?? 0)

    const expiredCredits = row.Expired_Credits ?? 0
    if (expiredCredits > 0) {
      const expirationDate = getExpirationDate(row, invoiceDate)
      const expirationMonthKey = getMonthKey(expirationDate)
      const expirationMonthRow = getOrCreateChartMonth(
        groupedRows,
        expirationMonthKey,
        expirationDate
      )
      expirationMonthRow.expiredCredits =
        (expirationMonthRow.expiredCredits ?? 0) + expiredCredits
    }

    const remainingExpiringAmount = row.Invoice_AMT_Remaining ?? 0
    if (remainingExpiringAmount > 0) {
      const expirationDate = getExpirationDate(row, invoiceDate)

      if (startOfDay(expirationDate).getTime() >= today.getTime()) {
        const expirationMonthKey = getMonthKey(expirationDate)
        const expirationMonthRow = getOrCreateChartMonth(
          groupedRows,
          expirationMonthKey,
          expirationDate
        )
        expirationMonthRow.futureExpiringCredits =
          (expirationMonthRow.futureExpiringCredits ?? 0) + remainingExpiringAmount
      }
    }
  }

  return Array.from(groupedRows.values())
    .sort((leftRow, rightRow) => leftRow.sortDate - rightRow.sortDate)
    .map(
      ({
        sortDate,
        monthLabel,
        invoiceAmt,
        creditAmt,
        expiredCredits,
        futureExpiringCredits,
      }) => ({
        sortDate,
        monthLabel,
        invoiceAmt,
        creditAmt,
        expiredCredits,
        futureExpiringCredits,
      })
    )
}

function getOrCreateChartMonth(
  groupedRows: Map<
    string,
    {
      sortDate: number
      monthLabel: string
      invoiceAmt: number
      creditAmt: number
      expiredCredits: number
      futureExpiringCredits: number
    }
  >,
  monthKey: string,
  date: Date
) {
  const existingRow = groupedRows.get(monthKey)

  if (existingRow) {
    return existingRow
  }

    const nextRow = {
      sortDate: date.getTime(),
      monthLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
      invoiceAmt: 0,
      creditAmt: 0,
      expiredCredits: 0,
      futureExpiringCredits: 0,
    }

  groupedRows.set(monthKey, nextRow)
  return nextRow
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function buildWalkthrough(rows: InvoiceDetailRecord[]) {
  const today = startOfDay(new Date())
  const sortedRows = [...rows].sort((leftRow, rightRow) => {
    const leftDate = getEffectiveInvoiceDate(leftRow).getTime()
    const rightDate = getEffectiveInvoiceDate(rightRow).getTime()

    if (leftDate !== rightDate) {
      return leftDate - rightDate
    }

    return (leftRow.RefNumber ?? "").localeCompare(rightRow.RefNumber ?? "")
  })

  const buckets: Array<{
    refNumber: string
    earnedDate: Date
    expirationDate: Date
    originalAmount: number
    remainingAmount: number
  }> = []
  const steps: WalkthroughStep[] = []
  let cumulativeEarnedAmount = 0
  let cumulativeSpentAmount = 0
  let cumulativeExpiredAmount = 0
  const totals = {
    cumulativeEarnedAmount,
    cumulativeSpentAmount,
    cumulativeExpiredAmount,
  }

  for (const row of sortedRows) {
    const eventDate = getEffectiveInvoiceDate(row)
    totals.cumulativeEarnedAmount = cumulativeEarnedAmount
    totals.cumulativeSpentAmount = cumulativeSpentAmount
    totals.cumulativeExpiredAmount = cumulativeExpiredAmount
    expireBucketsThroughDate(buckets, eventDate, steps, totals)
    cumulativeExpiredAmount = totals.cumulativeExpiredAmount

    const earnedAmount = row.Invoice_AMT ?? 0
    if (earnedAmount > 0) {
      cumulativeEarnedAmount += earnedAmount
      totals.cumulativeEarnedAmount = cumulativeEarnedAmount
      buckets.push({
        refNumber: row.RefNumber ?? "Unknown",
        earnedDate: eventDate,
        expirationDate: getExpirationDate(row, eventDate),
        originalAmount: earnedAmount,
        remainingAmount: earnedAmount,
      })

      steps.push(
        createWalkthroughStep(
          `Earned ${formatCurrency(earnedAmount)}`,
          eventDate,
          `Invoice ${row.RefNumber ?? "Unknown"} adds PS+ earned.`,
          earnedAmount,
          0,
          0,
          cumulativeEarnedAmount,
          cumulativeSpentAmount,
          cumulativeExpiredAmount,
          buckets
        )
      )
    }

    const creditAmount = row.Credit_AMT ?? 0
    if (creditAmount > 0) {
      cumulativeSpentAmount += creditAmount
      totals.cumulativeSpentAmount = cumulativeSpentAmount
      let remainingCreditToApply = creditAmount

      for (const bucket of buckets) {
        if (remainingCreditToApply <= 0) {
          break
        }

        if (bucket.remainingAmount <= 0) {
          continue
        }

        const amountApplied = Math.min(bucket.remainingAmount, remainingCreditToApply)
        bucket.remainingAmount -= amountApplied
        remainingCreditToApply -= amountApplied
      }

      steps.push(
        createWalkthroughStep(
          `Spent ${formatCurrency(creditAmount)}`,
          eventDate,
          `Credit ${row.RefNumber ?? "Unknown"} reduces the oldest available PS+ balances first.`,
          0,
          creditAmount,
          0,
          cumulativeEarnedAmount,
          cumulativeSpentAmount,
          cumulativeExpiredAmount,
          buckets
        )
      )
    }
  }

  totals.cumulativeEarnedAmount = cumulativeEarnedAmount
  totals.cumulativeSpentAmount = cumulativeSpentAmount
  totals.cumulativeExpiredAmount = cumulativeExpiredAmount
  expireBucketsThroughDate(buckets, addDays(today, 1), steps, totals)
  cumulativeExpiredAmount = totals.cumulativeExpiredAmount

  if (steps.length === 0) {
    steps.push(
      createWalkthroughStep(
        "No Activity",
        formatDate(today),
        "There are no invoice or credit rows available for this customer in the selected period.",
        0,
        0,
        0,
        cumulativeEarnedAmount,
        cumulativeSpentAmount,
        cumulativeExpiredAmount,
        buckets
      )
    )
  }

  return { steps }
}

function expireBucketsThroughDate(
  buckets: Array<{
    refNumber: string
    earnedDate: Date
    expirationDate: Date
    originalAmount: number
    remainingAmount: number
  }>,
  thresholdDate: Date,
  steps: WalkthroughStep[],
  totals: {
    cumulativeEarnedAmount: number
    cumulativeSpentAmount: number
    cumulativeExpiredAmount: number
  }
) {
  for (const bucket of buckets) {
    if (bucket.remainingAmount <= 0) {
      continue
    }

    if (startOfDay(bucket.expirationDate).getTime() >= startOfDay(thresholdDate).getTime()) {
      continue
    }

    const expiredAmount = bucket.remainingAmount
    bucket.remainingAmount = 0
    totals.cumulativeExpiredAmount += expiredAmount

    steps.push(
      createWalkthroughStep(
        `Expired ${formatCurrency(expiredAmount)}`,
        bucket.expirationDate,
        `Any unused balance from invoice ${bucket.refNumber} expires one year after the earned month ended.`,
        0,
        0,
        expiredAmount,
        totals.cumulativeEarnedAmount,
        totals.cumulativeSpentAmount,
        totals.cumulativeExpiredAmount,
        buckets
      )
    )
  }
}

function createWalkthroughStep(
  title: string,
  eventDate: Date | string,
  description: string,
  earnedAmount: number,
  spentAmount: number,
  expiredAmount: number,
  cumulativeEarnedAmount: number,
  cumulativeSpentAmount: number,
  cumulativeExpiredAmount: number,
  buckets: Array<{
    refNumber: string
    earnedDate: Date
    expirationDate: Date
    originalAmount: number
    remainingAmount: number
  }>
): WalkthroughStep {
  const activeBuckets = buckets
    .filter((bucket) => bucket.remainingAmount > 0)
    .map((bucket) => ({
      refNumber: bucket.refNumber,
      earnedDate: formatDate(bucket.earnedDate),
      expirationDate: formatDate(bucket.expirationDate),
      originalAmount: bucket.originalAmount,
      remainingAmount: bucket.remainingAmount,
    }))

  return {
    title,
    eventDate: typeof eventDate === "string" ? eventDate : formatDate(eventDate),
    description,
    earnedAmount,
    spentAmount,
    expiredAmount,
    cumulativeEarnedAmount,
    cumulativeSpentAmount,
    cumulativeExpiredAmount,
    availableBalance: activeBuckets.reduce(
      (totalBalance, bucket) => totalBalance + bucket.remainingAmount,
      0
    ),
    buckets: activeBuckets,
  }
}

function getEffectiveInvoiceDate(row: InvoiceDetailRecord) {
  const parsedDate = parseDate(row.Invoice_Date)
  return parsedDate ?? startOfDay(new Date())
}

function getExpirationDate(row: InvoiceDetailRecord, earnedDate: Date) {
  const explicitExpiration = parseDate(row.Expiration_Date)

  if (explicitExpiration) {
    return explicitExpiration
  }

  return new Date(
    Date.UTC(
      earnedDate.getUTCFullYear() + 1,
      earnedDate.getUTCMonth() + 1,
      0
    )
  )
}

function parseDate(value: string | Date | null) {
  if (!value) {
    return null
  }

  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function formatDate(value: string | Date | null) {
  if (!value) {
    return ""
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0)
}

function getPsPlusCredit(row: InvoiceDetailRecord) {
  return (row.Invoice_AMT ?? 0) - (row.Credit_AMT ?? 0) - (row.Expired_Credits ?? 0)
}
