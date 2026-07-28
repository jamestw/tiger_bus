import { signIn } from '@/lib/auth'
import { db } from '@/lib/db'

export default function LoginPage() {
  return (
    <div className="login-page">
      <form
        className="login-form"
        action={async (formData) => {
          'use server'
          const email = formData.get('email') as string
          const password = formData.get('password')

          const user = await db.user.findUnique({ where: { email } })
          const redirectTo = user?.role === 'SUPERADMIN' ? '/tenants' : '/calendar'

          await signIn('credentials', { email, password, redirectTo })
        }}
      >
        <div className="login-form__kicker">Tiger Bus 調度管理系統</div>
        <h1>登入</h1>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          密碼
          <input name="password" type="password" required />
        </label>
        <button type="submit">登入</button>
      </form>
    </div>
  )
}
