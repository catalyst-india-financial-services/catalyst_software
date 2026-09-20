import { SupabaseClient } from '@supabase/supabase-js'

export interface CustomerSummary {
  id: string
  customer_id?: string | null
  name: string
  mobile?: string | null
  pan?: string | null
  aadhaar?: string | null
  status?: string | null
}

export interface CustomerDuplicateMatch {
  id: string
  customer_id: string
  name: string
  matchedValue: string
  field: 'mobile' | 'pan' | 'aadhaar'
}

export interface CustomerDuplicateCheckResult {
  hasDuplicate: boolean
  duplicateMobile?: CustomerDuplicateMatch | null
  duplicatePan?: CustomerDuplicateMatch | null
  duplicateAadhaar?: CustomerDuplicateMatch | null
  errors: {
    mobile?: string
    pan?: string
    aadhaar_kyc_id?: string
  }
}

/**
 * Normalizes Indian mobile number:
 * Strips whitespace, dashes, parens.
 * If 12 digits starting with '91', strips '91'.
 * If 11 digits starting with '0', strips '0'.
 * Returns clean 10 digits or cleaned string.
 */
export function normalizeMobile(val?: string | null): string {
  if (!val) return ''
  const digits = val.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Normalizes PAN number:
 * Strips whitespace and uppercase characters.
 */
export function normalizePan(val?: string | null): string {
  if (!val) return ''
  return val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim()
}

/**
 * Normalizes Aadhaar number:
 * Strips whitespace and non-digit characters.
 */
export function normalizeAadhaar(val?: string | null): string {
  if (!val) return ''
  return val.replace(/\D/g, '').trim()
}

/**
 * Checks a customer candidate against an in-memory list of existing customers.
 */
export function checkCustomerDuplicatesFromList(
  candidate: {
    mobile?: string | null
    pan?: string | null
    aadhaar?: string | null
  },
  existingCustomers: CustomerSummary[],
  excludeCustomerId?: string | null
): CustomerDuplicateCheckResult {
  const normMobile = normalizeMobile(candidate.mobile)
  const normPan = normalizePan(candidate.pan)
  const normAadhaar = normalizeAadhaar(candidate.aadhaar)

  let duplicateMobile: CustomerDuplicateMatch | null = null
  let duplicatePan: CustomerDuplicateMatch | null = null
  let duplicateAadhaar: CustomerDuplicateMatch | null = null

  const errors: { mobile?: string; pan?: string; aadhaar_kyc_id?: string } = {}

  for (const c of existingCustomers) {
    // Skip candidate's own existing record if editing/updating a draft
    if (excludeCustomerId && (c.id === excludeCustomerId || c.customer_id === excludeCustomerId)) {
      continue
    }

    const cMobile = normalizeMobile(c.mobile)
    const cPan = normalizePan(c.pan)
    const cAadhaar = normalizeAadhaar(c.aadhaar)

    const cIdDisplay = c.customer_id || c.id.slice(0, 8)
    const cNameDisplay = c.name || 'Existing Customer'

    // 1. Mobile duplicate check (must be a valid 10-digit number to flag)
    if (!duplicateMobile && normMobile.length === 10 && cMobile === normMobile) {
      duplicateMobile = {
        id: c.id,
        customer_id: cIdDisplay,
        name: cNameDisplay,
        matchedValue: c.mobile || normMobile,
        field: 'mobile',
      }
      errors.mobile = `Mobile number is already registered to ${cNameDisplay} (${cIdDisplay}). Duplicate profiles are not permitted.`
    }

    // 2. PAN duplicate check (must be a valid 10-character PAN to flag)
    if (!duplicatePan && normPan.length === 10 && cPan === normPan) {
      duplicatePan = {
        id: c.id,
        customer_id: cIdDisplay,
        name: cNameDisplay,
        matchedValue: c.pan || normPan,
        field: 'pan',
      }
      errors.pan = `PAN card is already registered to ${cNameDisplay} (${cIdDisplay}). Duplicate profiles are not permitted.`
    }

    // 3. Aadhaar duplicate check (must be a valid 12-digit Aadhaar to flag)
    if (!duplicateAadhaar && normAadhaar.length === 12 && cAadhaar === normAadhaar) {
      duplicateAadhaar = {
        id: c.id,
        customer_id: cIdDisplay,
        name: cNameDisplay,
        matchedValue: c.aadhaar || normAadhaar,
        field: 'aadhaar',
      }
      errors.aadhaar_kyc_id = `Aadhaar number is already registered to ${cNameDisplay} (${cIdDisplay}). Duplicate profiles are not permitted.`
    }
  }

  return {
    hasDuplicate: !!(duplicateMobile || duplicatePan || duplicateAadhaar),
    duplicateMobile,
    duplicatePan,
    duplicateAadhaar,
    errors,
  }
}

/**
 * Directly queries Supabase database for duplicate customer profile credentials.
 * Used during mutation submission (useCreateNewCustomer, useSaveDraftCustomer, useUpdateDraftCustomer).
 */
export async function checkCustomerDuplicatesInDb(
  supabase: SupabaseClient,
  candidate: {
    mobile?: string | null
    pan?: string | null
    aadhaar?: string | null
  },
  excludeCustomerId?: string | null
): Promise<CustomerDuplicateCheckResult> {
  const normMobile = normalizeMobile(candidate.mobile)
  const normPan = normalizePan(candidate.pan)
  const normAadhaar = normalizeAadhaar(candidate.aadhaar)

  // Fast query all customers to ensure cross-branch uniqueness
  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_id, name, mobile, pan, aadhaar, status')

  if (error) {
    console.error('[checkCustomerDuplicatesInDb] Error querying customers:', error)
    throw error
  }

  const existingCustomers: CustomerSummary[] = (data || []).map((c: any) => ({
    id: c.id,
    customer_id: c.customer_id,
    name: c.name,
    mobile: c.mobile,
    pan: c.pan,
    aadhaar: c.aadhaar,
    status: c.status,
  }))

  return checkCustomerDuplicatesFromList(
    { mobile: normMobile, pan: normPan, aadhaar: normAadhaar },
    existingCustomers,
    excludeCustomerId
  )
}
