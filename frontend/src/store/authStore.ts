import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import {
  UserProfile,
  getLocalProfile,
  signInUser,
  signUpUser,
  signOutUser,
  setLocalProfile,
  supabase,
  isSupabaseConfigured,
} from '../services/supabase'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<boolean>
  register: (params: {
    name: string
    phone: string
    email: string
    password: string
    vessel_name?: string
    home_port?: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>
  clearError: () => void
  initSession: () => Promise<void>
}

// Check initial local cached state
const initialCachedProfile = getLocalProfile()

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialCachedProfile
    ? ({
        id: initialCachedProfile.id,
        email: initialCachedProfile.email,
        app_metadata: {},
        aud: 'authenticated',
        created_at: initialCachedProfile.created_at || new Date().toISOString(),
        user_metadata: {
          name: initialCachedProfile.name,
          phone: initialCachedProfile.phone,
        },
      } as unknown as User)
    : null,

  profile: initialCachedProfile,
  isAuthenticated: !!initialCachedProfile,
  isLoading: false,
  error: null,

  initSession: async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session?.user) {
          const user = data.session.user
          // Attempt fetching profile
          let prof = getLocalProfile()
          if (!prof || prof.id !== user.id) {
            prof = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 'Skipper Master',
              phone: user.user_metadata?.phone || '',
              vessel_name: user.user_metadata?.vessel_name || 'Matsya Sagar',
              home_port: user.user_metadata?.home_port || 'Kochi Harbor',
              role: 'skipper',
              created_at: user.created_at,
            }
            setLocalProfile(prof)
          }
          set({ user, profile: prof, isAuthenticated: true })
        }
      } catch (err) {
        console.warn('Supabase session recovery error:', err)
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await signInUser({ email, password })
      if (res.error) {
        set({ error: res.error, isLoading: false })
        return false
      }
      set({
        user: res.user,
        profile: res.profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return true
    } catch (err: any) {
      set({
        error: err.message || 'Login failed. Please verify credentials.',
        isLoading: false,
      })
      return false
    }
  },

  register: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const res = await signUpUser(params)
      if (res.error) {
        set({ error: res.error, isLoading: false })
        return false
      }
      set({
        user: res.user,
        profile: res.profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return true
    } catch (err: any) {
      set({
        error: err.message || 'Registration failed. Please check your details.',
        isLoading: false,
      })
      return false
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await signOutUser()
    } finally {
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  updateProfile: async (updated: Partial<UserProfile>) => {
    const current = get().profile
    if (!current) return

    const merged: UserProfile = {
      ...current,
      ...updated,
      updated_at: new Date().toISOString(),
    }

    setLocalProfile(merged)
    set({ profile: merged })

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('profiles').upsert(merged)
      } catch (e) {
        console.warn('Could not sync profile update with Supabase:', e)
      }
    }
  },

  clearError: () => set({ error: null }),
}))
