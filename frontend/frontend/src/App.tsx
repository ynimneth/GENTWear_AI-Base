import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { User, Shield, LogOut, RefreshCw, KeyRound } from 'lucide-react';

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

  const handleLogout = async () => {
    await logout();
    toast.success('Successfully logged out!');
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
            <User size={32} />
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
                  <p className="text-xs text-slate-400">Manage user registrations and roles</p>
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
          {/* Mock admin dashboard details */}
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

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { refreshToken } = useAuthStore() as any;

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

  if (isInitializing) {
    return <Loader />;
  }

  return (
    <Router>
      <div className="bg-slate-950 min-h-screen select-none">
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminView />
              </ProtectedRoute>
            }
          />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
        
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
    </Router>
  );
}

export default App;
