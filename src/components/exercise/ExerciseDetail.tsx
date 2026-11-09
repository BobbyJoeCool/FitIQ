import type { ReactNode } from 'react'
import { CATALOG_SOURCE, type Exercise } from '../../lib/data'
import { vocabLabel } from '../../lib/exerciseVocabulary'
import { ExerciseBadges } from './ExerciseBadges'
import { VideoDemo } from './VideoDemo'
import styles from './exercise.module.css'

const list = (values: string[]) => values.map(vocabLabel).join(', ')

export function ExerciseDetail({ exercise, actions }: { exercise: Exercise; actions?: ReactNode }) {
  const facts: [string, string | null][] = [
    ['Primary muscles', list(exercise.primaryMuscles) || null],
    ['Secondary muscles', list(exercise.secondaryMuscles) || null],
    ['Equipment', exercise.equipment && vocabLabel(exercise.equipment)],
    ['Movement type', exercise.movementType && vocabLabel(exercise.movementType)],
    ['Force', exercise.force && vocabLabel(exercise.force)],
    ['Mechanic', exercise.mechanic && vocabLabel(exercise.mechanic)],
  ]

  return (
    <article className={styles.detail}>
      <header className={styles.detailHeader}>
        <h1>{exercise.name}</h1>
        <ExerciseBadges exercise={exercise} />
      </header>

      {actions && <div className={styles.actions}>{actions}</div>}

      <dl className={styles.facts}>
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {exercise.images.length > 0 && (
        <section aria-label="Images" className={styles.images}>
          {exercise.images.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={`${exercise.name}, ${index === 0 ? 'starting' : 'ending'} position`}
              width={850}
              height={567}
              loading="lazy"
              decoding="async"
            />
          ))}
        </section>
      )}

      {exercise.videoUrl && (
        <section>
          <h2>Video</h2>
          <VideoDemo
            url={exercise.videoUrl}
            sourceName={exercise.videoSourceName}
            title={exercise.name}
          />
        </section>
      )}

      {exercise.images.length === 0 && !exercise.videoUrl && (
        <p className={styles.attribution}>This exercise has no images or video.</p>
      )}

      {exercise.instructions.length > 0 && (
        <section>
          <h2>How to do it</h2>
          <ol className={styles.steps}>
            {exercise.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {exercise.description && (
        <section>
          <h2>Notes</h2>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{exercise.description}</p>
        </section>
      )}

      {exercise.source === 'catalog' && (
        <p className={styles.attribution}>
          Exercise data and images from{' '}
          <a href={CATALOG_SOURCE.url} target="_blank" rel="noopener noreferrer">
            {CATALOG_SOURCE.name}
          </a>
          , {CATALOG_SOURCE.license}.
        </p>
      )}
    </article>
  )
}
