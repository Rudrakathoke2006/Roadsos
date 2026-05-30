import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Students from './pages/Students';
import Issuances from './pages/Issuances';
import Bookings from './pages/Bookings';
import {
  LayoutDashboard,
  Dribbble,
  Users,
  ArrowRightLeft,
  CalendarRange,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Menu,
  Compass
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check auth cookie / token on boot
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  // Sidebar link details
  const navigationItems = [
    { id: 'dashboard', name: 'Overview Insights', icon: LayoutDashboard },
    { id: 'equipment', name: 'Sports Stock Pool', icon: Dribbble },
    { id: 'students', name: 'Student Registry', icon: Users },
    { id: 'loans', name: 'Equip Hand-outs', icon: ArrowRightLeft },
    { id: 'bookings', name: 'Facility Bookings', icon: CalendarRange }
  ];

  return (
    <div className="flex h-screen bg-[#0F1115] overflow-hidden font-sans text-gray-200">
      
      {/* Dynamic Navigation Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#161920] border-r border-gray-800/80 flex flex-col transition-all duration-300 shrink-0 z-20`}>
        {/* Title block */}
        <div className="p-5 border-b border-gray-800/75 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-900/10 shrink-0">
            <Compass className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h2 className="text-sm font-black tracking-wider text-white uppercase">RBU Gymkhana</h2>
              <span className="text-[10px] text-gray-500 font-sans tracking-widest block uppercase font-bold">Admin Deck</span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id || (item.id === 'loans' && activePage === 'loans');
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-red-950/40 to-red-900/10 text-red-400 border border-red-900/30 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/20 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-red-500' : 'text-gray-500'}`} />
                  {sidebarOpen && <span className="text-xs uppercase tracking-wider font-semibold">{item.name}</span>}
                </div>
                {sidebarOpen && active && <ChevronRight className="w-4 h-4 text-red-500" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer detailing auth and logout */}
        <div className="p-4 border-t border-gray-800/80 bg-[#12141A]">
          <div className="flex items-center justify-between gap-2.5">
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate block">{user.name}</div>
                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-0.5">{user.role}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/10 border border-gray-800 hover:border-red-900/30 rounded-xl transition shrink-0 cursor-pointer"
              title="Terminate Admin Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[#161920]/80 backdrop-blur-sm border-b border-gray-800/80 flex items-center justify-between px-6 z-10 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 border border-gray-800 hover:bg-gray-800/50 rounded-lg text-gray-400 hover:text-white transition"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-950/20 text-red-400 rounded-full border border-red-900/30 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live Database Active
            </span>
          </div>
        </header>

        {/* Dynamic active screen */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#0F1115]">
          <div className="max-w-6xl mx-auto">
            {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
            {activePage === 'equipment' && <Equipment />}
            {activePage === 'students' && <Students />}
            {activePage === 'loans' && <Issuances />}
            {activePage === 'bookings' && <Bookings />}
          </div>
        </main>
      </div>

    </div>
  );
}
