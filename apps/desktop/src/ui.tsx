import { leaveTypes, type Kind, type LeaveType } from '@logbook/core'
import {
  mdiBeach,
  mdiCashRemove,
  mdiClockFast,
  mdiHomeOutline,
  mdiOfficeBuildingOutline,
  mdiPalmTree,
  mdiThermometer,
} from '@mdi/js'
import { useState, type ReactNode } from 'react'

// Same icons and colours as the phone (apps/mobile/src/theme.ts).
export const kindMeta: Record<Kind, { icon: string; tint: string }> = {
  office: { icon: mdiOfficeBuildingOutline, tint: 'var(--office)' },
  wfh: { icon: mdiHomeOutline, tint: 'var(--wfh)' },
  leave: { icon: mdiPalmTree, tint: 'var(--leave)' },
}

const leaveIcon: Record<LeaveType, string> = {
  personal: mdiBeach,
  sick: mdiThermometer,
  early: mdiClockFast,
  lop: mdiCashRemove,
}

export function Icon({ path, size = 18, tint = 'currentColor' }: { path: string; size?: number; tint?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={path} fill={tint} />
    </svg>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({
  label,
  icon,
  onClick,
  variant = 'secondary',
  tint = 'var(--office)',
  disabled = false,
  grow = false,
}: {
  label: string
  icon?: string
  onClick: () => void
  variant?: Variant
  tint?: string
  disabled?: boolean
  grow?: boolean
}) {
  const style = variant === 'primary' ? { background: tint, borderColor: tint } : variant === 'ghost' ? { color: tint } : undefined
  return (
    <button type="button" className={`button ${variant}${grow ? ' grow' : ''}`} style={style} disabled={disabled} onClick={onClick}>
      {icon ? <Icon path={icon} tint={variant === 'secondary' ? tint : 'currentColor'} /> : null}
      <span>{label}</span>
    </button>
  )
}

export function Chip({ label, icon, selected, onClick }: { label: string; icon?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`chip${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {icon ? <Icon path={icon} size={16} /> : null}
      {label}
    </button>
  )
}

// ‹ label › stepper for months and years. Clicking the label jumps back to the current period.
export function PeriodNav({ label, onPrev, onNext, onReset }: { label: string; onPrev: () => void; onNext: () => void; onReset?: () => void }) {
  return (
    <div className="period">
      <button type="button" className="step" aria-label="Previous" onClick={onPrev}>
        ‹
      </button>
      <button type="button" className="period-label" disabled={!onReset} onClick={onReset} title={onReset ? 'Back to now' : undefined}>
        {label}
        {onReset ? <small>Back to now</small> : null}
      </button>
      <button type="button" className="step" aria-label="Next" onClick={onNext}>
        ›
      </button>
    </div>
  )
}

// Pick a type, optionally add a note, then Save. Nothing is recorded until Save.
export function LeaveForm({
  initialType,
  initialNote = '',
  onCancel,
  onSave,
}: {
  initialType?: LeaveType
  initialNote?: string
  onCancel: () => void
  onSave: (leaveType: LeaveType, note: string) => void
}) {
  const [leaveType, setLeaveType] = useState<LeaveType | undefined>(initialType)
  const [note, setNote] = useState(initialNote)
  return (
    <div className="stack">
      <div className="chips">
        {leaveTypes.map((item) => (
          <Chip key={item.id} label={item.label} icon={leaveIcon[item.id]} selected={leaveType === item.id} onClick={() => setLeaveType(item.id)} />
        ))}
      </div>
      {leaveType ? (
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} placeholder="Note (optional)" rows={2} />
      ) : null}
      <div className="row">
        <Button label="Cancel" grow onClick={onCancel} />
        <Button
          label="Save leave"
          variant="primary"
          tint="var(--leave)"
          grow
          disabled={!leaveType}
          onClick={() => leaveType && onSave(leaveType, note.trim().slice(0, 280))}
        />
      </div>
    </div>
  )
}

export type ConfirmSpec = { title: string; message: string; action: string; onConfirm: () => void }

// The webview has no native confirm(), so questions open over the widget instead.
export function useConfirm(): [ReactNode, (spec: ConfirmSpec) => void] {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null)
  const node = spec ? (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={spec.title}>
      <div className="sheet">
        <strong>{spec.title}</strong>
        <p className="muted">{spec.message}</p>
        <div className="row">
          <Button label="Cancel" grow onClick={() => setSpec(null)} />
          <Button
            label={spec.action}
            variant="danger"
            grow
            onClick={() => {
              spec.onConfirm()
              setSpec(null)
            }}
          />
        </div>
      </div>
    </div>
  ) : null
  return [node, setSpec]
}
