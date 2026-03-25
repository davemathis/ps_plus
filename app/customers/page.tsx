import { AlertCircle } from "lucide-react"
import { redirect } from "next/navigation"

import { InvoiceSummaryClient } from "@/components/invoice-summary-client"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpiredLoginError, getInvoiceDetails, getInvoiceFilterOptions } from "@/lib/azure-sql"
import type { InvoiceDetailRecord, InvoiceQueryDebugInfo } from "@/lib/azure-sql"
import { getSignedInUser } from "@/lib/signed-in-user"

export const dynamic = "force-dynamic"

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
})

function parseNumericParam(value: string | string[] | undefined) {
  const parsedValue = Array.isArray(value) ? value[0] : value

  if (!parsedValue) {
    return null
  }

  const numericValue = Number(parsedValue)
  return Number.isInteger(numericValue) ? numericValue : null
}

function getMonthLabel(monthNumber: number) {
  return monthFormatter.format(new Date(Date.UTC(2024, monthNumber - 1, 1)))
}

function getPsPlusCredit(row: InvoiceDetailRecord) {
  return (row.Invoice_AMT ?? 0) - (row.Credit_AMT ?? 0) - (row.Expired_Credits ?? 0)
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const signedInUser = await getSignedInUser()
  const displayName = signedInUser?.displayName ?? "Not signed in"
  const email = signedInUser?.email ?? null
  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedFiscalMonth = parseNumericParam(resolvedSearchParams.fiscalMonth)
  const selectedFiscalYear = parseNumericParam(resolvedSearchParams.fiscalYear)

  let invoiceRows: InvoiceDetailRecord[] = []
  let debugInfo: InvoiceQueryDebugInfo | null = null
  let filterOptions = { fiscalMonths: [] as number[], fiscalYears: [] as number[] }

  try {
    filterOptions = await getInvoiceFilterOptions()

    if (selectedFiscalMonth !== null && selectedFiscalYear !== null) {
      const result = await getInvoiceDetails(selectedFiscalMonth, selectedFiscalYear)
      invoiceRows = result.rows
      debugInfo = result.debug
    }
  } catch (error) {
    if (error instanceof ExpiredLoginError) {
      redirect("/.auth/login/aad?post_login_redirect_uri=/customers")
    }

    debugInfo = {
      server: process.env.AZURE_SQL_SERVER ?? "Unavailable",
      port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
      database: process.env.AZURE_SQL_DATABASE ?? "Unavailable",
      query: `
SELECT
  Customer_Name,
  Customer_Job,
  RefNumber,
  Invoice_Date,
  Invoice_AMT,
  Credit_AMT,
  Invoice_AMT_Remaining,
  Credit_AMT_Remaining,
  Open_Sales_Orders_AMT,
  Expired_Credits,
  Expiration_Date,
  Invoice_MO,
  Invoice_YR,
  Type,
  Expired_This_Period,
  Fiscal_MO,
  Fiscal_YR,
  Parent_Company
FROM dbo.QB_PSPlus_Invoices
WHERE Fiscal_MO = @fiscalMonth
  AND Fiscal_YR = @fiscalYear
ORDER BY Customer_Name, Invoice_Date, RefNumber
      `.trim(),
      schemaName: "dbo",
      tableName: "QB_PSPlus_Invoices",
      connectTimeoutMs: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
      requestTimeoutMs: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
      debugStage: "page-load",
      retryAttempted: false,
      objectExists: false,
      availableColumns: [],
      sampleRow: null,
      tokenAcquiredAt: null,
      selectedFiscalMonth,
      selectedFiscalYear,
      errorMessage: error instanceof Error ? error.message : "Failed to load invoice details",
    }
  }

  const groupedInvoices = Array.from(
    invoiceRows.reduce((map, row) => {
      const customerName = row.Customer_Name?.trim() || "Unnamed customer"
      const existingGroup = map.get(customerName)

      if (existingGroup) {
        existingGroup.rows.push(row)
        existingGroup.total += getPsPlusCredit(row)
      } else {
        map.set(customerName, {
          customerName,
          total: getPsPlusCredit(row),
          rows: [row],
        })
      }

      return map
    }, new Map<string, { customerName: string; total: number; rows: InvoiceDetailRecord[] }>())
  ).map(([, group]) => group)

  return (
    <DashboardShell
      displayName={displayName}
      email={email}
      title="Invoice Summary"
      description="Invoice totals by customer with drill-down detail from Azure SQL"
    >
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>QB PSPlus Invoices</CardTitle>
          <CardDescription>
            Filter <code>dbo.QB_PSPlus_Invoices</code> by fiscal month and year, then click a
            customer to expand the invoice detail rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-medium">Fiscal Month</span>
              <select
                name="fiscalMonth"
                defaultValue={selectedFiscalMonth?.toString() ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select month</option>
                {filterOptions.fiscalMonths.map((month) => (
                  <option key={month} value={month}>
                    {month} - {getMonthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Fiscal Year</span>
              <select
                name="fiscalYear"
                defaultValue={selectedFiscalYear?.toString() ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select year</option>
                {filterOptions.fiscalYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="md:self-end">
              Run Query
            </Button>
          </form>
          {debugInfo?.errorMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>{debugInfo.errorMessage}</div>
            </div>
          ) : selectedFiscalMonth === null || selectedFiscalYear === null ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              Select a fiscal month and fiscal year, then click <span className="font-medium">Run Query</span>.
            </div>
          ) : (
            <InvoiceSummaryClient groups={groupedInvoices} />
          )}
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
          <CardDescription>
            SQL diagnostics rendered directly on the page for troubleshooting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <DebugItem label="Server" value={debugInfo?.server ?? "Unavailable"} />
            <DebugItem label="Port" value={debugInfo?.port?.toString() ?? "Unavailable"} />
            <DebugItem label="Database" value={debugInfo?.database ?? "Unavailable"} />
            <DebugItem label="Schema" value={debugInfo?.schemaName ?? "dbo"} />
            <DebugItem label="Table" value={debugInfo?.tableName ?? "QB_PSPlus_Invoices"} />
            <DebugItem
              label="Connect Timeout"
              value={debugInfo ? `${debugInfo.connectTimeoutMs} ms` : "Unavailable"}
            />
            <DebugItem
              label="Request Timeout"
              value={debugInfo ? `${debugInfo.requestTimeoutMs} ms` : "Unavailable"}
            />
            <DebugItem label="Debug Stage" value={debugInfo?.debugStage ?? "Unavailable"} />
            <DebugItem
              label="Retry Attempted"
              value={debugInfo ? (debugInfo.retryAttempted ? "Yes" : "No") : "Unknown"}
            />
            <DebugItem
              label="Token Acquired"
              value={debugInfo?.tokenAcquiredAt ?? "Unavailable"}
            />
            <DebugItem
              label="Fiscal Month"
              value={debugInfo?.selectedFiscalMonth?.toString() ?? "Not selected"}
            />
            <DebugItem
              label="Fiscal Year"
              value={debugInfo?.selectedFiscalYear?.toString() ?? "Not selected"}
            />
            <DebugItem
              label="Table Exists"
              value={debugInfo ? (debugInfo.objectExists ? "Yes" : "No") : "Unknown"}
            />
            <DebugItem label="Error Code" value={debugInfo?.errorCode ?? "None"} />
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Query
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">
              {debugInfo?.query ?? "Unavailable"}
            </pre>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Available Columns
            </div>
            {debugInfo?.availableColumns.length ? (
              <ul className="mt-2 space-y-1">
                {debugInfo.availableColumns.map((column) => (
                  <li key={column.name}>
                    <code>{column.name}</code> <span className="text-muted-foreground">({column.dataType})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-muted-foreground">No columns discovered.</div>
            )}
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sample Row
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-sm">
              {JSON.stringify(debugInfo?.sampleRow ?? null, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-all">{value}</div>
    </div>
  )
}
