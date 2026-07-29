'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ClientOption = { id: string; name: string; phone: string | null }

function labelFor(c: ClientOption): string {
  return c.phone ? `${c.name}（${c.phone}）` : c.name
}

export function ClientCombobox({
  clients,
  quickCreateClientAction,
}: {
  clients: ClientOption[]
  quickCreateClientAction: (formData: FormData) => Promise<ClientOption>
}) {
  const [allClients, setAllClients] = useState(clients)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [open, setOpen] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddPending, setQuickAddPending] = useState(false)
  const [showSelectionError, setShowSelectionError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // A hidden input's `required` attribute is silently ignored by the browser
  // (hidden fields are excluded from constraint validation), so typing a
  // search query without actually clicking a result used to submit the form
  // with clientId="" and crash on the database's foreign key constraint.
  // Validate for real on submit instead.
  useEffect(() => {
    const form = containerRef.current?.closest('form')
    if (!form) return
    function handleSubmit(e: SubmitEvent) {
      if (!selectedId) {
        e.preventDefault()
        e.stopImmediatePropagation()
        setShowSelectionError(true)
        setOpen(true)
      }
    }
    form.addEventListener('submit', handleSubmit, true)
    return () => form.removeEventListener('submit', handleSubmit, true)
  }, [selectedId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allClients
    return allClients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q)
    )
  }, [allClients, query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectClient(c: ClientOption) {
    setSelectedId(c.id)
    setQuery(labelFor(c))
    setOpen(false)
    setShowSelectionError(false)
  }

  function openQuickAdd() {
    setShowQuickAdd(true)
    setOpen(false)
  }

  async function handleQuickAdd() {
    const name = nameInputRef.current?.value.trim()
    if (!name) return
    const phone = phoneInputRef.current?.value.trim()
    const formData = new FormData()
    formData.set('name', name)
    if (phone) formData.set('phone', phone)

    setQuickAddPending(true)
    try {
      const created = await quickCreateClientAction(formData)
      setAllClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')))
      selectClient(created)
      setShowQuickAdd(false)
    } finally {
      setQuickAddPending(false)
    }
  }

  return (
    <div className="field client-combobox" ref={containerRef}>
      <label>客戶</label>
      <input type="hidden" name="clientId" value={selectedId} />
      <div className="client-combobox__row">
        <input
          type="text"
          placeholder="搜尋客戶（名稱或電話）"
          value={query}
          className={showSelectionError ? 'client-combobox__input--error' : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedId('')
            setOpen(true)
            setShowSelectionError(false)
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <button type="button" className="btn client-combobox__add-btn" onClick={openQuickAdd} title="快速新增客戶">
          +
        </button>
      </div>
      {showSelectionError && (
        <p className="client-combobox__error">請從清單選擇一個客戶，或用「+」新增</p>
      )}

      {open && (
        <ul className="client-combobox__list">
          {filtered.length === 0 ? (
            <li className="client-combobox__empty">
              找不到符合的客戶
              <button type="button" className="btn" onClick={openQuickAdd}>
                新增{query && `「${query}」`}
              </button>
            </li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => selectClient(c)}>
                  {labelFor(c)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {showQuickAdd && (
        <div className="client-combobox__quick-add">
          <input ref={nameInputRef} placeholder="客戶名稱" defaultValue={query} />
          <input ref={phoneInputRef} placeholder="聯絡電話（選填）" />
          <div className="client-combobox__quick-add-actions">
            <button type="button" className="btn" onClick={handleQuickAdd} disabled={quickAddPending}>
              {quickAddPending ? '新增中…' : '新增並選用'}
            </button>
            <button type="button" className="btn" onClick={() => setShowQuickAdd(false)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
