'use client'

import { usePathname } from 'next/navigation'

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname()

  return (
    <nav>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
        return (
          <a key={item.href} href={item.href} className={isActive ? 'active' : undefined}>
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
