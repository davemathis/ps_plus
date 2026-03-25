import { AlertCircle } from "lucide-react"
import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  browseTable,
  ExpiredLoginError,
  parseTableName,
} from "@/lib/azure-sql"
import type { InvoiceQueryDebugInfo, TableBrowseRecord } from "@/lib/azure-sql"
import { getSignedInUser } from "@/lib/signed-in-user"

export const dynamic = "force-dynamic"

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

export default async function TableBrowserPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const signedInUser = await getSignedInUser()
  const displayName = signedInUser?.displayName ?? "Not signed in"
  const email = signedInUser?.email ?? null
  const resolvedSearchParams = (await searchParams) ?? {}
  const tableName = getParamValue(resolvedSearchParams.tableName)

  let rows: TableBrowseRecord[] = []
  let columns: string[] = []
  let debugInfo: InvoiceQueryDebugInfo | null = null

  if (tableName) {
    try {
      const result = await browseTable(tableName)
      rows = result.rows
      columns = result.columns
      debugInfo = result.debug
    } catch (error) {
      if (error instanceof ExpiredLoginError) {
        redirect("/.auth/login/aad?post_login_redirect_uri=/table-browser")
      }

      try {
        const parsedTable = parseTableName(tableName)
        debugInfo = {
          server: process.env.AZURE_SQL_SERVER ?? "Unavailable",
          port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
          database: process.env.AZURE_SQL_DATABASE ?? "Unavailable",
          query: `SELECT TOP (200) * FROM [${parsedTable.schemaName}].[${parsedTable.tableName}]`,
          schemaName: parsedTable.schemaName,
          tableName: parsedTable.tableName,
          connectTimeoutMs: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
          requestTimeoutMs: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
          debugStage: "page-load",
          retryAttempted: false,
          objectExists: false,
          availableColumns: [],
          sampleRow: null,
          tokenAcquiredAt: null,
          selectedFiscalMonth: null,
          selectedFiscalYear: null,
          errorMessage: error instanceof Error ? error.message : "Failed to browse table",
        }
      } catch (parseError) {
        debugInfo = {
          server: process.env.AZURE_SQL_SERVER ?? "Unavailable",
          port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
          database: process.env.AZURE_SQL_DATABASE ?? "Unavailable",
          query: "Unavailable",
          schemaName: "dbo",
          tableName,
          connectTimeoutMs: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
          requestTimeoutMs: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
          debugStage: "page-validate-input",
          retryAttempted: false,
          objectExists: false,
          availableColumns: [],
          sampleRow: null,
          tokenAcquiredAt: null,
          selectedFiscalMonth: null,
          selectedFiscalYear: null,
          errorMessage:
            parseError instanceof Error ? parseError.message : "Invalid table name",
        }
      }
    }
  }

  return (
    <DashboardShell
      displayName={displayName}
      email={email}
      title="Table Browser"
      description="Ad hoc table preview from Azure SQL"
    >
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Browse SQL Table</CardTitle>
          <CardDescription>
            Enter a table name in <code>table</code> or <code>schema.table</code> format and run
            <code> SELECT TOP (200) * </code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-[minmax(0,420px)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-medium">Table Name</span>
              <input
                type="text"
                name="tableName"
                defaultValue={tableName}
                placeholder="dbo.QB_PSPlus_Invoices"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <Button type="submit" className="md:self-end">
              Query
            </Button>
          </form>
          {debugInfo?.errorMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>{debugInfo.errorMessage}</div>
            </div>
          ) : tableName ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="px-4 py-3 text-left font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, index) => (
                      <tr key={index} className="border-t align-top">
                        {columns.map((column) => (
                          <td key={column} className="max-w-xs px-4 py-3">
                            {formatCellValue(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t">
                      <td className="px-4 py-6 text-muted-foreground" colSpan={Math.max(columns.length, 1)}>
                        No rows were returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              Enter a table name and click <span className="font-medium">Query</span>.
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
          <CardDescription>
            Connection and metadata details for the current table query.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <DebugItem label="Server" value={debugInfo?.server ?? "Unavailable"} />
            <DebugItem label="Port" value={debugInfo?.port?.toString() ?? "Unavailable"} />
            <DebugItem label="Database" value={debugInfo?.database ?? "Unavailable"} />
            <DebugItem label="Schema" value={debugInfo?.schemaName ?? "dbo"} />
            <DebugItem label="Table" value={debugInfo?.tableName || tableName || "Not selected"} />
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

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">NULL</span>
  }

  if (typeof value === "object") {
    return <pre className="whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</pre>
  }

  return String(value)
}
