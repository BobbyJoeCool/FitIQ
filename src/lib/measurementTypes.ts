/** Body measurement types. Keep in sync with the body_measurements CHECK constraint. */
export const MEASUREMENT_TYPES = [
  'waist',
  'hips',
  'chest',
  'neck',
  'shoulders',
  'left_arm',
  'right_arm',
  'left_thigh',
  'right_thigh',
  'left_calf',
  'right_calf',
  'body_fat',
] as const

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number]
