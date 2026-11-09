import type { RouteObject } from 'react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import { SignInPage } from '../features/auth/SignInPage'
import { CardioPage } from '../features/cardio/CardioPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { CustomExerciseDetailPage } from '../features/exercises/CustomExerciseDetailPage'
import { ExerciseDetailPage } from '../features/exercises/ExerciseDetailPage'
import { ExercisesPage } from '../features/exercises/ExercisesPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { PlansPage } from '../features/workout-plans/PlansPage'
import { WorkoutPage } from '../features/workout-sessions/WorkoutPage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/custom/:id', element: <CustomExerciseDetailPage /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetailPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'cardio', element: <CardioPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
