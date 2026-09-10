import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

export const getSupabaseUrl = (): string => {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('orca_supabase_url') : null
  return (custom && custom.trim()) || import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
}

export const getSupabaseAnonKey = (): string => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5n1sgDIWAVClg3O9Ax5FWw_MhMo7eWd'
}

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return (
    Boolean(url) &&
    url !== 'https://your-project.supabase.co' &&
    url.includes('.supabase.co') &&
    Boolean(key) &&
    key.length > 10
  )
}

// Create the Supabase client safely
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? getSupabaseUrl() : 'https://dummyproject.supabase.co',
  getSupabaseAnonKey(),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export interface UserProfile {
  id: string
  email: string
  name: string
  phone: string
  vessel_name?: string
  home_port?: string
  role?: 'skipper' | 'admin' | 'coastguard'
  created_at?: string
  updated_at?: string
}

export interface StoredUserAccount {
  id: string
  email: string
  passwordHash: string
  name: string
  phone: string
  vessel_name: string
  home_port: string
  role: 'skipper' | 'admin' | 'coastguard'
  created_at: string
}

const LOCAL_USER_KEY = 'orca_auth_user_v1'
const LOCAL_PROFILE_KEY = 'orca_auth_profile_v1'
const USERS_TABLE_KEY = 'orca_db_users_table_v1'

// Default seed accounts: admin and sample skipper
const DEFAULT_SEED_USERS: StoredUserAccount[] = [
  {
    id: 'admin_root_001',
    email: 'admin@123',
    passwordHash: 'hello123',
    name: 'SAR Mission Controller',
    phone: '+91 484 2216500',
    vessel_name: 'Coast Guard Command Vessel',
    home_port: 'Kochi Naval Enclave',
    role: 'admin',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'user_master_001',
    email: 'skipper@orca.maritime',
    passwordHash: 'password123',
    name: 'Capt. Thomas Varghese',
    phone: '+91 98470 12345',
    vessel_name: 'Matsya Sagar IV',
    home_port: 'Kochi (Cochin) Port',
    role: 'skipper',
    created_at: new Date('2026-01-15T00:00:00Z').toISOString(),
  },
]

/**
 * Get all registered accounts from the database table.
 * Guarantees that admin@123 is always present.
 */
export function getRegisteredUsersTable(): StoredUserAccount[] {
  let list: StoredUserAccount[] = []
  try {
    const raw = localStorage.getItem(USERS_TABLE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed
      }
    }
  } catch (err) {
    console.warn('Could not load users table from storage:', err)
  }

  // Ensure admin account always exists with password hello123
  const adminIndex = list.findIndex((u) => u.email.toLowerCase() === 'admin@123')
  if (adminIndex === -1) {
    list.unshift(DEFAULT_SEED_USERS[0])
    saveRegisteredUsersTable(list)
  } else {
    // Update password if needed
    if (list[adminIndex].passwordHash !== 'hello123' || list[adminIndex].role !== 'admin') {
      list[adminIndex].passwordHash = 'hello123'
      list[adminIndex].role = 'admin'
      saveRegisteredUsersTable(list)
    }
  }

  return list.length > 0 ? list : DEFAULT_SEED_USERS
}


/**
 * Save updated registered accounts list to the database table
 */
function saveRegisteredUsersTable(users: StoredUserAccount[]): void {
  try {
    localStorage.setItem(USERS_TABLE_KEY, JSON.stringify(users))
  } catch (err) {
    console.warn('Could not save users table to storage:', err)
  }
}

/**
 * Get current cached active profile
 */
export function getLocalProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY)
    if (!raw) return null
    const profile = JSON.parse(raw) as UserProfile

    // Verify that the cached profile actually exists in the registered database table (if not using remote Supabase)
    if (!isSupabaseConfigured() && profile && profile.email) {
      const allUsers = getRegisteredUsersTable()
      const exists = allUsers.some(
        (u) => u.email.toLowerCase() === profile.email.toLowerCase()
      )
      if (!exists) {
        // Clear invalid stale profile
        setLocalProfile(null)
        return null
      }
    }
    return profile
  } catch {
    return null
  }
}

/**
 * Save active profile to local storage session
 */
export function setLocalProfile(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(LOCAL_PROFILE_KEY)
      localStorage.removeItem(LOCAL_USER_KEY)
    }
  } catch (e) {
    console.warn('Error updating local profile cache:', e)
  }
}

/**
 * Sign up a new user.
 * Strictly validates that the email is not already taken.
 */
export async function signUpUser(params: {
  email: string
  password: string
  name: string
  phone: string
  vessel_name?: string
  home_port?: string
}): Promise<{ user: User | null; profile: UserProfile | null; error: string | null }> {
  const { email, password, name, phone, vessel_name, home_port } = params
  const normalizedEmail = email.trim().toLowerCase()

  // 1. If Supabase is connected to a live project
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name,
            phone,
            vessel_name: vessel_name || 'Matsya Sagar',
            home_port: home_port || 'Kochi Harbor',
          },
        },
      })

      if (error) {
        return { user: null, profile: null, error: error.message }
      }

      const user = data.user
      if (user) {
        const profile: UserProfile = {
          id: user.id,
          email: user.email || normalizedEmail,
          name,
          phone,
          vessel_name: vessel_name || 'Matsya Sagar',
          home_port: home_port || 'Kochi Harbor',
          role: 'skipper',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          await supabase.from('profiles').upsert(profile)
        } catch (dbErr) {
          console.warn('Supabase profiles table insert error:', dbErr)
        }

        setLocalProfile(profile)
        return { user, profile, error: null }
      }
    } catch (err: any) {
      return { user: null, profile: null, error: err.message || 'Registration failed' }
    }
  }

  // 2. Local Database Table validation
  const users = getRegisteredUsersTable()
  const existingUser = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  )

  if (existingUser) {
    return {
      user: null,
      profile: null,
      error: 'An account with this email address already exists. Please sign in instead.',
    }
  }

  const newId = 'user_' + Math.random().toString(36).substring(2, 11)
  const newAccount: StoredUserAccount = {
    id: newId,
    email: normalizedEmail,
    passwordHash: password, // In client mock table, stores password for strict comparison
    name: name.trim(),
    phone: phone.trim(),
    vessel_name: (vessel_name && vessel_name.trim()) || 'Matsya Sagar',
    home_port: home_port || 'Kochi (Cochin) Port',
    role: 'skipper',
    created_at: new Date().toISOString(),
  }

  // Save to database table
  saveRegisteredUsersTable([...users, newAccount])

  const newProfile: UserProfile = {
    id: newAccount.id,
    email: newAccount.email,
    name: newAccount.name,
    phone: newAccount.phone,
    vessel_name: newAccount.vessel_name,
    home_port: newAccount.home_port,
    role: newAccount.role,
    created_at: newAccount.created_at,
    updated_at: newAccount.created_at,
  }

  setLocalProfile(newProfile)

  return {
    user: {
      id: newAccount.id,
      email: newAccount.email,
      app_metadata: {},
      user_metadata: { name: newAccount.name, phone: newAccount.phone },
      aud: 'authenticated',
      created_at: newAccount.created_at,
    } as unknown as User,
    profile: newProfile,
    error: null,
  }
}

/**
 * Sign in existing user with email and password.
 * STRICT ENFORCEMENT:
 * - If email is not in the database table -> REJECT immediately.
 * - If password is incorrect -> REJECT immediately.
 * - Never create demo profiles or allow bypass.
 */
export async function signInUser(params: {
  email: string
  password: string
}): Promise<{ user: User | null; profile: UserProfile | null; error: string | null }> {
  const { email, password } = params
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Direct Administrator Verification: username = admin@123, pass = hello123
  if (normalizedEmail === 'admin@123') {
    if (password !== 'hello123') {
      return {
        user: null,
        profile: null,
        error: 'Incorrect password for admin account. Access denied.',
      }
    }
    const adminProfile: UserProfile = {
      id: 'admin_root_001',
      email: 'admin@123',
      name: 'SAR Mission Controller',
      phone: '+91 484 2216500',
      vessel_name: 'Coast Guard Command Vessel',
      home_port: 'Kochi Naval Enclave',
      role: 'admin',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLocalProfile(adminProfile)
    return {
      user: {
        id: adminProfile.id,
        email: adminProfile.email,
        app_metadata: { role: 'admin' },
        user_metadata: { name: adminProfile.name, role: 'admin' },
        aud: 'authenticated',
        created_at: adminProfile.created_at,
      } as unknown as User,
      profile: adminProfile,
      error: null,
    }
  }

  // 2. If Supabase is connected to a live project
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })


      if (error) {
        // Supabase returns 'Invalid login credentials' for both wrong user and wrong password
        return {
          user: null,
          profile: null,
          error: error.message || 'Invalid email or password. Access denied.',
        }
      }

      const user = data.user
      if (!user) {
        return {
          user: null,
          profile: null,
          error: 'No active user found in Supabase database.',
        }
      }

      // Check profiles table
      let profile: UserProfile | null = null
      try {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profData) {
          profile = profData as UserProfile
        }
      } catch (dbErr) {
        console.warn('Could not query profiles table:', dbErr)
      }

      if (!profile) {
        profile = {
          id: user.id,
          email: user.email || normalizedEmail,
          name: user.user_metadata?.name || normalizedEmail.split('@')[0],
          phone: user.user_metadata?.phone || '',
          vessel_name: user.user_metadata?.vessel_name || 'Matsya Sagar',
          home_port: user.user_metadata?.home_port || 'Kochi Harbor',
          role: 'skipper',
          created_at: user.created_at,
        }
      }

      setLocalProfile(profile)
      return { user, profile, error: null }
    } catch (err: any) {
      return {
        user: null,
        profile: null,
        error: err.message || 'Invalid login credentials. Access denied.',
      }
    }
  }

  // 2. Local Database Table validation
  const users = getRegisteredUsersTable()
  const account = users.find((u) => u.email.toLowerCase() === normalizedEmail)

  // RULE 1: If email is not in the table, REJECT
  if (!account) {
    return {
      user: null,
      profile: null,
      error: 'Account not found. No user is registered with this email address in the database.',
    }
  }

  // RULE 2: If password does not match, REJECT
  if (account.passwordHash !== password) {
    return {
      user: null,
      profile: null,
      error: 'Incorrect password. Please verify your credentials and try again.',
    }
  }

  // RULE 3: Only allow login when both email and password are valid
  const verifiedProfile: UserProfile = {
    id: account.id,
    email: account.email,
    name: account.name,
    phone: account.phone,
    vessel_name: account.vessel_name,
    home_port: account.home_port,
    role: account.role,
    created_at: account.created_at,
  }

  setLocalProfile(verifiedProfile)

  return {
    user: {
      id: account.id,
      email: account.email,
      app_metadata: {},
      user_metadata: { name: account.name, phone: account.phone },
      aud: 'authenticated',
      created_at: account.created_at,
    } as unknown as User,
    profile: verifiedProfile,
    error: null,
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Supabase signout error:', e)
    }
  }
  setLocalProfile(null)
}

/**
 * Insert SOS alert into Supabase `sos_alerts` table
 */
export async function insertSupabaseSOSAlert(alertData: {
  vessel_name: string
  registration_no: string
  skipper_name: string
  contact_phone: string
  crew_count: number
  lat: number
  lon: number
  distress_type: string
  severity: string
  emergency_message: string
  nearest_port?: string
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  try {
    const { error } = await supabase.from('sos_alerts').insert([
      {
        vessel_name: alertData.vessel_name,
        registration_no: alertData.registration_no,
        sender_name: alertData.skipper_name,
        contact_phone: alertData.contact_phone,
        crew_count: alertData.crew_count,
        lat: alertData.lat,
        lon: alertData.lon,
        distress_type: alertData.distress_type,
        severity: alertData.severity,
        emergency_message: alertData.emergency_message,
        nearest_port: alertData.nearest_port || 'Kochi Harbor',
        status: 'active',
      },
    ])
    if (error) {
      console.warn('Error inserting SOS into Supabase:', error)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase SOS insert failed:', err)
    return false
  }
}
