import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { OfflineBanner } from '../components/common/OfflineBanner'
import { ProfileProvider } from '../features/profile/ProfileProvider'
import { NAV_ITEMS } from './navigation'
import { SidebarSlotContext } from './SidebarSlot'
import styles from './AppShell.module.css'

function linkClass(base: string) {
  return ({ isActive }: { isActive: boolean }) => (isActive ? `${base} ${styles.active}` : base)
}

export function AppShell() {
  const bottomItems = NAV_ITEMS.filter((item) => item.inBottomBar)
  const headerItems = NAV_ITEMS.filter((item) => !item.inBottomBar)
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          FitIQ
        </Link>
        <nav aria-label="Account">
          {headerItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass(styles.headerLink)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <nav className={styles.sidebar} aria-label="Main">
        <Link to="/" className={styles.brand}>
          FitIQ
        </Link>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={linkClass(styles.sideLink)}
          >
            {item.label}
          </NavLink>
        ))}
        <div ref={setSlot} className={styles.sideAction} />
      </nav>

      <main className={styles.main}>
        <OfflineBanner />
        <ProfileProvider>
          <SidebarSlotContext.Provider value={slot}>
            <Outlet />
          </SidebarSlotContext.Provider>
        </ProfileProvider>
      </main>

      <nav className={styles.bottomNav} aria-label="Tabs">
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={linkClass(styles.tab)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
