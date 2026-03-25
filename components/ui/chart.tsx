"use client"

import * as React from "react"
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
  type LegendProps,
  type TooltipProps,
} from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
  }
>

const ChartConfigContext = React.createContext<ChartConfig | null>(null)

function useChartConfig() {
  return React.useContext(ChartConfigContext)
}

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig
  children: React.ReactElement
}

export function ChartContainer({
  config,
  children,
  className,
  style,
  ...props
}: ChartContainerProps) {
  const cssVars = React.useMemo(() => {
    const entries = Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      value.color ?? "currentColor",
    ])
    return Object.fromEntries(entries) as React.CSSProperties
  }, [config])

  return (
    <ChartConfigContext.Provider value={config}>
      <div
        className={cn("w-full", className)}
        style={{ ...cssVars, ...style }}
        {...props}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartConfigContext.Provider>
  )
}

export const ChartTooltip = Tooltip
export const ChartLegend = Legend

type ChartTooltipContentProps = TooltipProps<number, string> & {
  payload?: Array<{
    dataKey?: string | number
    name?: string
    value?: number | string
    color?: string
  }>
  label?: string | number
  indicator?: "dot" | "line"
  valueFormatter?: (value: number, key: string) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  indicator = "dot",
}: ChartTooltipContentProps) {
  const config = useChartConfig()

  if (!active || !payload?.length) return null

  const labelValue = labelFormatter
    ? labelFormatter(String(label), payload as never)
    : label

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="mb-2 text-muted-foreground">
        {labelValue ?? "Date"}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "")
          const itemConfig = config?.[key]
          const color = itemConfig?.color ?? entry.color ?? "currentColor"
          const name = itemConfig?.label ?? entry.name ?? key
          const rawValue = Number(entry.value ?? 0)
          const formattedValue = valueFormatter
            ? valueFormatter(rawValue, key)
            : rawValue.toLocaleString()

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "block size-2 rounded-full",
                    indicator === "line" && "h-2 w-4 rounded-sm"
                  )}
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{name}</span>
              </div>
              <span className="font-medium text-foreground">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ChartLegendContentProps = LegendProps & {
  payload?: Array<{
    dataKey?: string | number
    value?: string
    color?: string
  }>
  className?: string
}

export function ChartLegendContent({ payload, className }: ChartLegendContentProps) {
  const config = useChartConfig()

  if (!payload?.length) return null

  return (
    <div className={cn("flex flex-wrap gap-3 text-xs text-muted-foreground", className)}>
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.value ?? "")
        const itemConfig = config?.[key]
        const color = itemConfig?.color ?? entry.color ?? "currentColor"
        const label = itemConfig?.label ?? entry.value ?? key

        return (
          <div key={key} className="flex items-center gap-2">
            <span className="block size-2 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
