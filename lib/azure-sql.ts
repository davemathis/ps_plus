import { ClientSecretCredential } from "@azure/identity"
import sql from "mssql"

export type InvoiceDetailRecord = {
  Customer_Name: string | null
  Customer_Job: string | null
  RefNumber: string | null
  Invoice_Date: string | Date | null
  Invoice_AMT: number | null
  Credit_AMT: number | null
  Invoice_AMT_Remaining: number | null
  Credit_AMT_Remaining: number | null
  Open_Sales_Orders_AMT: number | null
  Expired_Credits: number | null
  Expiration_Date: string | Date | null
  Invoice_MO: number | null
  Invoice_YR: number | null
  Type: string | null
  Expired_This_Period: string | number | boolean | null
  Fiscal_MO: number | null
  Fiscal_YR: number | null
  Parent_Company: string | null
}

type ColumnRecord = {
  COLUMN_NAME: string
  DATA_TYPE: string
}

type FilterOptionRecord = {
  value: number | null
}

type SampleRow = Record<string, unknown>

type InvoiceConnectionInfo = {
  server: string
  port: number
  database: string
  schemaName: string
  tableName: string
  connectTimeoutMs: number
  requestTimeoutMs: number
  debugStage: string
  retryAttempted: boolean
  selectedFiscalMonth: number | null
  selectedFiscalYear: number | null
  tokenAcquiredAt: string | null
  query: string
}

export type InvoiceQueryDebugInfo = {
  server: string
  port: number
  database: string
  query: string
  schemaName: string
  tableName: string
  connectTimeoutMs: number
  requestTimeoutMs: number
  debugStage: string
  retryAttempted: boolean
  objectExists: boolean
  availableColumns: Array<{
    name: string
    dataType: string
  }>
  sampleRow: SampleRow | null
  tokenAcquiredAt: string | null
  selectedFiscalMonth: number | null
  selectedFiscalYear: number | null
  errorMessage?: string
  errorCode?: string
}

export type InvoiceDetailResult = {
  rows: InvoiceDetailRecord[]
  debug: InvoiceQueryDebugInfo
}

export type InvoiceFilterOptions = {
  fiscalMonths: number[]
  fiscalYears: number[]
}

export type TableBrowseRecord = Record<string, unknown>

export type TableBrowseResult = {
  rows: TableBrowseRecord[]
  columns: string[]
  debug: InvoiceQueryDebugInfo
}

export class ExpiredLoginError extends Error {
  constructor(message = "Login token expired") {
    super(message)
    this.name = "ExpiredLoginError"
  }
}

export class SqlConnectionDebugError extends Error {
  debug: InvoiceQueryDebugInfo

  constructor(debug: InvoiceQueryDebugInfo) {
    super(debug.errorMessage ?? "SQL connection error")
    this.name = "SqlConnectionDebugError"
    this.debug = debug
  }
}

declare global {
  var __psPlusSqlPool:
    | Promise<{ pool: sql.ConnectionPool; tokenAcquiredAt: string }>
    | undefined
}

function getEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getSqlConfig(token: string): sql.config {
  return {
    server: getEnv("AZURE_SQL_SERVER"),
    database: getEnv("AZURE_SQL_DATABASE"),
    port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
    authentication: {
      type: "azure-active-directory-access-token",
      options: {
        token,
      },
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    connectionTimeout: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
    requestTimeout: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

function getInvoiceConnectionInfo(
  fiscalMonth: number | null,
  fiscalYear: number | null
): InvoiceConnectionInfo {
  return {
    server: getEnv("AZURE_SQL_SERVER"),
    port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
    database: getEnv("AZURE_SQL_DATABASE"),
    schemaName: "dbo",
    tableName: "QB_PSPlus_Invoices",
    connectTimeoutMs: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
    requestTimeoutMs: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
    debugStage: "query",
    retryAttempted: false,
    selectedFiscalMonth: fiscalMonth,
    selectedFiscalYear: fiscalYear,
    tokenAcquiredAt: null,
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
  }
}

function getTableBrowseConnectionInfo(
  schemaName: string,
  tableName: string
): InvoiceConnectionInfo {
  return {
    server: getEnv("AZURE_SQL_SERVER"),
    port: Number(process.env.AZURE_SQL_PORT ?? "1433"),
    database: getEnv("AZURE_SQL_DATABASE"),
    schemaName,
    tableName,
    connectTimeoutMs: Number(process.env.AZURE_SQL_CONNECTION_TIMEOUT_MS ?? "15000"),
    requestTimeoutMs: Number(process.env.AZURE_SQL_REQUEST_TIMEOUT_MS ?? "15000"),
    debugStage: "query",
    retryAttempted: false,
    selectedFiscalMonth: null,
    selectedFiscalYear: null,
    tokenAcquiredAt: null,
    query: `SELECT TOP (200) * FROM ${quoteSqlIdentifier(schemaName)}.${quoteSqlIdentifier(tableName)}`,
  }
}

function isValidSqlIdentifierPart(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

function quoteSqlIdentifier(value: string) {
  return `[${value.replace(/]/g, "]]")}]`
}

export function parseTableName(rawTableName: string) {
  const trimmedValue = rawTableName.trim()

  if (!trimmedValue) {
    throw new Error("Table name is required")
  }

  const parts = trimmedValue.split(".")

  if (parts.length > 2) {
    throw new Error("Use table or schema.table format")
  }

  const [schemaName, tableName] =
    parts.length === 2 ? parts : ["dbo", parts[0]]

  if (!isValidSqlIdentifierPart(schemaName) || !isValidSqlIdentifierPart(tableName)) {
    throw new Error("Table name can only contain letters, numbers, and underscores")
  }

  return {
    schemaName,
    tableName,
    qualifiedName: `${schemaName}.${tableName}`,
  }
}

async function getAccessToken() {
  const credential = new ClientSecretCredential(
    getEnv("AZURE_SQL_TENANT_ID"),
    getEnv("AZURE_SQL_CLIENT_ID"),
    getEnv("AZURE_SQL_CLIENT_SECRET")
  )

  const tokenResult = await credential.getToken("https://database.windows.net/.default")

  if (!tokenResult?.token) {
    throw new Error("Unable to acquire Azure SQL access token")
  }

  return tokenResult.token
}

async function createPool() {
  const token = await getAccessToken()
  const tokenAcquiredAt = new Date().toISOString()
  const pool = new sql.ConnectionPool(getSqlConfig(token))
  const connectedPool = await pool.connect()
  return {
    pool: connectedPool,
    tokenAcquiredAt,
  }
}

async function resetSqlPool() {
  const existingPoolPromise = global.__psPlusSqlPool
  global.__psPlusSqlPool = undefined

  if (existingPoolPromise) {
    try {
      const existingPool = await existingPoolPromise
      await existingPool.pool.close()
    } catch {
      // Ignore failures while discarding an expired pool.
    }
  }
}

export async function getSqlPool() {
  if (!global.__psPlusSqlPool) {
    global.__psPlusSqlPool = createPool()
  }

  return global.__psPlusSqlPool
}

function isExpiredTokenError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes("token is expired") || message.includes("login failed for user '<token-identified principal>'")
}

async function withSqlRetry<T>(operation: (pool: sql.ConnectionPool) => Promise<T>) {
  const connectionInfo = getInvoiceConnectionInfo(null, null)

  try {
    const poolState = await getSqlPool()
    connectionInfo.tokenAcquiredAt = poolState.tokenAcquiredAt
    return await operation(poolState.pool)
  } catch (error) {
    if (!isExpiredTokenError(error)) {
      throw buildSqlConnectionDebugError(connectionInfo, error, "connect-or-query", false)
    }

    await resetSqlPool()
    connectionInfo.retryAttempted = true

    try {
      const refreshedPoolState = await getSqlPool()
      connectionInfo.tokenAcquiredAt = refreshedPoolState.tokenAcquiredAt
      return await operation(refreshedPoolState.pool)
    } catch (retryError) {
      if (isExpiredTokenError(retryError)) {
        throw new ExpiredLoginError(
          retryError instanceof Error ? retryError.message : "Login token expired"
        )
      }

      throw buildSqlConnectionDebugError(connectionInfo, retryError, "connect-or-query:retry", true)
    }
  }
}

function buildSqlConnectionDebugError(
  connectionInfo: ReturnType<typeof getInvoiceConnectionInfo>,
  error: unknown,
  debugStage: string,
  retryAttempted: boolean
) {
  return new SqlConnectionDebugError({
    ...connectionInfo,
    debugStage,
    retryAttempted,
    objectExists: false,
    availableColumns: [],
    sampleRow: null,
    errorMessage: error instanceof Error ? error.message : "Unknown SQL error",
    errorCode:
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined,
  })
}

export async function getInvoiceFilterOptions(): Promise<InvoiceFilterOptions> {
  const [monthResult, yearResult] = await withSqlRetry((pool) =>
    Promise.all([
      pool.request().query<FilterOptionRecord>(`
        SELECT DISTINCT CAST(Fiscal_MO AS int) AS value
        FROM dbo.QB_PSPlus_Invoices
        WHERE Fiscal_MO IS NOT NULL
        ORDER BY value
      `),
      pool.request().query<FilterOptionRecord>(`
        SELECT DISTINCT CAST(Fiscal_YR AS int) AS value
        FROM dbo.QB_PSPlus_Invoices
        WHERE Fiscal_YR IS NOT NULL
        ORDER BY value DESC
      `),
    ])
  )

  return {
    fiscalMonths: monthResult.recordset
      .map((row) => row.value)
      .filter((value): value is number => value !== null),
    fiscalYears: yearResult.recordset
      .map((row) => row.value)
      .filter((value): value is number => value !== null),
  }
}

export async function getInvoiceDetails(
  fiscalMonth: number,
  fiscalYear: number
): Promise<InvoiceDetailResult> {
  const connectionInfo = getInvoiceConnectionInfo(fiscalMonth, fiscalYear)

  try {
    const result = await withSqlRetry((pool) =>
      pool
        .request()
        .input("fiscalMonth", sql.Int, fiscalMonth)
        .input("fiscalYear", sql.Int, fiscalYear)
        .query<InvoiceDetailRecord>(connectionInfo.query)
    )

    return {
      rows: result.recordset,
      debug: {
        ...connectionInfo,
        objectExists: true,
        availableColumns: [],
        sampleRow: null,
      },
    }
  } catch (error) {
    if (error instanceof ExpiredLoginError) {
      throw error
    }

    if (error instanceof SqlConnectionDebugError) {
      return {
        rows: [],
        debug: {
          ...error.debug,
          selectedFiscalMonth: fiscalMonth,
          selectedFiscalYear: fiscalYear,
          query: connectionInfo.query,
        },
      }
    }

    const poolState = await getSqlPool()
    const debug = await getInvoiceQueryDebugInfo(poolState.pool, error, connectionInfo)

    return {
      rows: [],
      debug,
    }
  }
}

export async function browseTable(rawTableName: string): Promise<TableBrowseResult> {
  const parsedTable = parseTableName(rawTableName)
  const connectionInfo = getTableBrowseConnectionInfo(
    parsedTable.schemaName,
    parsedTable.tableName
  )

  try {
    const result = await withSqlRetry((pool) =>
      pool.request().query<TableBrowseRecord>(connectionInfo.query)
    )

    const firstRow = result.recordset[0] ?? null

    return {
      rows: result.recordset,
      columns: firstRow ? Object.keys(firstRow) : [],
      debug: {
        ...connectionInfo,
        objectExists: true,
        availableColumns: [],
        sampleRow: firstRow,
      },
    }
  } catch (error) {
    if (error instanceof ExpiredLoginError) {
      throw error
    }

    if (error instanceof SqlConnectionDebugError) {
      return {
        rows: [],
        columns: [],
        debug: error.debug,
      }
    }

    const poolState = await getSqlPool()
    const debug = await getInvoiceQueryDebugInfo(poolState.pool, error, connectionInfo)

    return {
      rows: [],
      columns: [],
      debug,
    }
  }
}

async function getInvoiceQueryDebugInfo(
  pool: sql.ConnectionPool,
  error: unknown,
  connectionInfo: ReturnType<typeof getInvoiceConnectionInfo>
): Promise<InvoiceQueryDebugInfo> {
  const objectCheck = await pool
    .request()
    .input("schemaName", sql.NVarChar, connectionInfo.schemaName)
    .input("tableName", sql.NVarChar, connectionInfo.tableName)
    .query<{ object_id: number | null }>(`
      SELECT OBJECT_ID(QUOTENAME(@schemaName) + '.' + QUOTENAME(@tableName), 'U') AS object_id
    `)

  const objectExists = objectCheck.recordset[0]?.object_id != null

  const columnsResult = await pool
    .request()
    .input("schemaName", sql.NVarChar, connectionInfo.schemaName)
    .input("tableName", sql.NVarChar, connectionInfo.tableName)
    .query<ColumnRecord>(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schemaName AND TABLE_NAME = @tableName
      ORDER BY ORDINAL_POSITION
    `)

  let sampleRow: SampleRow | null = null

  if (objectExists) {
    try {
      const sampleResult = await pool.request().query(`
        SELECT TOP (1) *
        FROM ${connectionInfo.schemaName}.${connectionInfo.tableName}
      `)
      sampleRow = (sampleResult.recordset[0] as SampleRow | undefined) ?? null
    } catch {
      sampleRow = null
    }
  }

  return {
    ...connectionInfo,
    objectExists,
    availableColumns: columnsResult.recordset.map((column) => ({
      name: column.COLUMN_NAME,
      dataType: column.DATA_TYPE,
    })),
    sampleRow,
    debugStage: "inspect-table-metadata",
    errorMessage: error instanceof Error ? error.message : "Unknown SQL error",
    errorCode:
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined,
  }
}
