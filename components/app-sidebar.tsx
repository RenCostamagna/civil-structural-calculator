"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Square,
  RotateCcw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  User,
  FolderOpen,
  MoveHorizontal,
  Columns2,
  Minus,
  Link2,
  RectangleHorizontal,
  ArrowDownToLine,
  Menu,
  X,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { MODULES } from "@/lib/constants/cirsoc"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { logoutAction } from "@/app/auth/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

const iconMap: Record<string, React.ElementType> = {
  square: Square,
  "rotate-ccw": RotateCcw,
  "move-horizontal": MoveHorizontal,
  "columns-2": Columns2,
  "minus": Minus,
  "link": Link2,
  "rectangle-horizontal": RectangleHorizontal,
  "arrow-down-to-line": ArrowDownToLine,
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proyectos", label: "Mis Proyectos", icon: FolderOpen },
  ...MODULES.filter((m) => m.available).map((m) => ({
    href: `/modulos/${m.id}`,
    label: `${m.code}: ${m.name}`,
    icon: iconMap[m.icon] || Square,
    disabled: !m.available,
  })),
  { href: "/chat", label: "Asistente IA", icon: MessageSquare },
]

function SidebarContent({
  collapsed,
  userEmail,
  userName,
  pathname,
  onNavClick,
}: {
  collapsed: boolean
  userEmail: string | null
  userName: string | null
  pathname: string
  onNavClick?: () => void
}) {
  return (
    <>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-sans">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </div>
      </nav>

      {/* User info */}
      {userEmail && (
        <div className="border-t border-sidebar-border p-2">
          {!collapsed ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {userName || "Ingeniero"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{userEmail}</p>
              </div>
              <form action={logoutAction}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="sr-only">Cerrar sesion</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Cerrar sesion</TooltipContent>
                </Tooltip>
              </form>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <form action={logoutAction} className="flex justify-center">
                  <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Cerrar sesion</span>
                  </Button>
                </form>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesion</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </>
  )
}

// ─── Mobile Header Bar ─────────────────────────────────────────────
export function MobileHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">
            CalcFund
          </span>
          <span className="text-[10px] text-muted-foreground">
            CIRSOC 201-05
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="h-9 w-9 text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </div>
    </header>
  )
}

// ─── Main Sidebar Component ────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
        setUserName(user.user_metadata?.full_name ?? null)
      }
    })
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev)
  }, [])

  const handleMobileNavClick = useCallback(() => {
    setMobileOpen(false)
  }, [])

  // ─── Mobile: Drawer overlay ───────────────────────────────────
  if (isMobile) {
    return (
      <>
        <MobileHeader onMenuToggle={handleMobileToggle} />

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
            <Link href="/" className="flex items-center gap-2" onClick={handleMobileNavClick}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  CalcFund
                </span>
                <span className="text-[10px] text-muted-foreground">
                  CIRSOC 201-05
                </span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar menu</span>
            </Button>
          </div>

          <SidebarContent
            collapsed={false}
            userEmail={userEmail}
            userName={userName}
            pathname={pathname}
            onNavClick={handleMobileNavClick}
          />
        </aside>
      </>
    )
  }

  // ─── Desktop: Classic collapsible sidebar ─────────────────────
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  CalcFund
                </span>
                <span className="text-[10px] text-muted-foreground">
                  CIRSOC 201-05
                </span>
              </div>
            )}
          </Link>
          {!collapsed && <ThemeToggle />}
        </div>

        <SidebarContent
          collapsed={collapsed}
          userEmail={userEmail}
          userName={userName}
          pathname={pathname}
        />

        {/* Footer / Collapse */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-muted-foreground hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Contraer</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
