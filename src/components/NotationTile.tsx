import { useTranslation } from 'react-i18next'

type Props = {
  massNumber: number
  atomicNumber: number
  symbol: string
  onSymbolChange: (v: string) => void
  disabled?: boolean
}

export function NotationTile({
  massNumber,
  atomicNumber,
  symbol,
  onSymbolChange,
  disabled,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="notation-tile" role="group" aria-label={t('elementSymbol')}>
      <span className="notation-tile__mass" aria-label={t('massNumber')}>
        {massNumber}
      </span>
      <span className="notation-tile__z" aria-label={t('atomicNumber')}>
        {atomicNumber}
      </span>
      <label className="notation-tile__symbol-wrap">
        <span className="visually-hidden">{t('elementSymbol')}</span>
        <input
          className="notation-tile__symbol"
          type="text"
          maxLength={3}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder=" "
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
