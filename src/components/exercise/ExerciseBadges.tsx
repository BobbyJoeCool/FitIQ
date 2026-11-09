import type { Exercise } from '../../lib/data'
import { vocabLabel } from '../../lib/exerciseVocabulary'
import styles from './exercise.module.css'

/** Custom / archived / no-media markers. "No demo" means neither images nor a video. */
export function ExerciseBadges({ exercise }: { exercise: Exercise }) {
  const noMedia = exercise.images.length === 0 && !exercise.videoUrl
  return (
    <div className={styles.badges}>
      {exercise.source === 'custom' && <span className={styles.badgeAccent}>Custom</span>}
      {exercise.isArchived && <span className={styles.badgeWarn}>Archived</span>}
      {noMedia && <span className={styles.badgeWarn}>No demo</span>}
      {exercise.difficulty && (
        <span className={styles.badge}>{vocabLabel(exercise.difficulty)}</span>
      )}
    </div>
  )
}
