import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <form
      action={async (formData) => {
        'use server'
        await signIn('credentials', {
          email: formData.get('email'),
          password: formData.get('password'),
          redirectTo: '/calendar',
        })
      }}
    >
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
  )
}
