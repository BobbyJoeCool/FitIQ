import type { PlanTargets } from '../../lib/data'

/**
 * Ready-made routines a user can copy into their own plans (step 4.4,
 * docs/future-versions.md FV-1). They live in code, not the database: copying
 * one creates an ordinary private plan the user can then change.
 *
 * Every `id` must exist in the pinned Free Exercise DB commit; a test checks.
 */
export interface StarterExercise {
  id: string
  targets: PlanTargets
}

export interface StarterPlan {
  slug: string
  name: string
  description: string
  summary: string
  exercises: StarterExercise[]
}

const hold = (id: string, perSide: boolean): StarterExercise => ({
  id,
  targets: {
    targetSets: 1,
    targetReps: null,
    restSeconds: 0,
    targetSeconds: 30,
    targetReleaseSeconds: null,
    perSide,
    notes: null,
  },
})

export const STARTER_PLANS: StarterPlan[] = [
  {
    slug: 'full-body-stretch',
    name: 'Full-body stretch',
    description:
      'Fourteen gentle static stretches from head to toe, standing first and then on the floor. Hold each one for 30 seconds without bouncing.',
    summary: 'Beginner · no equipment · about 12 minutes',
    exercises: [
      hold('Side_Neck_Stretch', true),
      hold('Elbows_Back', false),
      hold('Shoulder_Stretch', true),
      hold('Triceps_Stretch', true),
      hold('Upper_Back_Stretch', false),
      hold('Standing_Lateral_Stretch', true),
      hold('Calf_Stretch_Hands_Against_Wall', true),
      hold('Kneeling_Hip_Flexor', true),
      hold('On_Your_Side_Quad_Stretch', true),
      hold('Hamstring_Stretch', true),
      hold('Knee_Across_The_Body', true),
      hold('Side_Lying_Groin_Stretch', true),
      hold('Cat_Stretch', false),
      hold('Childs_Pose', false),
    ],
  },
]
