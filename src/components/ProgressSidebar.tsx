export type AnswerState = 'correct' | 'wrong' | null

type Props = {
  title: string
  answeredLabel: string
  correctLabel: string
  wrongLabel: string
  lockedItemLabel: string
  currentIndex: number
  answerStates: AnswerState[]
}

export function ProgressSidebar({
  title,
  answeredLabel,
  correctLabel,
  wrongLabel,
  lockedItemLabel,
  currentIndex,
  answerStates,
}: Props) {
  const answered = answerStates.filter((s) => s !== null).length
  const correct = answerStates.filter((s) => s === 'correct').length
  const wrong = answerStates.filter((s) => s === 'wrong').length

  return (
    <aside className="progress-sidebar" aria-label={title}>
      <div className="progress-sidebar__card">
        <h2 className="progress-sidebar__title">{title}</h2>

        <dl className="progress-sidebar__stats">
          <div className="progress-sidebar__stat">
            <dt className="progress-sidebar__stat-label">{answeredLabel}</dt>
            <dd className="progress-sidebar__stat-value">{answered}</dd>
          </div>
          <div className="progress-sidebar__stat">
            <dt className="progress-sidebar__stat-label">{correctLabel}</dt>
            <dd className="progress-sidebar__stat-value progress-sidebar__stat-value--ok">{correct}</dd>
          </div>
          <div className="progress-sidebar__stat">
            <dt className="progress-sidebar__stat-label">{wrongLabel}</dt>
            <dd className="progress-sidebar__stat-value progress-sidebar__stat-value--bad">{wrong}</dd>
          </div>
        </dl>

        <ol className="progress-sidebar__list" aria-label={title}>
          {answerStates.map((state, idx) => {
            const isCurrent = idx === currentIndex
            const classes = [
              'progress-sidebar__item',
              state === null ? 'progress-sidebar__item--locked' : '',
              state === 'correct' ? 'progress-sidebar__item--ok' : '',
              state === 'wrong' ? 'progress-sidebar__item--bad' : '',
              isCurrent ? 'progress-sidebar__item--current' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <li key={idx} className={classes}>
                <span className="visually-hidden">
                  {state === null ? lockedItemLabel : state === 'correct' ? correctLabel : wrongLabel}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </aside>
  )
}

