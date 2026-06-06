import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, FolderOpen, Tag, Percent, Image, 
  Users, Home, Menu, X, ShieldAlert, LogOut, MessageSquare 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore() as any;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/admin/products', label: 'Products', icon: Tag },
    { path: '/admin/categories', label: 'Categories', icon: FolderOpen },
    { path: '/admin/promotions', label: 'Promotions', icon: Percent },
    { path: '/admin/banners', label: 'Banners', icon: Image },
    { path: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
    { path: '/admin/customers', label: 'Customers', icon: Users }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      
      {/* Mobile Header */}
      <header className="md:hidden h-16 border-b border-slate-850 bg-slate-900/90 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
        <Link to="/admin" className="text-sm font-black tracking-widest text-indigo-400 uppercase">
          GENTWear Admin
        </Link>
        <button 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-350"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`w-64 border-r border-slate-850/80 bg-slate-900/40 backdrop-blur-xl flex flex-col fixed md:sticky top-16 md:top-0 h-[calc(100vh-4rem)] md:h-screen z-30 transition-transform duration-300 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand details (Desktop Only) */}
        <div className="hidden md:flex items-center gap-2 px-6 py-6 border-b border-slate-850/60">
          <div className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-wider uppercase text-slate-200">GENTWear</h2>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Admin Control</span>
          </div>
        </div>

        {/* User Details */}
        <div className="px-6 py-4 border-b border-slate-850/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || 'Admin User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@gentwear.com'}</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40 border border-transparent hover:border-slate-850/40'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer shortcuts */}
        <div className="p-4 border-t border-slate-850/60 space-y-2">
          <Link
            to="/products"
            className="flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-450 hover:text-slate-250 transition-colors"
          >
            <Home size={14} /> Back to Store
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all text-left cursor-pointer"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-4rem)] md:max-h-screen custom-scrollbar">
          {children}
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
