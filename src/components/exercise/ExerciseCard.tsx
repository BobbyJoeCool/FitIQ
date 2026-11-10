import { Link } from 'react-router'
import type { Exercise } from '../../lib/data'
import { vocabLabel } from '../../lib/exerciseVocabulary'
import { exercisePath } from '../../features/exercises/paths'
import { ExerciseBadges } from './ExerciseBadges'
import styles from './exercise.module.css'

/** `linkState` is passed to the detail link, e.g. where to return to. */
export function ExerciseCard({ exercise, linkState }: { exercise: Exercise; linkState?: unknown }) {
  const muscles = exercise.primaryMuscles.map(vocabLabel).join(', ')
  const meta = [muscles, exercise.equipment && vocabLabel(exercise.equipment)]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link to={exercisePath(exercise)} state={linkState} className={styles.card}>
      {exercise.images[0] ? (
        <img
          className={styles.thumb}
          src={exercise.images[0]}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className={styles.noThumb} aria-hidden="true">
          {exercise.videoUrl ? 'Video' : 'No images'}
        </span>
      )}
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{exercise.name}</span>
        {meta && <span className={styles.cardMeta}>{meta}</span>}
        <ExerciseBadges exercise={exercise} />
      </span>
    </Link>
  )
}
