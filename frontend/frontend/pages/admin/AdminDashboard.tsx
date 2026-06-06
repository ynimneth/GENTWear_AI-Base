import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ShoppingBag, Users, AlertTriangle, ArrowUpRight, 
  TrendingUp, Shirt, Calendar, CalendarDays, CalendarRange
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface ChartItem {
  period: string;
  amount: number;
}

interface KpiStats {
  totalRevenue: number;
  ordersCount: number;
  customersCount: number;
  lowStockCount: number;
}

interface TopProduct {
  productId: number;
  name: string;
  unitsSold: number;
  revenue: number;
}

interface DashboardData {
  kpi: KpiStats;
  charts: {
    daily: ChartItem[];
    weekly: ChartItem[];
    monthly: ChartItem[];
  };
  topProducts: TopProduct[];
  recentOrders: any[];
  lowStockAlerts: any[];
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartInterval, setChartInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: resData } = await api.get('/admin/analytics/sales');
        setData(resData);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-slate-400">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
        <p className="text-xs uppercase tracking-widest font-bold">Compiling Dashboard Metrics...</p>
      </div>
    );
  }

  // Draw Custom SVG Chart
  const chartData = data.charts[chartInterval] || [];
  const renderSalesChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
          No paid orders recorded for this period.
        </div>
      );
    }

    const amounts = chartData.map(c => c.amount);
    const maxVal = Math.max(...amounts, 100);
    const minVal = 0;
    const range = maxVal - minVal;

    const width = 600;
    const height = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Map data to x, y points
    const points = chartData.map((item, index) => {
      const x = paddingLeft + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((item.amount - minVal) / range) * chartHeight;
      return { x, y, ...item };
    });

    const pathD = points.reduce((acc, p, index) => {
      return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none overflow-visible">
        <defs>
          <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines & Y-Axis Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = paddingTop + chartHeight - r * chartHeight;
          const valLabel = Math.round(minVal + r * range);
          return (
            <g key={i}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3,3" />
              <text x={paddingLeft - 8} y={y + 3} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end">
                ${valLabel}
              </text>
            </g>
          );
        })}

        {/* Render Chart Shape */}
        {chartType === 'line' ? (
          <>
            <path d={areaD} fill="url(#chart-glow)" />
            <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Dots */}
            {points.map((p, i) => (
              <g key={i} className="group/dot">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="3.5" 
                  fill="#8b5cf6" 
                  stroke="#ffffff" 
                  strokeWidth="1.5" 
                  className="transition-all duration-200"
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="9" 
                  fill="#8b5cf6" 
                  fillOpacity="0" 
                  className="cursor-pointer"
                />
                {/* Tooltip on Hover */}
                <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect 
                    x={p.x - 35} 
                    y={p.y - 28} 
                    width="70" 
                    height="18" 
                    rx="4" 
                    fill="#0f172a" 
                    stroke="#1e293b" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={p.x} 
                    y={p.y - 16} 
                    fill="#f8fafc" 
                    fontSize="8.5" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    ${p.amount.toFixed(0)}
                  </text>
                </g>
              </g>
            ))}
          </>
        ) : (
          points.map((p, i) => {
            const barWidth = Math.max((chartWidth / chartData.length) * 0.55, 6);
            const barHeight = ((p.amount - minVal) / range) * chartHeight;
            const x = p.x - barWidth / 2;
            const y = paddingTop + chartHeight - barHeight;
            
            return (
              <g key={i} className="group/bar">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  fill="url(#bar-gradient)"
                  rx="2"
                  className="transition-all duration-200 group-hover/bar:opacity-90 cursor-pointer"
                />
                {/* Tooltip on Hover */}
                <g className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150 pointer-events-none">
                  <rect 
                    x={p.x - 35} 
                    y={y - 24} 
                    width="70" 
                    height="18" 
                    rx="4" 
                    fill="#0f172a" 
                    stroke="#1e293b" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={p.x} 
                    y={y - 12} 
                    fill="#f8fafc" 
                    fontSize="8.5" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    ${p.amount.toFixed(0)}
                  </text>
                </g>
              </g>
            );
          })
        )}

        {/* X Axis Labels */}
        {chartData.map((d, i) => {
          const step = Math.ceil(chartData.length / 6);
          if (i % step !== 0 && i !== chartData.length - 1) return null;
          const x = paddingLeft + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
          return (
            <text key={i} x={x} y={height - 8} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">
              {d.period}
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Dashboard Overview</h1>
          <p className="text-slate-450 text-xs mt-1">Real-time statistics & business diagnostics</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 rounded-xl p-1.5 font-bold">
          <span className="flex items-center gap-1.5 text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" /> Live Stats
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
        {/* Card 1: Revenue */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest block">Total Sales</span>
            <p className="text-2xl font-black text-slate-100">${data.kpi.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
              <TrendingUp size={12} /> +12.4% this month
            </span>
          </div>
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/10">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Card 2: Orders Count */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest block">Orders Placed</span>
            <p className="text-2xl font-black text-slate-100">{data.kpi.ordersCount}</p>
            <span className="text-[10px] text-indigo-400 font-bold">Volume statistics</span>
          </div>
          <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/10">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* Card 3: Customers Count */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest block">Active Customers</span>
            <p className="text-2xl font-black text-slate-100">{data.kpi.customersCount}</p>
            <span className="text-[10px] text-slate-450">Excludes moderators</span>
          </div>
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/10">
            <Users size={20} />
          </div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-widest block">Low Stock Warnings</span>
            <p className={`text-2xl font-black ${data.kpi.lowStockCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {data.kpi.lowStockCount}
            </p>
            <span className="text-[10px] text-slate-450">Needs refilling</span>
          </div>
          <div className={`p-3 rounded-xl border ${
            data.kpi.lowStockCount > 0 
              ? 'bg-red-600/10 text-red-400 border-red-500/10' 
              : 'bg-slate-800/40 text-slate-400 border-slate-700/10'
          }`}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Sales Analytics Chart Section */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" /> Sales Trend Report
            </h3>
            <p className="text-slate-450 text-[10px] mt-0.5">Track revenue metrics grouped by select cycles</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Chart toggle daily/weekly/monthly */}
            <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
              {[
                { id: 'daily', label: 'Day', icon: Calendar },
                { id: 'weekly', label: 'Week', icon: CalendarDays },
                { id: 'monthly', label: 'Month', icon: CalendarRange }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setChartInterval(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                    chartInterval === btn.id
                      ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  <btn.icon size={11} /> {btn.label}
                </button>
              ))}
            </div>

            {/* Chart line/bar toggle */}
            <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
              {['line', 'bar'].map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                    chartType === type
                      ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Render Container */}
        <div className="h-64 flex items-center justify-center">
          {renderSalesChart()}
        </div>
      </div>

      {/* Details Grid: Top Products / Low Stock Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Table 1: Top Selling Products */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-slate-850/60 mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shirt size={16} className="text-indigo-400" /> Top Selling Items
            </h3>
            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              Volume Leaders
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-850/60">
                  <th className="py-2.5 font-bold text-left">Product</th>
                  <th className="py-2.5 font-bold text-center">Units Sold</th>
                  <th className="py-2.5 font-bold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">No records found.</td>
                  </tr>
                ) : (
                  data.topProducts.map((tp, idx) => (
                    <tr key={tp.productId || idx} className="border-b border-slate-850/30 hover:bg-slate-950/20">
                      <td className="py-3 font-bold text-slate-300">{tp.name}</td>
                      <td className="py-3 text-center font-bold text-slate-400">{tp.unitsSold}</td>
                      <td className="py-3 text-right font-bold text-indigo-400">${tp.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Low Stock Warnings */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-slate-850/60 mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Low Stock Alerts
            </h3>
            <span className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-850/60">
                  <th className="py-2.5 font-bold text-left">Product Variant</th>
                  <th className="py-2.5 font-bold text-center">SKU</th>
                  <th className="py-2.5 font-bold text-right">Qty Left</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-emerald-500 font-semibold">✓ All products fully stocked.</td>
                  </tr>
                ) : (
                  data.lowStockAlerts.map((ls, idx) => (
                    <tr key={ls.id || idx} className="border-b border-slate-850/30 hover:bg-slate-950/20">
                      <td className="py-3 font-bold text-slate-300">
                        {ls.Product?.name} <span className="text-[10px] text-slate-500 uppercase">({ls.size ? `Sz: ${ls.size}` : ''} {ls.color ? `Col: ${ls.color}` : ''})</span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-450">{ls.sku || '-'}</td>
                      <td className="py-3 text-right font-extrabold text-red-400">{ls.stock_qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl text-left">
        <div className="flex justify-between items-center pb-4 border-b border-slate-850/60 mb-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ShoppingBag size={16} className="text-indigo-400" /> Recent Placed Orders
          </h3>
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            Incoming queue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-850/60">
                <th className="py-2.5 font-bold text-left">Order ID</th>
                <th className="py-2.5 font-bold text-left">Customer</th>
                <th className="py-2.5 font-bold text-center">Status</th>
                <th className="py-2.5 font-bold text-center">Placed At</th>
                <th className="py-2.5 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No orders placed yet.</td>
                </tr>
              ) : (
                data.recentOrders.map((order) => {
                  const statusColors = {
                    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25',
                    paid: 'bg-green-500/10 text-green-400 border-green-500/25',
                    shipped: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
                    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
                    failed: 'bg-red-500/10 text-red-400 border-red-500/25',
                    cancelled: 'bg-slate-850 text-slate-450 border-slate-800'
                  };
                  return (
                    <tr key={order.id} className="border-b border-slate-850/30 hover:bg-slate-950/20">
                      <td className="py-3.5 font-mono text-indigo-400">#{order.id}</td>
                      <td className="py-3.5">
                        <div className="font-bold text-slate-300">{order.User?.full_name || 'Guest'}</div>
                        <div className="text-[10px] text-slate-500">{order.User?.email || '-'}</div>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          statusColors[order.status as keyof typeof statusColors] || 'bg-slate-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-center text-slate-450">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-slate-200">
                        ${parseFloat(order.total).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
