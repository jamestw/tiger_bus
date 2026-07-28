'use client'

import { useState } from 'react'
import type { LineItemPreset } from '@prisma/client'

export function AddLineItemForm({
  tripId,
  presets,
  addLineItemAction,
}: {
  tripId: string
  presets: LineItemPreset[]
  addLineItemAction: (formData: FormData) => Promise<void>
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const selectedPreset = presets.find((p) => p.id === selectedPresetId)

  return (
    <>
      <form action={addLineItemAction} className="inline-form" style={{ marginTop: '1rem' }}>
        <input type="hidden" name="tripId" value={tripId} />
        <div className="field">
          <label>常用項目</label>
          <select
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
          >
            <option value="">— 手動輸入（見下方）—</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.type === 'REVENUE' ? '收入' : '支出'}）
              </option>
            ))}
          </select>
        </div>

        {selectedPreset ? (
          <>
            <input type="hidden" name="type" value={selectedPreset.type} />
            <input type="hidden" name="name" value={selectedPreset.name} />
            <div className="field">
              <label>類型（依常用項目自動帶入）</label>
              <input value={selectedPreset.type === 'REVENUE' ? '收入' : '支出'} disabled />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>類型</label>
              <select name="type" required defaultValue="REVENUE">
                <option value="REVENUE">收入</option>
                <option value="COST">支出</option>
              </select>
            </div>
            <div className="field">
              <label>項目名稱</label>
              <input name="name" placeholder="車資 / 油資" required />
            </div>
          </>
        )}

        <div className="field">
          <label>金額</label>
          <input name="amount" type="number" min="0" step="1" required />
        </div>
        <button className="btn" type="submit">
          新增項目
        </button>
      </form>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
        選常用項目時類型會自動帶入，不會選錯；常用項目可在「車行設定」頁管理
      </p>
    </>
  )
}
