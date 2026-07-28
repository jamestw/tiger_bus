'use client'

import { useState } from 'react'
import type { Driver, Vehicle } from '@prisma/client'

export function DriverRow({
  driver,
  vehicles,
  canManage,
  updateAction,
  deleteAction,
  setDefaultVehicleAction,
}: {
  driver: Driver
  vehicles: Vehicle[]
  canManage: boolean
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
  setDefaultVehicleAction: (formData: FormData) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const defaultVehicle = vehicles.find((v) => v.id === driver.defaultVehicleId)

  if (isEditing) {
    return (
      <tr>
        <td colSpan={canManage ? 4 : 3}>
          <form
            className="row-form"
            onSubmit={async (e) => {
              e.preventDefault()
              await updateAction(new FormData(e.currentTarget))
              setIsEditing(false)
            }}
          >
            <input type="hidden" name="driverId" value={driver.id} />
            <input name="name" defaultValue={driver.name} required style={{ maxWidth: 130 }} />
            <input name="phone" defaultValue={driver.phone ?? ''} placeholder="電話" style={{ maxWidth: 150 }} />
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
      <td>{driver.name}</td>
      <td>{driver.phone ?? '—'}</td>
      <td>{defaultVehicle ? `${defaultVehicle.plateNumber}（${defaultVehicle.type}）` : '未綁定'}</td>
      {canManage && (
        <td>
          <div className="row-form" style={{ flexWrap: 'wrap', rowGap: '0.5rem' }}>
            <form action={setDefaultVehicleAction} className="row-form">
              <input type="hidden" name="driverId" value={driver.id} />
              <select name="vehicleId" required defaultValue="">
                <option value="" disabled>
                  更換車輛
                </option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber}（{v.type}）
                  </option>
                ))}
              </select>
              <button className="btn" type="submit">
                套用
              </button>
            </form>
            <button className="btn" type="button" onClick={() => setIsEditing(true)}>
              編輯
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!confirm(`確定要刪除司機「${driver.name}」嗎？（軟刪除，歷史行程資料仍會保留）`)) return
                await deleteAction(new FormData(e.currentTarget))
              }}
            >
              <input type="hidden" name="driverId" value={driver.id} />
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
