import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../../lib/data'
import { NO_TARGETS } from '../../lib/data/plans'
import { cardioCsv, measurementsCsv, weighInsCsv, workoutsCsv } from './exportCsv'

const lines = (csv: string) => csv.replace('﻿', '').trimEnd().split('\r\n')

describe('CSV export', () => {
  it('writes one row per set with units, and a row for skipped exercises', () => {
    const session: WorkoutSession = {
      id: 'w',
      name: 'Leg Day',
      planId: null,
      startedAt: '2026-11-09T15:00:00.000Z',
      completedAt: '2026-11-09T16:00:00.000Z',
      notes: 'Good, strong',
      exercises: [
        {
          id: 'e1',
          sessionId: 'w',
          exercise: { source: 'catalog', id: 'Barbell_Squat' },
          exerciseName: 'Barbell Squat',
          sortOrder: 0,
          isSkipped: false,
          targets: NO_TARGETS,
          sets: [
            {
              id: 's1',
              sessionExerciseId: 'e1',
              setNumber: 1,
              reps: 5,
              weightValue: 60,
              weightUnit: 'kg',
              isBodyweight: false,
              durationSeconds: null,
              distanceValue: null,
              distanceUnit: null,
              notes: null,
              completedAt: '',
            },
          ],
        },
        {
          id: 'e2',
          sessionId: 'w',
          exercise: { source: 'catalog', id: 'Lunge' },
          exerciseName: 'Lunge',
          sortOrder: 1,
          isSkipped: true,
          targets: NO_TARGETS,
          sets: [],
        },
      ],
    }
    const [header, first, second] = lines(workoutsCsv([session]))
    expect(header.split(',')).toContain('weight_unit')
    expect(first).toContain(
      ',Leg Day,2026-11-09T15:00:00.000Z,2026-11-09T16:00:00.000Z,1,Barbell Squat,done,1,5,no,60,kg,,,,,"Good, strong"',
    )
    expect(second).toContain(',2,Lunge,skipped,')
  })

  it('exports weigh-ins, measurements, and cardio with a unit on every row', () => {
    expect(
      lines(
        weighInsCsv([
          {
            id: 'w',
            recordedAt: '2026-11-09T13:00:00.000Z',
            value: 180.5,
            unit: 'lb',
            notes: null,
          },
        ]),
      )[1],
    ).toMatch(/^\d{4}-\d{2}-\d{2},2026-11-09T13:00:00.000Z,180.5,lb,$/)
    expect(
      lines(
        measurementsCsv([
          {
            id: 'm',
            recordedAt: '2026-11-09T13:00:00.000Z',
            type: 'body_fat',
            value: 22.5,
            unit: '%',
            notes: 'a, b',
          },
        ]),
      )[1],
    ).toMatch(/,Body fat,22.5,%,"a, b"$/)
    expect(
      lines(
        cardioCsv([
          {
            id: 'c',
            activity: 'walking_pad',
            startedAt: '2026-11-09T13:00:00.000Z',
            durationSeconds: 1800,
            distanceValue: 1.4,
            distanceUnit: 'mi',
            incline: 0,
            notes: null,
          },
        ]),
      )[1],
    ).toMatch(/,Walking pad,1800,1.4,mi,0,$/)
  })
})
