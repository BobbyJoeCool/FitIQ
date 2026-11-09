import type { RouteObject } from 'react-router'
import { RequireAuth } from '../features/auth/RequireAuth'
import {
  ConfirmEmailLinkPage,
  ForgotPasswordPage,
  SetPasswordPage,
} from '../features/auth/PasswordPages'
import { SignInPage } from '../features/auth/SignInPage'
import { CardioPage } from '../features/cardio/CardioPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { CustomExerciseDetailPage } from '../features/exercises/CustomExerciseDetailPage'
import { CustomExerciseFormPage } from '../features/exercises/CustomExerciseFormPage'
import { ExerciseDetailPage } from '../features/exercises/ExerciseDetailPage'
import { ExercisesPage } from '../features/exercises/ExercisesPage'
import { ProgressPage } from '../features/progress/ProgressPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AddExercisesPage } from '../features/workout-plans/AddExercisesPage'
import { PlanBuilderPage } from '../features/workout-plans/PlanBuilderPage'
import { PlanFormPage } from '../features/workout-plans/PlanFormPage'
import { PlansPage } from '../features/workout-plans/PlansPage'
import { StarterPlansPage } from '../features/workout-plans/StarterPlansPage'
import { WorkoutPage } from '../features/workout-sessions/WorkoutPage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/confirm', element: <ConfirmEmailLinkPage /> },
  {
    path: '/set-password',
    element: (
      <RequireAuth>
        <SetPasswordPage />
      </RequireAuth>
    ),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/custom/new', element: <CustomExerciseFormPage /> },
      { path: 'exercises/custom/:id', element: <CustomExerciseDetailPage /> },
      { path: 'exercises/custom/:id/edit', element: <CustomExerciseFormPage /> },
      { path: 'exercises/:exerciseId', element: <ExerciseDetailPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'plans/new', element: <PlanFormPage /> },
      { path: 'plans/starters', element: <StarterPlansPage /> },
      { path: 'plans/:id', element: <PlanBuilderPage /> },
      { path: 'plans/:id/edit', element: <PlanFormPage /> },
      { path: 'plans/:id/add', element: <AddExercisesPage /> },
      { path: 'workout', element: <WorkoutPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'cardio', element: <CardioPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
