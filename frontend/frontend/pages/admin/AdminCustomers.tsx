import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Mail, Loader2, UserMinus, UserCheck, 
  Search, ShieldAlert, Award
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Customer {
  id: number;
  email: string;
  full_name: string;
  is_blocked: boolean;
  createdAt: string;
  ordersCount: number;
  totalSpend: number;
}

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlocking, setIsBlocking] = useState<number | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/customers');
      setCustomers(data);
    } catch (err: any) {
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleBlock = async (customer: Customer) => {
    const action = customer.is_blocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} customer ${customer.full_name}?`)) return;

    setIsBlocking(customer.id);
    try {
      const updatedBlocked = !customer.is_blocked;
      const { data } = await api.put(`/admin/customers/${customer.id}/block`, { is_blocked: updatedBlocked });
      
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, is_blocked: data.is_blocked } : c));
      toast.success(`Customer ${customer.full_name} successfully ${customer.is_blocked ? 'unblocked' : 'suspended'}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} customer`);
    } finally {
      setIsBlocking(null);
    }
  };

  // Filter customers by search input
  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Customers Registry</h1>
          <p className="text-slate-450 text-xs mt-1">Review client account status, spending levels, and access bans</p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-150 focus:outline-none focus:border-indigo-500 font-medium"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin text-indigo-400 mr-2" size={24} />
            <span className="text-xs uppercase tracking-wider font-bold">Querying Customer Registry...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-550">
            <Users size={36} className="text-slate-700 mb-3" />
            <p className="text-sm font-bold">No customer accounts match your search</p>
            <p className="text-xs mt-1">Try refining your filter queries or keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs animate-fadeIn">
              <thead>
                <tr className="text-slate-500 border-b border-slate-850 bg-slate-950/20">
                  <th className="px-6 py-4 font-bold text-left">Customer Name</th>
                  <th className="px-6 py-4 font-bold text-left">Contact Info</th>
                  <th className="px-6 py-4 font-bold text-center">Registered Date</th>
                  <th className="px-6 py-4 font-bold text-center">Orders Placed</th>
                  <th className="px-6 py-4 font-bold text-right">Total Spent</th>
                  <th className="px-6 py-4 font-bold text-center">Account Status</th>
                  <th className="px-6 py-4 font-bold text-center">Operations</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(cust => (
                  <tr 
                    key={cust.id} 
                    className={`border-b border-slate-850/50 hover:bg-slate-950/25 transition-colors ${
                      cust.is_blocked ? 'bg-red-950/5/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4.5 font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        {cust.full_name}
                        {cust.totalSpend >= 500 && (
                          <span 
                            title="VIP Customer (>$500 spend)"
                            className="p-1 bg-yellow-500/10 text-yellow-500 rounded-md border border-yellow-500/20 flex items-center justify-center shrink-0"
                          >
                            <Award size={10} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-600" /> {cust.email}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar size={12} className="text-slate-600" />
                        {new Date(cust.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center font-bold text-slate-350">
                      {cust.ordersCount}
                    </td>
                    <td className="px-6 py-4.5 text-right font-black text-indigo-400">
                      ${cust.totalSpend.toFixed(2)}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      {cust.is_blocked ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600/10 text-red-400 border border-red-500/20 inline-flex items-center gap-1">
                          <ShieldAlert size={10} /> Suspended
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 inline-flex items-center gap-1">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <button
                        onClick={() => handleToggleBlock(cust)}
                        disabled={isBlocking === cust.id}
                        className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 active:scale-98 disabled:opacity-40 ${
                          cust.is_blocked
                            ? 'bg-green-600/10 hover:bg-green-600/15 border-green-500/20 text-green-400'
                            : 'bg-red-600/10 hover:bg-red-600/15 border-red-500/20 text-red-400'
                        }`}
                      >
                        {isBlocking === cust.id ? (
                          <Loader2 className="animate-spin" size={10} />
                        ) : cust.is_blocked ? (
                          <>
                            <UserCheck size={11} /> Unblock
                          </>
                        ) : (
                          <>
                            <UserMinus size={11} /> Suspend
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminCustomers;
