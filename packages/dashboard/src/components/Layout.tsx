import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Overview', icon: '◈' },
  { to: '/people', label: 'People', icon: '⬡' },
  { to: '/my-events', label: 'My Events', icon: '★' },
  { to: '/events', label: 'All Events', icon: '◆' },
  { to: '/organisations', label: 'Organisations', icon: '⬢' },
  { to: '/follow-ups', label: 'Follow-ups', icon: '◉' },
  { to: '/pipeline', label: 'Pipeline', icon: '▸' },
  { to: '/campaigns', label: 'Campaigns', icon: '⬟' },
  { to: '/projects', label: 'Projects', icon: '▦' },
  { to: '/gantt', label: 'Gantt', icon: '▬' },
  { to: '/venues', label: 'Venues', icon: '⌂' },
  { to: '/graph', label: 'Network', icon: '◇' },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full blur-[128px]" />
      </div>

      {/* Sidebar */}
      <nav className="relative w-60 glass-heavy flex flex-col border-r border-white/5 z-10">
        <div className="p-5 border-b border-white/5">
          <h1 className="text-xl font-bold tracking-wider">
            <span className="neon-text">MYCELIO</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mt-1">
            Relationship Intelligence
          </p>
        </div>
        <ul className="flex-1 py-3">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? 'text-neon-cyan bg-neon-cyan/10 border-r-2 border-neon-cyan shadow-neon'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`
                }
              >
                <span className="text-xs opacity-60">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-white/5">
          <div className="text-[10px] text-white/20 uppercase tracking-widest">v0.1.0</div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 z-10 relative">
        <Outlet />
      </main>
    </div>
  );
}
