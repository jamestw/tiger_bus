'use client'

import { useState } from 'react'
import type { Client } from '@prisma/client'

export function ClientRow({
  client,
  canManage,
  updateAction,
  deleteAction,
}: {
  client: Client
  canManage: boolean
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <tr>
        <td colSpan={canManage ? 3 : 2}>
          <form
            className="row-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await updateAction(new FormData(e.currentTarget))
              setIsEditing(false)
            }}
          >
            <input type="hidden" name="clientId" value={client.id} />
            <input name="name" defaultValue={client.name} required style={{ maxWidth: 160 }} />
            <input name="phone" defaultValue={client.phone ?? ''} placeholder="聯絡電話" style={{ maxWidth: 150 }} />
            <button className="btn" type="submit">
              儲存
            </button>
            <button className="btn" type="button" onClick={() => setIsEditing(false)}>
              取消
            </button>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{client.name}</td>
      <td>{client.phone ?? '—'}</td>
      {canManage && (
        <td>
          <div className="row-form">
            <button className="btn" type="button" onClick={() => setIsEditing(true)}>
              編輯
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!confirm(`確定要刪除客戶「${client.name}」嗎？（軟刪除，歷史行程資料仍會保留）`)) return
                await deleteAction(new FormData(e.currentTarget))
              }}
            >
              <input type="hidden" name="clientId" value={client.id} />
              <button className="btn btn-danger" type="submit">
                刪除
              </button>
            </form>
          </div>
        </td>
      )}
    </tr>
  )
}
