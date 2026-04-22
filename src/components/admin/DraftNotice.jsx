import { formatDraftTimestamp } from '@/hooks/useAdminDraft'

function DraftNotice({ active = false, restoredAt = null, lastSavedAt = null, saveError = null, onDiscard = null }) {
  if (!active && !restoredAt && !saveError) {
    return null
  }

  let title = 'Crash recovery is on.'
  let meta = 'Unsaved changes are being stored in this browser while you edit.'
  let className = 'draft-notice'

  if (restoredAt) {
    title = 'Recovered an unsaved draft.'
    meta = `Restored from ${formatDraftTimestamp(restoredAt)}.`
    className += ' draft-notice--restored'
  } else if (lastSavedAt) {
    meta = `Last local save: ${formatDraftTimestamp(lastSavedAt)}.`
  }

  if (saveError) {
    title = 'Local draft saving failed.'
    meta = 'This browser could not store a recovery draft. Save manually before leaving this page.'
    className += ' draft-notice--error'
  }

  return (
    <div className={className}>
      <div className="draft-notice__content">
        <strong className="draft-notice__title">{title}</strong>
        <span className="draft-notice__meta">{meta}</span>
      </div>
      {onDiscard ? (
        <button type="button" className="draft-notice__action" onClick={onDiscard}>
          Discard Draft
        </button>
      ) : null}
    </div>
  )
}

export default DraftNotice
