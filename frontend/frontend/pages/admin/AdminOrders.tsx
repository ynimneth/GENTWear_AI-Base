import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Calendar, User, DollarSign, Edit3, X, 
  MapPin, Phone, Mail, Loader2, CreditCard, ChevronDown
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Order {
  id: number;
  status: string;
  total: string;
  shipping_address: any;
  payment_intent_id: string;
  createdAt: string;
  User: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  items: any[];
}

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter === 'all' ? '/admin/orders' : `/admin/orders?status=${statusFilter}`;
      const { data } = await api.get(url);
      setOrders(data);
    } catch (err: any) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const { data } = await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? data : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data);
      }
      toast.success(`Order #${orderId} updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25',
    paid: 'bg-green-500/10 text-green-400 border-green-500/25',
    shipped: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    failed: 'bg-red-500/10 text-red-450 border-red-500/25',
    cancelled: 'bg-slate-850 text-slate-450 border-slate-800'
  };

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Order Management</h1>
        <p className="text-slate-450 text-xs mt-1">Review orders, ship packages, and process cancellations</p>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap gap-2 bg-slate-900/40 p-1.5 border border-slate-850 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'pending', label: 'Pending' },
          { id: 'paid', label: 'Paid' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin text-indigo-400 mr-2" size={24} />
            <span className="text-xs uppercase tracking-wider font-bold">Retrieving Orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500">
            <ShoppingBag size={36} className="text-slate-700 mb-3" />
            <p className="text-sm font-bold">No orders found</p>
            <p className="text-xs mt-1">Orders matching this filter will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-850 bg-slate-950/20">
                  <th className="px-6 py-4 font-bold text-left">Order ID</th>
                  <th className="px-6 py-4 font-bold text-left">Customer</th>
                  <th className="px-6 py-4 font-bold text-center">Placed On</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Total</th>
                  <th className="px-6 py-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr 
                    key={order.id}
                    className="border-b border-slate-850/50 hover:bg-slate-950/25 transition-colors"
                  >
                    <td 
                      onClick={() => setSelectedOrder(order)}
                      className="px-6 py-4.5 font-mono text-indigo-400 hover:underline cursor-pointer font-bold"
                    >
                      #{order.id}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-bold text-slate-200">{order.User?.full_name || 'Guest'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{order.User?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4.5 text-center text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        statusColors[order.status] || 'bg-slate-850'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right font-extrabold text-slate-200">
                      ${parseFloat(order.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4.5 text-center flex items-center justify-center gap-2">
                      <div className="relative inline-block group">
                        <button className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                          Update <ChevronDown size={10} />
                        </button>
                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-25 w-32 text-left">
                          {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map(st => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(order.id, st)}
                              className="w-full text-[10px] font-bold uppercase px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 text-left transition-colors"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col shadow-2xl animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-850 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-150 uppercase tracking-widest">
                  Order Details <span className="font-mono text-indigo-400">#{selectedOrder.id}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              
              {/* Row 1: Customer & Delivery Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer Details */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-indigo-400" /> Customer Account
                  </h4>
                  {selectedOrder.User ? (
                    <div className="space-y-1 pl-4.5">
                      <p className="font-bold text-slate-200">{selectedOrder.User.full_name}</p>
                      <p className="text-slate-450 flex items-center gap-1"><Mail size={11} /> {selectedOrder.User.email}</p>
                    </div>
                  ) : (
                    <p className="text-slate-400 pl-4.5">Guest Customer</p>
                  )}
                </div>

                {/* Shipping Address Details */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-indigo-400" /> Shipping Destination
                  </h4>
                  <div className="space-y-1 pl-4.5 text-slate-350">
                    <p className="font-bold text-slate-200">{selectedOrder.shipping_address?.full_name}</p>
                    <p className="flex items-center gap-1 text-[11px]"><Phone size={11} /> {selectedOrder.shipping_address?.phone_number}</p>
                    <p className="pt-1.5 text-slate-400">
                      {selectedOrder.shipping_address?.address_line1}
                      {selectedOrder.shipping_address?.address_line2 ? `, ${selectedOrder.shipping_address.address_line2}` : ''}<br/>
                      {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.postal_code}<br/>
                      {selectedOrder.shipping_address?.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stripe Payment Reference */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-indigo-400" />
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Payment Reference</span>
                    <span className="font-mono text-slate-300">{selectedOrder.payment_intent_id || 'N/A (Cash or incomplete)'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Order Status</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block mt-0.5 ${
                    statusColors[selectedOrder.status] || 'bg-slate-850'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Order Items Summary</h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-500 border-b border-slate-850">
                        <th className="px-4 py-2 font-bold text-left">Item Name</th>
                        <th className="px-4 py-2 font-bold text-center">Attributes</th>
                        <th className="px-4 py-2 font-bold text-center">Qty</th>
                        <th className="px-4 py-2 font-bold text-right">Unit Price</th>
                        <th className="px-4 py-2 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => {
                        const price = parseFloat(item.price);
                        const qty = parseInt(item.quantity);
                        return (
                          <tr key={idx} className="border-b border-slate-850/50">
                            <td className="px-4 py-2.5 font-bold text-slate-300">{item.Product?.name || 'Deleted Product'}</td>
                            <td className="px-4 py-2.5 text-center text-slate-400">
                              {item.variant ? (
                                <span className="uppercase text-[10px] font-semibold bg-slate-850 px-1.5 py-0.5 rounded border border-slate-800">
                                  {item.variant.size ? `Sz ${item.variant.size}` : ''} {item.variant.color ? `• ${item.variant.color}` : ''}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-slate-400">{qty}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-400">${price.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-slate-200">${(price * qty).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950/20 font-bold">
                        <td colSpan={4} className="px-4 py-3.5 text-right text-slate-400">Total Sum Paid:</td>
                        <td className="px-4 py-3.5 text-right text-indigo-400 text-sm font-extrabold">${parseFloat(selectedOrder.total).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-850 bg-slate-950/20 flex gap-3 justify-end">
              <div className="relative group">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1">
                  Change Status <ChevronDown size={13} />
                </button>
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-25 w-36">
                  {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      className="w-full text-xs font-bold uppercase px-3.5 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 text-left transition-colors"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminOrders;
