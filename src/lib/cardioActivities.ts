/** Cardio activity types. Keep in sync with the cardio_sessions CHECK constraint. */
export const CARDIO_ACTIVITIES = [
  'walking_pad',
  'walk',
  'run',
  'cycle',
  'elliptical',
  'rowing',
  'swim',
  'hike',
  'other',
] as const

export type CardioActivity = (typeof CARDIO_ACTIVITIES)[number]

export const CARDIO_LABELS: Record<CardioActivity, string> = {
  walking_pad: 'Walking pad',
  walk: 'Walk',
  run: 'Run',
  cycle: 'Cycle',
  elliptical: 'Elliptical',
  rowing: 'Rowing',
  swim: 'Swim',
  hike: 'Hike',
  other: 'Other',
}

/** Activities where incline makes sense (treadmill-style machines). */
export const HAS_INCLINE: CardioActivity[] = ['walking_pad', 'walk', 'run', 'hike']
