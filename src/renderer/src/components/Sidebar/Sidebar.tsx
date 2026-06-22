import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Bot, BookOpen, Calculator, Calendar, FileText,
  CreditCard, Package, Zap, Settings, ChevronRight, BookUser, FolderHeart
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '행정실 허브', color: '#3b82f6' },
  { to: '/ai', icon: Bot, label: 'AI 행정비서', color: '#8b5cf6' },
  { to: '/edufine', icon: BookOpen, label: 'K-에듀파인', color: '#14b8a6' },
  { to: '/calculator', icon: Calculator, label: '업무 계산기', color: '#f59e0b' },
  { to: '/calendar', icon: Calendar, label: '일정 관리', color: '#3b82f6' },
  { to: '/documents', icon: FileText, label: '문서 관리', color: '#10b981' },
  { to: '/card', icon: CreditCard, label: '법인카드', color: '#ec4899' },
  { to: '/contacts', icon: BookUser, label: '주요 연락처', color: '#14b8a6' },
  { isExternal: true, href: 'https://sksu123-yeabi.vercel.app/', icon: Package, label: '여비정산신청서', color: '#f97316' },
  { to: '/automation', icon: Zap, label: '자동화 센터', color: '#06b6d4' },
  { to: '/favorites', icon: FolderHeart, label: '즐겨찾기', color: '#10b981' },
]

export default function Sidebar() {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col py-3 overflow-y-auto overflow-x-hidden"
      style={{
        background: 'var(--bg-sidebar, var(--bg-secondary))',
        borderRight: '1px solid var(--border)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* 네비게이션 */}
      <nav className="flex-1 px-2 space-y-0.5">
        <p className="section-title px-2 mb-2 mt-1" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em' }}>메뉴</p>
        {navItems.map(({ to, isExternal, href, icon: Icon, label, color }) => {
          if (isExternal) {
            return (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative"
                style={{ color: 'var(--text-sidebar-muted, var(--text-muted))' }}
              >
                <Icon size={16} className="transition-colors" style={{ color: 'inherit' }} />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-[10px] opacity-50 px-1 border border-slate-600 rounded">앱</span>
              </a>
            )
          }

          return (
            <NavLink
              key={to}
              to={to!}
              end={to === '/'}
              className="sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium group relative"
              style={({ isActive }) => ({
                color: isActive ? 'var(--text-sidebar, var(--text-primary))' : 'var(--text-sidebar-muted, var(--text-muted))',
                background: isActive ? `linear-gradient(135deg, ${color}44, ${color}22)` : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                paddingLeft: isActive ? '10px' : '12px'
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    style={{ color: isActive ? color : undefined }}
                    className={isActive ? '' : 'group-hover:text-white transition-colors'}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && (
                    <ChevronRight size={12} style={{ color }} className="opacity-60" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* 하단 설정 */}
      <div className="px-2 pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive ? 'bg-white/15 text-white font-semibold' : 'text-slate-200'
            }`
          }
        >
          <Settings size={16} />
          <span>환경설정</span>
        </NavLink>
        <div className="mt-4 px-3 text-center">
          <p className="text-[10px] font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Developed by 신경수(담양남초)
            <br />
            © 2026. All Rights Reserved.
          </p>
        </div>
      </div>
    </aside>
  )
}
