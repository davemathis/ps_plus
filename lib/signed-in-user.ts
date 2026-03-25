import { headers } from "next/headers"

type ClientPrincipalClaim = {
  typ?: string
  val?: string
}

type ClientPrincipal = {
  userDetails?: string
  userRoles?: string[]
  claims?: ClientPrincipalClaim[]
}

export type SignedInUser = {
  displayName: string
  email: string | null
}

function decodeClientPrincipal(encodedValue: string): ClientPrincipal | null {
  try {
    const json = Buffer.from(encodedValue, "base64").toString("utf-8")
    return JSON.parse(json) as ClientPrincipal
  } catch {
    return null
  }
}

function getClaimValue(principal: ClientPrincipal, claimTypes: string[]) {
  const matchingClaim = principal.claims?.find((claim) =>
    claim.typ ? claimTypes.includes(claim.typ) : false
  )

  return matchingClaim?.val?.trim() || null
}

function buildDisplayName(principal: ClientPrincipal, principalName: string | null) {
  const givenName = getClaimValue(principal, [
    "given_name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  ])
  const familyName = getClaimValue(principal, [
    "family_name",
    "surname",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  ])
  const fullName = getClaimValue(principal, [
    "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  ])

  if (givenName || familyName) {
    return [givenName, familyName].filter(Boolean).join(" ")
  }

  return fullName ?? principal.userDetails ?? principalName ?? "Not signed in"
}

function buildEmail(principal: ClientPrincipal, principalName: string | null) {
  const emailClaim = getClaimValue(principal, [
    "email",
    "emails",
    "preferred_username",
    "upn",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
  ])

  return emailClaim ?? principalName ?? principal.userDetails ?? null
}

export async function getSignedInUser(): Promise<SignedInUser | null> {
  const requestHeaders = await headers()
  const principalName = requestHeaders.get("x-ms-client-principal-name")
  const encodedPrincipal = requestHeaders.get("x-ms-client-principal")

  if (encodedPrincipal) {
    const principal = decodeClientPrincipal(encodedPrincipal)

    if (principal) {
      return {
        displayName: buildDisplayName(principal, principalName),
        email: buildEmail(principal, principalName),
      }
    }
  }

  if (!principalName) {
    return null
  }

  return {
    displayName: principalName,
    email: principalName,
  }
}
