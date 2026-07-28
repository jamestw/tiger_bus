'use client'

import { useState } from 'react'
import type { Vehicle } from '@prisma/client'

export function VehicleRow({
  vehicle,
  canManage,
  updateAction,
  deleteAction,
}: {
  vehicle: Vehicle
  canManage: boolean
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <tr>
        <td colSpan={canManage ? 5 : 4}>
          <form
            className="row-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await updateAction(new FormData(e.currentTarget))
              setIsEditing(false)
            }}
          >
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input name="type" defaultValue={vehicle.type} required style={{ maxWidth: 100 }} />
            <input name="plateNumber" defaultValue={vehicle.plateNumber} required style={{ maxWidth: 120 }} />
            <input name="capacity" type="number" min="1" defaultValue={vehicle.capacity} required style={{ maxWidth: 90 }} />
            <input
              name="lastInspectionDate"
              type="date"
              defaultValue={vehicle.lastInspectionDate ? new Date(vehicle.lastInspectionDate).toISOString().slice(0, 10) : ''}
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
      <td>{vehicle.plateNumber}</td>
      <td>{vehicle.type}</td>
      <td>{vehicle.capacity}</td>
      <td>{vehicle.lastInspectionDate ? new Date(vehicle.lastInspectionDate).toLocaleDateString('zh-TW') : '—'}</td>
      {canManage && (
        <td>
          <div className="row-form">
            <button className="btn" type="button" onClick={() => setIsEditing(true)}>
              編輯
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!confirm(`確定要刪除車輛「${vehicle.plateNumber}」嗎？（軟刪除，歷史行程資料仍會保留）`)) return
                await deleteAction(new FormData(e.currentTarget))
              }}
            >
              <input type="hidden" name="vehicleId" value={vehicle.id} />
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
