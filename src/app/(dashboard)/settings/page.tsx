import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getTenantProfile, updateTenantProfile } from '@/app/api/tenant-profile/handlers'
import {
  listLineItemPresets,
  createLineItemPreset,
  deleteLineItemPreset,
} from '@/app/api/line-item-presets/handlers'

async function updateProfileAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await updateTenantProfile(db, session.user, {
    name: formData.get('name') as string,
    contactName: (formData.get('contactName') as string) || null,
    contactPhone: (formData.get('contactPhone') as string) || null,
    defaultCalendarView: formData.get('defaultCalendarView') === 'WEEK' ? 'WEEK' : 'MONTH',
  })
  revalidatePath('/settings')
}

async function createPresetAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await createLineItemPreset(db, session.user, {
    name: formData.get('name') as string,
    type: formData.get('type') as 'REVENUE' | 'COST',
  })
  revalidatePath('/settings')
}

async function deletePresetAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user) return
  await deleteLineItemPreset(db, session.user, formData.get('presetId') as string)
  revalidatePath('/settings')
}

export default async function SettingsPage() {
  const session = await auth()
  const user = session?.user
  if (!user || user.role !== 'TENANT_ADMIN') {
    return (
      <div>
        <h1>車行設定</h1>
        <div className="empty-state">只有車行管理者能修改車行設定</div>
      </div>
    )
  }

  const profile = await getTenantProfile(db, user)
  const presets = await listLineItemPresets(db, user)

  return (
    <div>
      <h1>車行設定</h1>

      <div className="app-section">
        <h2>車行基本資料</h2>
        <form action={updateProfileAction} className="inline-form">
          <div className="field">
            <label>車行名稱</label>
            <input name="name" defaultValue={profile.name} required />
          </div>
          <div className="field">
            <label>聯絡人</label>
            <input name="contactName" defaultValue={profile.contactName ?? ''} />
          </div>
          <div className="field">
            <label>聯絡電話</label>
            <input name="contactPhone" defaultValue={profile.contactPhone ?? ''} />
          </div>
          <div className="field">
            <label>行事曆預設檢視</label>
            <select name="defaultCalendarView" defaultValue={profile.defaultCalendarView}>
              <option value="MONTH">月檢視</option>
              <option value="WEEK">週檢視</option>
            </select>
          </div>
          <button className="btn" type="submit">
            儲存
          </button>
        </form>
      </div>

      <div className="app-section">
        <h2>常用收支項目</h2>

        <form action={createPresetAction} className="inline-form">
          <div className="field">
            <label>項目名稱</label>
            <input name="name" placeholder="車資 / 油資 / 過路費" required />
          </div>
          <div className="field">
            <label>類型</label>
            <select name="type" required defaultValue="REVENUE">
              <option value="REVENUE">收入</option>
              <option value="COST">支出</option>
            </select>
          </div>
          <button className="btn" type="submit">
            新增常用項目
          </button>
        </form>

        {presets.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '1rem' }}>
            還沒有任何常用項目，建立後可在行程的「新增收支項目」用下拉選單快速選擇
          </div>
        ) : (
          <table className="data-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>項目名稱</th>
                <th>類型</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {presets.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.type === 'REVENUE' ? '收入' : '支出'}</td>
                  <td>
                    <form action={deletePresetAction}>
                      <input type="hidden" name="presetId" value={p.id} />
                      <button className="btn btn-danger" type="submit">
                        刪除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
