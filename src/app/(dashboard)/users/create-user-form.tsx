'use client'

import { useState } from 'react'

type DriverOption = { id: string; name: string }

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'DISPATCHER', label: '調度接單' },
  { value: 'ACCOUNTANT', label: '會計' },
  { value: 'DRIVER', label: '司機' },
  { value: 'TENANT_ADMIN', label: '車行管理者' },
]

export function CreateUserForm({
  unlinkedDrivers,
  createUserAction,
}: {
  unlinkedDrivers: DriverOption[]
  createUserAction: (formData: FormData) => Promise<void>
}) {
  const [role, setRole] = useState('DISPATCHER')

  return (
    <form action={createUserAction} className="inline-form">
      <div className="field">
        <label>姓名</label>
        <input name="name" required />
      </div>
      <div className="field">
        <label>Email（登入帳號）</label>
        <input name="email" type="email" required />
      </div>
      <div className="field">
        <label>登入密碼</label>
        <input name="password" type="password" required minLength={8} />
      </div>
      <div className="field">
        <label>角色</label>
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {role === 'DRIVER' &&
        (unlinkedDrivers.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            沒有可綁定的司機資料，請先到「司機管理」新增司機
          </p>
        ) : (
          <div className="field">
            <label>綁定司機</label>
            <select name="driverId" required defaultValue="">
              <option value="" disabled>
                選擇司機
              </option>
              {unlinkedDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      <button className="btn" type="submit" disabled={role === 'DRIVER' && unlinkedDrivers.length === 0}>
        新增使用者
      </button>
    </form>
  )
}
