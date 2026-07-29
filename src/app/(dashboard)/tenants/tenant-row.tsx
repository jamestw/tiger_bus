'use client'

import { useState } from 'react'
import type { TenantStatus } from '@prisma/client'

export function TenantRow({
  tenant,
  updateAction,
  setStatusAction,
}: {
  tenant: { id: string; name: string; adminName: string | null; status: TenantStatus; createdAt: Date }
  updateAction: (formData: FormData) => Promise<void>
  setStatusAction: (formData: FormData) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const nextStatus: TenantStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  const nextStatusLabel = nextStatus === 'SUSPENDED' ? '停用' : '啟用'

  if (isEditing) {
    return (
      <tr>
        <td colSpan={5}>
          <form
            className="row-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await updateAction(new FormData(e.currentTarget))
              setIsEditing(false)
            }}
          >
            <input type="hidden" name="tenantId" value={tenant.id} />
            <input name="tenantName" defaultValue={tenant.name} required placeholder="車行名稱" style={{ maxWidth: 160 }} />
            <input
              name="adminName"
              defaultValue={tenant.adminName ?? ''}
              placeholder="管理者姓名"
              style={{ maxWidth: 140 }}
            />
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
      <td>{tenant.name}</td>
      <td>{tenant.adminName ?? '—'}</td>
      <td>
        <span className={tenant.status === 'ACTIVE' ? 'pill pill--paid' : 'pill pill--suspended'}>
          {tenant.status === 'ACTIVE' ? '啟用中' : '已停用'}
        </span>
      </td>
      <td>{tenant.createdAt.toLocaleDateString('zh-TW')}</td>
      <td>
        <div className="row-form">
          <button className="btn" type="button" onClick={() => setIsEditing(true)}>
            編輯
          </button>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!confirm(`確定要${nextStatusLabel}「${tenant.name}」嗎？`)) return
              await setStatusAction(new FormData(e.currentTarget))
            }}
          >
            <input type="hidden" name="tenantId" value={tenant.id} />
            <input type="hidden" name="status" value={nextStatus} />
            <button className={nextStatus === 'SUSPENDED' ? 'btn btn-danger' : 'btn'} type="submit">
              {nextStatusLabel}
            </button>
          </form>
        </div>
      </td>
    </tr>
  )
}
