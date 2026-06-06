import React, { useState, useEffect } from 'react';
import { 
  Percent, Sparkles, Plus, Trash2, Calendar, ToggleLeft, 
  ToggleRight, Loader2, Tag, CalendarDays, X
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Promotion {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  expiry_date: string | null;
  is_active: boolean;
  createdAt: string;
}

const AdminPromotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/promotions');
      setPromotions(data);
    } catch (err: any) {
      toast.error('Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) {
      toast.error('Code and discount value are required');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Discount value must be greater than zero');
      return;
    }

    if (discountType === 'percent' && val > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/admin/promotions', {
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: val,
        expiry_date: expiryDate || null,
        is_active: isActive
      });

      toast.success('Promotion code created!');
      setPromotions(prev => [data, ...prev]);
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create promotion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const updatedActive = !promo.is_active;
      const { data } = await api.put(`/admin/promotions/${promo.id}`, { is_active: updatedActive });
      setPromotions(prev => prev.map(p => p.id === promo.id ? data : p));
      toast.success(`Discount code status updated successfully.`);
    } catch (err: any) {
      toast.error('Failed to update promotion status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this promotion code?')) return;
    try {
      await api.delete(`/admin/promotions/${id}`);
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast.success('Promotion code deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete promotion');
    }
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percent');
    setDiscountValue('');
    setExpiryDate('');
    setIsActive(true);
  };

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Promotions</h1>
          <p className="text-slate-450 text-xs mt-1">Configure discount codes, markdown rates, and coupon exclusions</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 transition-all active:scale-98"
          >
            <Plus size={16} /> Create Code
          </button>
        )}
      </div>

      {/* Creation form */}
      {showForm && (
        <form 
          onSubmit={handleFormSubmit}
          className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl space-y-5 animate-slideDown"
        >
          <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-400" /> Create Promotion Code
            </h3>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Coupon Code *</label>
              <input
                type="text"
                placeholder="GENT10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono font-bold placeholder:font-sans uppercase tracking-widest focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Discount Format *</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="percent">Percentage Off (%)</option>
                <option value="fixed">Fixed Cash Value ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Discount Amount *</label>
              <input
                type="number"
                step="0.01"
                placeholder={discountType === 'percent' ? '10' : '15.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Expiration Boundary (Optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end pb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-350 cursor-pointer">Activate code immediately</label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-850">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-indigo-600/10"
            >
              {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Save Coupon'}
            </button>
          </div>
        </form>
      )}

      {/* Promotions List Card */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin text-indigo-400 mr-2" size={24} />
            <span className="text-xs uppercase tracking-wider font-bold">Loading Coupon Registry...</span>
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500">
            <Tag size={36} className="text-slate-700 mb-3 animate-pulse" />
            <p className="text-sm font-bold">No promotion codes registered</p>
            <p className="text-xs mt-1">Generate discount codes to launch marketing programs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-850 bg-slate-950/20">
                  <th className="px-6 py-4 font-bold text-left">Promo Code</th>
                  <th className="px-6 py-4 font-bold text-center">Discount Format</th>
                  <th className="px-6 py-4 font-bold text-center">Discount Rate</th>
                  <th className="px-6 py-4 font-bold text-center">Expiry Schedule</th>
                  <th className="px-6 py-4 font-bold text-center">Active Status</th>
                  <th className="px-6 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map(promo => {
                  const isExpired = !!(promo.expiry_date && new Date(promo.expiry_date) < new Date());
                  return (
                    <tr 
                      key={promo.id}
                      className="border-b border-slate-850/50 hover:bg-slate-950/25 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-200 tracking-wider">
                        {promo.code}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          promo.discount_type === 'percent'
                            ? 'bg-purple-600/10 text-purple-400 border-purple-500/20'
                            : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {promo.discount_type === 'percent' ? 'Percentage' : 'Fixed Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-100">
                        {promo.discount_type === 'percent' 
                          ? `${parseFloat(promo.discount_value).toFixed(0)}%` 
                          : `$${parseFloat(promo.discount_value).toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400">
                        {promo.expiry_date ? (
                          <span className={`flex items-center justify-center gap-1 text-[10px] ${isExpired ? 'text-red-400 font-bold' : ''}`}>
                            <CalendarDays size={12} className="text-slate-500" />
                            {new Date(promo.expiry_date).toLocaleDateString()}
                            {isExpired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-slate-550">Ongoing (No Expiry)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          disabled={isExpired}
                          className={`flex items-center justify-center gap-1 mx-auto cursor-pointer disabled:opacity-50`}
                        >
                          {promo.is_active && !isExpired ? (
                            <span className="text-green-400 flex items-center gap-0.5"><ToggleRight size={20} /> Active</span>
                          ) : (
                            <span className="text-slate-550 flex items-center gap-0.5"><ToggleLeft size={20} /> Suspended</span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminPromotions;
