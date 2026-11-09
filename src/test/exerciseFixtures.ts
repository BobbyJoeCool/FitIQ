import type { Exercise } from '../lib/data'

export function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'Barbell_Squat',
    source: 'catalog',
    name: 'Barbell Squat',
    description: null,
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'barbell',
    difficulty: 'beginner',
    movementType: 'strength',
    force: 'push',
    mechanic: 'compound',
    instructions: ['Stand under the bar.', 'Squat down.'],
    images: ['https://cdn.example/Barbell_Squat/0.jpg', 'https://cdn.example/Barbell_Squat/1.jpg'],
    videoUrl: null,
    videoSourceName: null,
    isArchived: false,
    ...overrides,
  }
}

export const LIBRARY: Exercise[] = [
  makeExercise(),
  makeExercise({
    id: 'Dumbbell_Bench_Press',
    name: 'Dumbbell Bench Press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
  }),
  makeExercise({
    id: 'Hamstring_Stretch',
    name: 'Hamstring Stretch',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    equipment: null,
    movementType: 'stretching',
    images: [],
  }),
  makeExercise({
    id: '7b0c4a6e-0000-4000-8000-000000000001',
    source: 'custom',
    name: 'Walking Pad Incline Walk',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    equipment: 'machine',
    movementType: 'cardio',
    instructions: [],
    images: [],
    videoUrl: 'https://youtu.be/abcdefghijk',
  }),
  makeExercise({
    id: '7b0c4a6e-0000-4000-8000-000000000002',
    source: 'custom',
    name: 'Old Band Pull',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: 'bands',
    images: [],
    isArchived: true,
  }),
]
