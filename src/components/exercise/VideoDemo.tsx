import { useState } from 'react'
import { videoEmbedUrl, videoHost } from '../../features/exercises/video'
import controls from '../../styles/controls.module.css'
import styles from './exercise.module.css'

/**
 * Nothing loads from the video site until the user taps (plan.md section 7).
 * The plain link is always there, for sites we can't embed or embeds that are blocked.
 */
export function VideoDemo({
  url,
  sourceName,
  title,
}: {
  url: string
  sourceName: string | null
  title: string
}) {
  const [open, setOpen] = useState(false)
  const embed = videoEmbedUrl(url)
  const source = sourceName || videoHost(url)

  return (
    <div className={styles.video}>
      {embed && !open && (
        <div>
          <button type="button" className={controls.button} onClick={() => setOpen(true)}>
            Play video
          </button>
        </div>
      )}
      {embed && open && (
        <iframe
          className={styles.frame}
          src={`${embed}?autoplay=1&rel=0`}
          title={`${title} video`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open the video on {source}
      </a>
    </div>
  )
}
