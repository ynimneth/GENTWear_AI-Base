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
  Menu, X, ChevronDown, ShoppingBag, FolderOpen, Heart, Search 
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
    <div className="min-h-screen bg-neutral-50 text-neutral-800 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      <div className="w-full max-w-xl bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-lg relative z-10">
        <div className="flex items-center gap-4 border-b border-neutral-100 pb-6 mb-6">
          <div className="p-4 bg-neutral-100 text-neutral-800 rounded-2xl border border-neutral-200">
            <UserIcon size={32} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-neutral-900 font-sans">{user.full_name}</h1>
            <p className="text-neutral-500 text-sm font-sans">{user.email}</p>
          </div>
          <span className="ml-auto uppercase text-xs font-bold tracking-wider px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 font-sans">
            {user.role}
          </span>
        </div>

        <div className="space-y-6">
          {/* Token display */}
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <KeyRound size={14} /> In-Memory Access Token
              </span>
              <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-sans">
                Secure
              </span>
            </div>
            <p className="font-mono text-xs text-neutral-550 break-all bg-white p-2.5 rounded border border-neutral-200/60 max-h-16 overflow-y-auto">
              {accessToken}
            </p>
          </div>

          {/* Account status */}
          <div className="flex justify-between items-center p-4 bg-neutral-50 border border-neutral-200 rounded-xl font-sans">
            <span className="text-sm text-neutral-600 font-medium">Email Verification Status</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
              Verified
            </span>
          </div>

          {/* Info messages based on role */}
          {user.role === 'admin' ? (
            <Link 
              to="/admin" 
              className="flex items-center justify-between p-4 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl transition-all duration-350 group cursor-pointer font-sans"
            >
              <div className="flex items-center gap-3 text-left">
                <Shield className="text-neutral-700" size={20} />
                <div>
                  <p className="text-sm font-bold text-neutral-800">Admin Control Center</p>
                  <p className="text-xs text-neutral-500">Manage products, variants, and categories hierarchy</p>
                </div>
              </div>
              <span className="text-neutral-700 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          ) : (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left font-sans">
              <p className="text-xs text-neutral-500 leading-relaxed">
                <span className="font-semibold text-neutral-700">Tip:</span> Your account is registered with the <code className="text-neutral-800 font-bold bg-neutral-100 px-1.5 py-0.5 rounded">user</code> role. Admin-only pages like <code className="bg-neutral-100 px-1 py-0.5 rounded">/admin</code> are guarded by the server and will block access. Register an admin account to test the role validation.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 pt-2 font-sans">
            <button
              onClick={handleManualRefresh}
              className="flex-1 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-[0.98]"
            >
              <RefreshCw size={16} />
              Refresh Token
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-[0.98]"
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
    <div className="min-h-screen bg-neutral-50 text-neutral-800 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl p-8 shadow-lg relative z-10">
        <div className="flex items-center gap-3 border-b border-neutral-200 pb-6 mb-6">
          <div className="p-3 bg-neutral-100 text-neutral-700 rounded-xl border border-neutral-200">
            <Shield size={24} />
          </div>
          <div className="text-left font-sans">
            <h1 className="text-2xl font-bold text-neutral-900">Admin Control Center</h1>
            <p className="text-neutral-500 text-sm">Privileged admin-only workspace</p>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="ml-auto bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            Back to Profile
          </button>
        </div>

        <div className="space-y-6 font-sans">
          {/* Dashboard details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Users</span>
              <p className="text-2xl font-black text-neutral-800 mt-1">124</p>
            </div>
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Admins</span>
              <p className="text-2xl font-black text-[#f0a500] mt-1">3</p>
            </div>
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-left">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email Verified</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">98%</p>
            </div>
          </div>

          {/* Navigation Action Buttons to E-Commerce Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/admin/products"
              className="p-5 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 rounded-xl text-left transition-all duration-350 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <ShoppingBag size={24} className="text-neutral-700 mb-2" />
                <h3 className="text-sm font-bold text-neutral-800 group-hover:text-neutral-900 transition-colors">Manage Products</h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Add menswear items, configure color swatches and sizing variants, set price overrides, and manage image files.
                </p>
              </div>
              <span className="text-xs font-bold text-neutral-700 mt-3 block group-hover:translate-x-1 transition-transform">Configure Products →</span>
            </Link>

            <Link
              to="/admin/categories"
              className="p-5 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 rounded-xl text-left transition-all duration-350 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <FolderOpen size={24} className="text-neutral-700 mb-2" />
                <h3 className="text-sm font-bold text-neutral-800 group-hover:text-neutral-900 transition-colors">Category Builder</h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Structure catalog groupings, handle parent-child categories hierarchy, and reorder active menu items dynamically.
                </p>
              </div>
              <span className="text-xs font-bold text-neutral-700 mt-3 block group-hover:translate-x-1 transition-transform">Configure Categories →</span>
            </Link>
          </div>

          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl text-left">
            <h2 className="text-sm font-bold text-neutral-800 mb-2">Access Granted</h2>
            <p className="text-xs text-neutral-500 leading-relaxed font-sans">
              If you are seeing this dashboard, the authorization system successfully processed your token and verified your <code className="text-neutral-800 font-bold px-1 rounded bg-neutral-100">admin</code> role. The backend returned a mock <code className="bg-neutral-100 px-1 py-0.5 rounded">200 OK</code> response.
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal('');
    }
  };

  return (
    <nav className="bg-[#000000] text-white sticky top-0 z-50 select-none font-sans">
      {/* Row 1: Brand name / navigation menu / icons */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-neutral-900">
        
        {/* Brand Logo (Serif letter-spaced elegant Odel style) */}
        <Link to="/products" className="text-xl md:text-2xl font-serif tracking-[0.25em] font-semibold text-white uppercase hover:opacity-90 transition-opacity">
          G E N T W E A R
        </Link>

        {/* Center Simple Links */}
        <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest">
          <Link to="/products" className="text-neutral-350 hover:text-white transition-colors">
            Deals
          </Link>
          <Link to="/products?sort=newest" className="text-neutral-350 hover:text-white transition-colors">
            New Collection
          </Link>
          <button 
            onClick={() => {
              const el = document.getElementById('shop-by-brand-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Shop By Brands
          </button>
        </div>

        {/* Right Section: Icons */}
        <div className="flex items-center gap-4">
          
          {/* Animated Search Bar Toggle */}
          <div className="relative flex items-center">
            <AnimatePresence>
              {searchOpen && (
                <motion.form 
                  onSubmit={handleSearchSubmit}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="mr-2 overflow-hidden flex items-center"
                >
                  <input 
                    type="text" 
                    placeholder="Search catalog..." 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-neutral-600 w-full"
                  />
                </motion.form>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="text-neutral-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer"
              title="Search"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Wishlist Link */}
          <Link to="/wishlist" className="relative text-neutral-300 hover:text-[#f0a500] p-2 rounded-xl transition-all cursor-pointer" title="Wishlist">
            <Heart size={18} className={wishlistCount > 0 ? "fill-[#f0a500] text-[#f0a500]" : ""} />
            {wishlistCount > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 bg-[#f0a500] text-white rounded-full flex items-center justify-center text-[8px] font-black px-1 shadow-md">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon trigger */}
          <button 
            id="navbar-cart-btn"
            onClick={toggleDrawer} 
            className="relative text-neutral-300 hover:text-[#f0a500] p-2 rounded-xl transition-all cursor-pointer" 
            title="Cart"
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 bg-[#f0a500] text-white rounded-full flex items-center justify-center text-[8px] font-black px-1 shadow-md">
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
                    className="text-[10px] font-bold uppercase tracking-wider text-[#f0a500] bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-neutral-800 transition-all cursor-pointer"
                  >
                    <Shield size={10} /> Admin <ChevronDown size={10} className={`transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {adminDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-1.5 w-44 bg-neutral-950 border border-neutral-900 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-20"
                      >
                        <Link to="/admin" onClick={() => setAdminDropdownOpen(false)} className="text-[10px] font-bold text-neutral-300 hover:text-white p-2 rounded-lg hover:bg-neutral-900 transition-colors flex items-center gap-2">
                          <Shield size={11} /> Control Center
                        </Link>
                        <Link to="/admin/products" onClick={() => setAdminDropdownOpen(false)} className="text-[10px] font-bold text-neutral-300 hover:text-white p-2 rounded-lg hover:bg-neutral-900 transition-colors flex items-center gap-2">
                          <ShoppingBag size={11} /> Manage Products
                        </Link>
                        <Link to="/admin/categories" onClick={() => setAdminDropdownOpen(false)} className="text-[10px] font-bold text-neutral-300 hover:text-white p-2 rounded-lg hover:bg-neutral-900 transition-colors flex items-center gap-2">
                          <FolderOpen size={11} /> Category Builder
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <Link to="/profile" className="text-neutral-300 hover:text-white transition-colors" title="My Profile">
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-200">
                  <UserIcon size={14} />
                </div>
              </Link>
              <button onClick={handleLogout} className="text-neutral-450 hover:text-red-400 transition-colors cursor-pointer" title="Logout">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="hidden md:flex gap-2.5">
              <Link to="/login" className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white border border-neutral-850 bg-neutral-900/60 hover:bg-neutral-850 px-3 py-1.5 rounded-lg transition-all">
                Login
              </Link>
              <Link to="/register" className="text-[10px] font-bold uppercase tracking-wider text-black bg-white hover:bg-neutral-250 px-3.5 py-1.5 rounded-lg transition-all shadow-md">
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-neutral-300 hover:text-white p-1">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Row 2: Categories menu bar (Centered horizontally) */}
      <div className="bg-[#000000] border-b border-neutral-950/80 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-center overflow-x-auto gap-8 no-scrollbar">
          <Link to="/products" className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 hover:text-white py-2 shrink-0 transition-colors">
            All Collections
          </Link>
          {categories.map((cat) => {
            const hasSubs = cat.subcategories && cat.subcategories.length > 0;
            return (
              <div 
                key={cat.id} 
                className="relative group py-2 shrink-0"
                onMouseEnter={() => hasSubs && setDropdownOpen(cat.id)}
                onMouseLeave={() => setDropdownOpen(null)}
              >
                <button 
                  onClick={() => navigate(`/products?category_id=${cat.id}`)}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {cat.name}
                  {hasSubs && <ChevronDown size={10} className="group-hover:rotate-180 transition-transform" />}
                </button>

                {/* Subcategories Dropdown */}
                {hasSubs && dropdownOpen === cat.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-44 bg-neutral-950 border border-neutral-900 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-20 backdrop-blur-md">
                    {cat.subcategories.map((sub: any) => (
                      <Link
                        key={sub.id}
                        to={`/products?category_id=${sub.id}`}
                        className="text-[10px] font-bold text-neutral-400 hover:text-white py-2 px-3 rounded-lg hover:bg-neutral-900 transition-colors"
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
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-neutral-950 border-b border-neutral-900 p-6 flex flex-col gap-4 animate-fadeIn">
          <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="text-[11px] font-bold uppercase tracking-widest text-neutral-350 hover:text-white">
            Collections
          </Link>
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <Link to={`/products?category_id=${cat.id}`} onClick={() => setMobileMenuOpen(false)} className="text-[11px] font-bold uppercase tracking-widest text-white block">
                {cat.name}
              </Link>
              {cat.subcategories?.map((sub: any) => (
                <Link
                  key={sub.id}
                  to={`/products?category_id=${sub.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-neutral-400 block pl-3"
                >
                  • {sub.name}
                </Link>
              ))}
            </div>
          ))}

          {user ? (
            <div className="pt-4 border-t border-neutral-900 space-y-3">
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-[#f0a500] block py-1">
                    Admin Control Center
                  </Link>
                  <Link to="/admin/products" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-neutral-300 block py-1">
                    Manage Products
                  </Link>
                  <Link to="/admin/categories" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold text-neutral-300 block py-1">
                    Category Builder
                  </Link>
                </>
              )}
              <button onClick={handleLogout} className="text-xs font-bold text-red-400 flex items-center gap-1.5 pt-2 cursor-pointer">
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-4 border-t border-neutral-900">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-xs font-bold text-neutral-300 border border-neutral-900 py-2.5 rounded-xl">
                Login
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center text-xs font-bold text-black bg-white py-2.5 rounded-xl">
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

// Global Footer Component matching Odel layout
const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="bg-[#1c1c1c] text-neutral-300 font-sans pt-12 select-none">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-800">
        
        {/* Customer Care */}
        <div className="text-left space-y-4">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-white">Customer Care</h4>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li className="hover:text-white cursor-pointer transition-colors">Return & Refund</li>
            <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
            <li className="hover:text-white cursor-pointer transition-colors">Service Payment</li>
            <li className="hover:text-white cursor-pointer transition-colors">Store Locator</li>
            <li className="hover:text-white cursor-pointer transition-colors">CRM</li>
          </ul>
        </div>

        {/* Get To Know Us */}
        <div className="text-left space-y-4">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-white">Get To Know Us</h4>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li className="hover:text-white cursor-pointer transition-colors">Investor Information</li>
            <li className="hover:text-white cursor-pointer transition-colors">Odel Magazine</li>
          </ul>
          {/* Social Icons */}
          <div className="flex gap-3 pt-2">
            {['facebook', 'twitter', 'instagram'].map((social) => (
              <a 
                key={social} 
                href="#" 
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-white transition-colors"
              >
                <span className="capitalize text-[10px] font-bold">{social[0]}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Let Us Help You */}
        <div className="text-left space-y-4">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-white">Let Us Help You</h4>
          <ul className="space-y-2 text-xs text-neutral-400">
            <li onClick={() => navigate('/profile')} className="hover:text-white cursor-pointer transition-colors">My Account</li>
            <li onClick={() => navigate('/profile')} className="hover:text-white cursor-pointer transition-colors">My Orders</li>
            <li className="hover:text-white cursor-pointer transition-colors">Terms Of Use</li>
            <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
            <li className="hover:text-white cursor-pointer transition-colors">FAQs</li>
          </ul>
        </div>

        {/* Sign up for Newsletter */}
        <div className="text-left space-y-4">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-white">Sign up for Newsletter</h4>
          <p className="text-[11px] text-neutral-400 leading-normal">
            Keep updated with our latest collections and exclusive promotional deals.
          </p>
          <div className="flex flex-col gap-2">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="bg-[#2a2a2a] text-xs text-white px-4 py-2.5 rounded border border-neutral-700 focus:outline-none focus:border-neutral-500 w-full"
            />
            <button 
              onClick={() => toast.success('Subscribed successfully!')}
              className="bg-[#f0a500] hover:bg-[#d49200] text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded transition-all active:scale-[0.98] cursor-pointer"
            >
              Subscribe
            </button>
          </div>
        </div>

      </div>

      {/* Sub-footer Brand logos */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-neutral-850">
        <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-extrabold">Shop At Our Group Companies</span>
        <div className="flex gap-8 items-center">
          <span className="font-serif italic text-white tracking-widest hover:opacity-80 transition-opacity cursor-pointer">mysoftlogic.lk</span>
          <span className="font-sans font-bold text-white tracking-widest uppercase hover:opacity-80 transition-opacity cursor-pointer text-sm">softlogic GLOMARK</span>
        </div>
      </div>

      {/* Bottom copyright row */}
      <div className="bg-[#0f121d] py-6 text-center text-xs text-neutral-500 flex flex-col md:flex-row justify-between items-center px-6 max-w-7xl mx-auto gap-4">
        <span>Copyright © 2026 GENTWear. All rights reserved.</span>
        <div className="flex gap-3 text-[10px] text-neutral-450 uppercase font-semibold">
          <span>Visa</span>
          <span>Mastercard</span>
          <span>Amex</span>
          <span>Stripe</span>
        </div>
      </div>
    </footer>
  );
};

const AppContent: React.FC = () => {
  const location = useLocation();

  return (
    <div className="bg-white min-h-screen text-neutral-900 flex flex-col selection:bg-neutral-900 selection:text-white">
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

      {/* Global Footer component */}
      <Footer />

      {/* React Hot Toast setup */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1a1a1a',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(8px)',
          },
          success: {
            iconTheme: {
              primary: '#f0a500',
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
