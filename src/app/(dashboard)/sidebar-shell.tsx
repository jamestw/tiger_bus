'use client'

import { useState } from 'react'
import { NavLinks } from './nav-links'

export function SidebarShell({
  userName,
  roleLabel,
  navGroups,
  signOutAction,
}: {
  userName: string
  roleLabel: string
  navGroups: { label?: string; items: { href: string; label: string }[] }[]
  signOutAction: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar__toggle"
          onClick={() => setIsOpen(true)}
          aria-label="開啟選單"
        >
          ☰
        </button>
        <span className="mobile-topbar__brand">Tiger Bus</span>
      </div>

      {isOpen && <div className="app-sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      <aside className={`app-sidebar${isOpen ? ' app-sidebar--open' : ''}`}>
        <div className="app-sidebar__brand">
          Tiger Bus
          <span>調度管理系統</span>
          <button
            type="button"
            className="app-sidebar__close"
            onClick={() => setIsOpen(false)}
            aria-label="關閉選單"
          >
            ✕
          </button>
        </div>
        <NavLinks groups={navGroups} />
        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">
            <strong>{userName}</strong>
            {roleLabel}
          </div>
          <form action={signOutAction}>
            <button type="submit">登出</button>
          </form>
        </div>
      </aside>
    </>
  )
}
