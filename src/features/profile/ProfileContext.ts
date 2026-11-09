import { createContext, useContext } from 'react'
import type { Profile } from '../../lib/data'
import type { LengthUnit, WeightUnit } from '../../lib/units'

export interface ProfileState {
  /** Null until loaded, or if the profile row is missing. */
  profile: Profile | null
  /** The preferences to use now: the profile's, or imperial defaults (plan.md section 17). */
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  setProfile: (profile: Profile) => void
}

export const ProfileContext = createContext<ProfileState>({
  profile: null,
  weightUnit: 'lb',
  lengthUnit: 'in',
  setProfile: () => {},
})

export const useProfile = () => useContext(ProfileContext)
