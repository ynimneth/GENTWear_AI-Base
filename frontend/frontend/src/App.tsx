import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ProductList from '../pages/ProductList';
import ProductDetail from '../pages/ProductDetail';
import AdminProducts from '../pages/AdminProducts';
import AdminCategories from '../pages/AdminCategories';
import Wishlist from '../pages/Wishlist';
import Checkout from '../pages/Checkout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminPromotions from '../pages/admin/AdminPromotions';
import AdminBanners from '../pages/admin/AdminBanners';
import AdminCustomers from '../pages/admin/AdminCustomers';
import AdminReviews from '../pages/admin/AdminReviews';
import AdminLayout from '../components/admin/AdminLayout';
import CartDrawer from '../components/CartDrawer';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { categoryService } from '../services/categoryService';
import { 
  User as UserIcon, Shield, LogOut, RefreshCw, KeyRound, 
  Menu, X, ChevronDown, ShoppingBag, FolderOpen, Heart 
} from 'lucide-react';

// Loader component during session re-hydration
const Loader = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
      <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 animate-spin"></div>
    </div>
    <p className="mt-4 text-slate-400 text-sm tracking-widest uppercase animate-pulse">Restoring Session...</p>
  </div>
);

// Protected User Profile View
const ProfileView = () => {
  const { user, logout, refreshToken, accessToken } = useAuthStore() as any;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Successfully logged out!');
    navigate('/login');
  };

  const handleManualRefresh = async () => {
    const token = await refreshToken();
    if (token) {
      toast.success('Access token rotated successfully!');
    } else {
      toast.error('Token rotation failed. Please log in again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-4 border-b border-slate-800/60 pb-6 mb-6">
          <div className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <UserIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{user.full_name}</h1>
            <p className="text-slate-400 text-sm">{user.email}</p>
          </div>
          <span className="ml-auto uppercase text-xs font-bold tracking-wider px-3 py-1.5 rounded-full bg-slate-850 border border-slate-700/60 text-slate-300">
            {user.role}
          </span>
        </div>

        <div className="space-y-6">
          {/* Token display */}
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={14} /> In-Memory Access Token
              </span>
              <span className="text-[10px] text-green-400 font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                Secure
              </span>
            </div>
            <p className="font-mono text-xs text-slate-400 break-all bg-slate-900/80 p-2.5 rounded border border-slate-800/40 max-h-16 overflow-y-auto">
              {accessToken}
            </p>
          </div>

          {/* Account status */}
          <div className="flex justify-between items-center p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <span className="text-sm text-slate-300">Email Verification Status</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
              Verified
            </span>
          </div>

          {/* Info messages based on role */}
          {user.role === 'admin' ? (
            <Link 
              to="/admin" 
              className="flex items-center justify-between p-4 bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-500/20 rounded-xl transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Shield className="text-indigo-400" size={20} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-200">Admin Control Center</p>
                  <p className="text-xs text-slate-400">Manage products, variants, and categories hierarchy</p>
                </div>
              </div>
              <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          ) : (
            <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl text-left">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-indigo-400">Tip:</span> Your account is registered with the <code className="text-indigo-300 font-bold bg-indigo-500/5 px-1.5 py-0.5 rounded">user</code> role. Admin-only pages like <code className="bg-slate-900 px-1 py-0.5 rounded">/admin</code> are guarded by the server and will block access. Register an admin account to test the role validation.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={handleManualRefresh}
              className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-98"
            >
              <RefreshCw size={16} />
              Refresh Token
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/30 text-red-400 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-98"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Protected Admin Control Panel
const AdminView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-6 mb-6">
          <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 text-left">Admin Control Center</h1>
            <p className="text-slate-400 text-sm">Privileged admin-only workspace</p>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="ml-auto bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            Back to Profile
          </button>
        </div>

        <div className="space-y-6">
          {/* Dashboard details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-left">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Users</span>
              <p className="text-2xl font-bold text-slate-200 mt-1">124</p>
            </div>
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-left">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Admins</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">3</p>
            </div>
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-left">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email Verified</span>
              <p className="text-2xl font-bold text-green-400 mt-1">98%</p>
            </div>
          </div>

          {/* Navigation Action Buttons to E-Commerce Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/products"
              className="p-5 bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl text-left transition-all duration-350 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <ShoppingBag size={24} className="text-indigo-400 mb-2" />
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">Manage Products</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Add menswear items, configure color swatches and sizing variants, set price overrides, and manage image files.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-400 mt-3 block group-hover:translate-x-1 transition-transform">Configure Products →</span>
            </Link>

            <Link
              to="/admin/categories"
              className="p-5 bg-purple-600/10 hover:bg-purple-600/15 border border-purple-500/20 hover:border-purple-500/30 rounded-xl text-left transition-all duration-350 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <FolderOpen size={24} className="text-purple-400 mb-2" />
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-purple-300 transition-colors">Category Builder</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Structure catalog groupings, handle parent-child categories hierarchy, and reorder active menu items dynamically.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-400 mt-3 block group-hover:translate-x-1 transition-transform">Configure Categories →</span>
            </Link>
          </div>

          <div className="p-5 bg-purple-600/5 border border-purple-500/10 rounded-xl text-left">
            <h2 className="text-sm font-semibold text-purple-300 mb-2">Access Granted</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you are seeing this dashboard, the authorization system successfully processed your token and verified your <code className="text-purple-400 font-semibold px-1 rounded bg-purple-500/5">admin</code> role. The backend returned a mock <code className="bg-slate-900 px-1 py-0.5 rounded">200 OK</code> response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Global Responsive Navigation Bar
const Navbar = () => {
  const { user, logout } = useAuthStore() as any;
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  // Close admin dropdown when clicking outside
  useEffect(() => {
    if (!adminDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.admin-dropdown-container')) {
        setAdminDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [adminDropdownOpen]);

  const { toggleDrawer, cartItems } = useCartStore() as any;
  const { wishlistItems } = useWishlistStore() as any;

  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data || []);
      } catch (err) {
        console.warn('Navbar categories load failed');
      }
    };
    fetchCats();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Successfully logged out!');
    navigate('/login');
  };

  return (
    <nav className="bg-slate-950/75 backdrop-blur-xl border-b border-slate-800/60 sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/products" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-indigo-400 tracking-widest uppercase hover:opacity-90 transition-opacity">
          GENTWear
        </Link>

        {/* Desktop Category Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/products" className="text-sm font-semibold text-slate-350 hover:text-slate-100 transition-colors">
            Collections
          </Link>

          {categories.map((cat) => {
            const hasSubs = cat.subcategories && cat.subcategories.length > 0;
            return (
              <div 
                key={cat.id} 
                className="relative group py-2"
                onMouseEnter={() => hasSubs && setDropdownOpen(cat.id)}
                onMouseLeave={() => setDropdownOpen(null)}
              >
                <button 
                  onClick={() => navigate(`/products?category_id=${cat.id}`)}
                  className="text-sm font-semibold text-slate-350 hover:text-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {cat.name}
                  {hasSubs && <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />}
                </button>

                {/* Subcategories Dropdown */}
                {hasSubs && dropdownOpen === cat.id && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-20 backdrop-blur-md">
                    {cat.subcategories.map((sub: any) => (
                      <Link
                        key={sub.id}
                        to={`/products?category_id=${sub.id}`}
                        className="text-xs font-semibold text-slate-400 hover:text-indigo-400 py-2 px-3.5 rounded-lg hover:bg-slate-850 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Section: User details & Admin portal link */}
        <div className="hidden md:flex items-center gap-4">
          {/* Wishlist Link */}
          <Link to="/wishlist" className="relative text-slate-400 hover:text-red-400 hover:bg-slate-900/40 p-2 rounded-xl transition-all cursor-pointer" title="Wishlist">
            <Heart size={20} className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold border border-slate-950 px-1 shadow-md">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon trigger */}
          <button 
            id="navbar-cart-btn"
            onClick={toggleDrawer} 
            className="relative text-slate-400 hover:text-indigo-400 hover:bg-slate-900/40 p-2 rounded-xl transition-all cursor-pointer" 
            title="Cart"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold border border-slate-950 px-1 shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <>
              {user.role === 'admin' && (
                <div className="relative py-2 admin-dropdown-container">
                  <button 
                    onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                    className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-indigo-500/15 transition-all cursor-pointer"
                  >
                    <Shield size={12} /> Admin Area <ChevronDown size={12} className={`transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {adminDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-20"
                      >
                        <Link to="/admin" onClick={() => setAdminDropdownOpen(false)} className="text-xs font-bold text-slate-300 hover:text-indigo-400 p-2.5 rounded-lg hover:bg-slate-850 transition-colors flex items-center gap-2">
                          <Shield size={12} /> Control Center
                        </Link>
                        <Link to="/admin/products" onClick={() => setAdminDropdownOpen(false)} className="text-xs font-bold text-slate-300 hover:text-indigo-400 p-2.5 rounded-lg hover:bg-slate-850 transition-colors flex items-center gap-2">
                          <ShoppingBag size={12} /> Manage Products
                        </Link>
                        <Link to="/admin/categories" onClick={() => setAdminDropdownOpen(false)} className="text-xs font-bold text-slate-300 hover:text-indigo-400 p-2.5 rounded-lg hover:bg-slate-850 transition-colors flex items-center gap-2">
                          <FolderOpen size={12} /> Category Builder
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <Link to="/profile" className="text-slate-300 hover:text-white transition-colors" title="My Profile">
                <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200">
                  <UserIcon size={16} />
                </div>
              </Link>
              <button onClick={handleLogout} className="text-slate-450 hover:text-red-400 transition-colors cursor-pointer" title="Logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="text-xs font-bold text-slate-300 hover:text-white border border-slate-850 bg-slate-900/60 hover:bg-slate-850 px-4 py-2 rounded-xl transition-all">
                Login
              </Link>
              <Link to="/register" className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-3">
          {/* Wishlist Link */}
          <Link to="/wishlist" className="relative text-slate-400 hover:text-red-400 p-1.5 cursor-pointer" title="Wishlist">
            <Heart size={18} className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""} />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-slate-950 px-0.5">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart trigger */}
          <button onClick={toggleDrawer} className="relative text-slate-400 hover:text-indigo-400 p-1.5 cursor-pointer" title="Cart">
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-slate-950 px-0.5">
                {cartCount}
              </span>
            )}
          </button>

          {user && (
            <Link to="/profile" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <UserIcon size={14} />
            </Link>
          )}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-white">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-850 p-6 flex flex-col gap-4 animate-fadeIn">
          <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-350 hover:text-slate-100">
            Collections
          </Link>
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <Link to={`/products?category_id=${cat.id}`} onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-200 block">
                {cat.name}
              </Link>
              {cat.subcategories?.map((sub: any) => (
                <Link
                  key={sub.id}
                  to={`/products?category_id=${sub.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-slate-400 block pl-3"
                >
                  • {sub.name}
                </Link>
              ))}
            </div>
          ))}

          {user ? (
            <div className="pt-4 border-t border-slate-900 space-y-3">
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-indigo-400 block py-1">
                    Admin Control Center
                  </Link>
                  <Link to="/admin/products" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-slate-300 block py-1">
                    Manage Products
                  </Link>
                  <Link to="/admin/categories" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-slate-300 block py-1">
                    Category Builder
                  </Link>
                </>
              )}
              <button onClick={handleLogout} className="text-xs font-bold text-red-400 flex items-center gap-1.5 pt-2 cursor-pointer">
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-4 border-t border-slate-900">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-xs font-bold text-slate-300 border border-slate-850 py-2.5 rounded-xl">
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-xs font-bold text-white bg-indigo-600 py-2.5 rounded-xl">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

const NavbarWrapper = () => {
  const location = useLocation();
  const showNavbar = !['/login', '/register'].includes(location.pathname);
  return showNavbar ? <Navbar /> : null;
};

// Page Transition Animation Wrapper
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="page-transition-container"
    >
      {children}
    </motion.div>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      <NavbarWrapper />
      
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public e-commerce routes */}
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<PageWrapper><ProductList /></PageWrapper>} />
            <Route path="/products/:id" element={<PageWrapper><ProductDetail /></PageWrapper>} />
            <Route path="/wishlist" element={<PageWrapper><Wishlist /></PageWrapper>} />

            {/* Public authentication routes */}
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />

            {/* Protected user routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <PageWrapper><ProfileView /></PageWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <PageWrapper><Checkout /></PageWrapper>
                </ProtectedRoute>
              }
            />

            {/* Protected admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminDashboard /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/products"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminProducts /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminCategories /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminOrders /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/promotions"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminPromotions /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/banners"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminBanners /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/customers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminCustomers /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <PageWrapper><AdminReviews /></PageWrapper>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      
      {/* Global Floating AI assistant widget */}
      <AIAssistantWidget />

      {/* Global Cart Slide-in Drawer */}
      <CartDrawer />

      {/* React Hot Toast setup */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(8px)',
          },
          success: {
            iconTheme: {
              primary: '#6366f1',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
};

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { user, refreshToken } = useAuthStore() as any;
  const { fetchCart, mergeCart } = useCartStore() as any;
  const { fetchWishlist } = useWishlistStore() as any;

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshToken();
      } catch (err) {
        console.warn('Initial session restore failed, probably no refresh token');
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, [refreshToken]);

  // Fetch initial cart and wishlist once session restore is resolved
  useEffect(() => {
    if (!isInitializing) {
      if (user) {
        // Logged in! Merge guest cart and fetch items
        mergeCart().then(() => fetchCart());
        fetchWishlist();
      } else {
        fetchCart();
      }
    }
  }, [isInitializing, user]);

  if (isInitializing) {
    return <Loader />;
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
