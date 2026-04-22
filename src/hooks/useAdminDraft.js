import { useEffect, useRef, useState } from 'react'

const DB_NAME = 'andrea-admin-drafts'
const STORE_NAME = 'drafts'
const LOCAL_STORAGE_PREFIX = 'andrea-admin-draft:'

let dbPromise

function hasBrowserStorage() {
  return typeof window !== 'undefined'
}

function getLocalStorageKey(draftKey) {
  return `${LOCAL_STORAGE_PREFIX}${draftKey}`
}

function sanitizeDraft(record) {
  if (!record || typeof record !== 'object') {
    return null
  }

  return {
    key: record.key,
    data: record.data ?? null,
    savedAt: record.savedAt ?? null,
  }
}

function readLocalDraft(draftKey) {
  if (!hasBrowserStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(draftKey))
    return raw ? sanitizeDraft(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeLocalDraft(record) {
  if (!hasBrowserStorage()) {
    return false
  }

  try {
    window.localStorage.setItem(getLocalStorageKey(record.key), JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

function clearLocalDraft(draftKey) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(getLocalStorageKey(draftKey))
  } catch {
    // Ignore local storage cleanup errors.
  }
}

async function openDraftDatabase() {
  if (!hasBrowserStorage() || !('indexedDB' in window)) {
    return null
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(DB_NAME, 1)

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    })
  }

  return dbPromise
}

async function withStore(mode, runRequest) {
  const database = await openDraftDatabase()
  if (!database) {
    return null
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = runRequest(store)

    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error || new Error('Draft storage request failed'))
    transaction.onerror = () => reject(transaction.error || new Error('Draft storage transaction failed'))
  })
}

export async function loadAdminDraft(draftKey) {
  if (!hasBrowserStorage()) {
    return null
  }

  try {
    const indexedDbRecord = await withStore('readonly', (store) => store.get(draftKey))
    const sanitizedIndexedDbRecord = sanitizeDraft(indexedDbRecord)
    if (sanitizedIndexedDbRecord) {
      return sanitizedIndexedDbRecord
    }
  } catch {
    // Fall back to localStorage below.
  }

  return readLocalDraft(draftKey)
}

export async function saveAdminDraft(draftKey, data) {
  if (!hasBrowserStorage()) {
    return null
  }

  const record = {
    key: draftKey,
    data,
    savedAt: new Date().toISOString(),
  }

  let savedToIndexedDb = false
  try {
    const database = await openDraftDatabase()
    if (database) {
      await withStore('readwrite', (store) => store.put(record))
      savedToIndexedDb = true
    }
  } catch {
    savedToIndexedDb = false
  }

  const savedToLocalStorage = writeLocalDraft(record)

  if (!savedToIndexedDb && !savedToLocalStorage) {
    throw new Error('No browser draft storage is available')
  }

  return record
}

export async function clearAdminDraft(draftKey) {
  if (!hasBrowserStorage()) {
    return
  }

  try {
    await withStore('readwrite', (store) => store.delete(draftKey))
  } finally {
    clearLocalDraft(draftKey)
  }
}

export function formatDraftTimestamp(timestamp) {
  if (!timestamp) {
    return ''
  }

  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString()
}

export function useAutoSaveDraft(draftKey, draftData, { enabled = true, delay = 600 } = {}) {
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const timeoutRef = useRef(null)
  const latestDraftDataRef = useRef(draftData)
  const serializedDraftData = JSON.stringify(draftData)

  useEffect(() => {
    latestDraftDataRef.current = draftData
  }, [draftData, serializedDraftData])

  useEffect(() => {
    if (!enabled || !hasBrowserStorage()) {
      return undefined
    }

    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(async () => {
      try {
        const record = await saveAdminDraft(draftKey, latestDraftDataRef.current)
        setLastSavedAt(record?.savedAt || null)
        setSaveError(null)
      } catch (error) {
        setSaveError(error)
      }
    }, delay)

    return () => {
      window.clearTimeout(timeoutRef.current)
    }
  }, [delay, draftKey, enabled, serializedDraftData])

  useEffect(() => () => {
    if (hasBrowserStorage()) {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return { lastSavedAt, saveError }
}
