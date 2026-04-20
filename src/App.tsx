import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BohrDiagram } from './components/BohrDiagram'
import { NotationTile } from './components/NotationTile'
import { ProgressSidebar, type AnswerState } from './components/ProgressSidebar'
import { ELEMENT_BY_Z, ELEMENTS, type ElectronSlot } from './data/elements'
import { shuffle, type WrongRow } from './hooks/useQuiz'
import { evaluateAnswer } from './utils/evaluateAnswer'

type Phase = 'menu' | 'quiz' | 'results'

function App() {
  const { t, i18n } = useTranslation()
  const [phase, setPhase] = useState<Phase>('menu')
  const [order, setOrder] = useState<number[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wrongRows, setWrongRows] = useState<WrongRow[]>([])
  const [answerStates, setAnswerStates] = useState<AnswerState[]>([])

  const [symbol, setSymbol] = useState('')
  const [shellCount, setShellCount] = useState(0)
  const [placements, setPlacements] = useState<(ElectronSlot | null)[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const fullIds = useMemo(() => ELEMENTS.map((e) => e.z), [])

  const currentZ = order[currentIndex]
  const element = currentZ !== undefined ? ELEMENT_BY_Z.get(currentZ) : undefined

  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh-Hant' ? 'zh-Hant' : 'en'
    document.title = t('appTitle')
  }, [i18n.language, t])

  useEffect(() => {
    if (!element) return
    setSymbol('')
    setShellCount(0)
    setPlacements(Array.from({ length: element.z }, () => null))
    setFeedback(null)
  }, [element, currentIndex])

  const readOnlyDiagram = feedback !== null

  const handleConfirm = () => {
    if (!element || feedback !== null) return
    const studentSymbolDisplay = symbol.trim() || '—'
    const r = evaluateAnswer(element, symbol, shellCount, placements)
    if (!r.correct) {
      setWrongRows((w) => [
        ...w,
        {
          z: element.z,
          expectedSymbol: element.symbol,
          studentSymbol: studentSymbolDisplay,
          reasons: r.reasons,
        },
      ])

      setSymbol(element.symbol)
      setShellCount(element.expectedShells)
      const correctPlacements = Array.from({ length: element.z }, (_, i) => element.templateSlots[i] ?? null)
      setPlacements(correctPlacements)
    }
    setAnswerStates((prev) => {
      const next = prev.length === order.length ? [...prev] : Array.from({ length: order.length }, () => null)
      next[currentIndex] = r.correct ? 'correct' : 'wrong'
      return next
    })
    setFeedback(r.correct ? 'correct' : 'wrong')
  }

  const handleNext = () => {
    if (feedback === null) return
    if (currentIndex >= order.length - 1) {
      setPhase('results')
      return
    }
    setCurrentIndex((i) => i + 1)
    setFeedback(null)
  }

  const startFullQuiz = () => {
    const nextOrder = shuffle(fullIds)
    setOrder(nextOrder)
    setCurrentIndex(0)
    setWrongRows([])
    setAnswerStates(Array.from({ length: nextOrder.length }, () => null))
    setPhase('quiz')
  }

  const redoIncorrect = () => {
    const ids = [...new Set(wrongRows.map((r) => r.z))]
    if (ids.length === 0) return
    const nextOrder = shuffle(ids)
    setOrder(nextOrder)
    setCurrentIndex(0)
    setWrongRows([])
    setAnswerStates(Array.from({ length: nextOrder.length }, () => null))
    setPhase('quiz')
  }

  const resetAll = () => {
    setPhase('menu')
    setOrder([])
    setCurrentIndex(0)
    setWrongRows([])
    setAnswerStates([])
    setSymbol('')
    setShellCount(0)
    setPlacements([])
    setFeedback(null)
  }

  const total = order.length
  const wrong = wrongRows.length
  const correct = total - wrong
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0

  const langButton = (code: 'en' | 'zh-Hant', label: string) => (
    <button
      type="button"
      className={`lang-btn ${i18n.language === code ? 'lang-btn--active' : ''}`}
      onClick={() => void i18n.changeLanguage(code)}
    >
      {label}
    </button>
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__titles">
          <h1>{t('appTitle')}</h1>
          <p className="app-header__sub">{t('subtitle')}</p>
        </div>
        <div className="lang-switch" role="group" aria-label={t('language')}>
          <span className="lang-switch__label">{t('language')}:</span>
          {langButton('en', t('lang_en'))}
          {langButton('zh-Hant', t('lang_zh'))}
        </div>
      </header>

      <main className="app-main">
        {phase === 'menu' && (
          <section className="card">
            <p className="lead">{t('instructions')}</p>
            <button type="button" className="btn btn--primary" onClick={startFullQuiz}>
              {t('startQuiz')}
            </button>
          </section>
        )}

        {phase === 'quiz' && element && (
          <section className="quiz">
            <p className="quiz__progress">
              {t('questionProgress', { current: currentIndex + 1, total })}
            </p>
            <p className="quiz__hint">{t('instructions')}</p>

            <div className="quiz__layout">
              <div className="quiz__row">
                <NotationTile
                  massNumber={element.massNumber}
                  atomicNumber={element.z}
                  symbol={symbol}
                  onSymbolChange={setSymbol}
                  disabled={readOnlyDiagram}
                />
                <BohrDiagram
                  key={`${currentZ}-${currentIndex}`}
                  atomicNumber={element.z}
                  centerLabel={symbol}
                  shellCount={shellCount}
                  onShellCountChange={setShellCount}
                  placements={placements}
                  onPlacementsChange={setPlacements}
                  readOnly={readOnlyDiagram}
                />
              </div>

              <ProgressSidebar
                title={t('progressTitle')}
                answeredLabel={t('progressAnswered')}
                correctLabel={t('progressCorrect')}
                wrongLabel={t('progressWrong')}
                lockedItemLabel={t('progressLockedLabel')}
                currentIndex={currentIndex}
                answerStates={answerStates}
              />
            </div>

            <div className="quiz__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={readOnlyDiagram}
              >
                {t('confirm')}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleNext}
                disabled={feedback === null}
              >
                {t('next')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetAll}>
                {t('reset')}
              </button>
            </div>

            {feedback === 'correct' && (
              <p className="feedback feedback--ok" role="status">
                {t('feedbackCorrect')}
              </p>
            )}
            {feedback === 'wrong' && (
              <p className="feedback feedback--bad" role="status">
                {t('feedbackWrong')}
              </p>
            )}
          </section>
        )}

        {phase === 'results' && (
          <section className="card results">
            <h2>{t('resultsTitle')}</h2>
            <p className="results__score">{t('scorePercent', { percent })}</p>
            <p className="results__summary">
              {correct} / {total}
            </p>

            {wrongRows.length === 0 ? (
              <p>{t('noWrong')}</p>
            ) : (
              <>
                <h3>{t('wrongAnswers')}</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('col_z')}</th>
                        <th>{t('col_expected')}</th>
                        <th>{t('col_yours')}</th>
                        <th>{t('col_reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wrongRows.map((row, idx) => (
                        <tr key={`${row.z}-${idx}`}>
                          <td>{row.z}</td>
                          <td>{row.expectedSymbol}</td>
                          <td>{row.studentSymbol}</td>
                          <td>
                            {row.reasons.map((r) => (
                              <span key={r} className="reason-tag">
                                {t(r)}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="results__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={redoIncorrect}
                disabled={wrongRows.length === 0}
                title={wrongRows.length === 0 ? t('redoEmpty') : undefined}
              >
                {t('redoWrong')}
              </button>
              <button type="button" className="btn btn--secondary" onClick={startFullQuiz}>
                {t('startQuiz')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetAll}>
                {t('reset')}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
