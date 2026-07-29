'use client'

import { usePathname } from 'next/navigation'

export function NavLinks({
  groups,
}: {
  groups: { label?: string; items: { href: string; label: string }[] }[]
}) {
  const pathname = usePathname()

  return (
    <nav>
      {groups.map((group, i) => (
        <div className="app-sidebar__nav-group" key={group.label ?? `group-${i}`}>
          {group.label && <div className="app-sidebar__nav-group-label">{group.label}</div>}
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <a key={item.href} href={item.href} className={isActive ? 'active' : undefined}>
                {item.label}
              </a>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
