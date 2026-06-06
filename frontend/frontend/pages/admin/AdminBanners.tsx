import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, Plus, Trash2, Calendar, Layout, 
  ToggleLeft, ToggleRight, Loader2, Sparkles, X, Eye
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Banner {
  id: number;
  image_url: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  createdAt: string;
}

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [position, setPosition] = useState('hero');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Preview modal state
  const [viewBannerUrl, setViewBannerUrl] = useState<string | null>(null);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/banners');
      setBanners(data);
    } catch (err: any) {
      toast.error('Failed to load banners');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Please select an image file to upload.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('position', position);
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('is_active', String(isActive));

    try {
      await api.post('/admin/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Banner created successfully!');
      fetchBanners();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const updatedActive = !banner.is_active;
      const { data } = await api.put(`/admin/banners/${banner.id}`, { is_active: updatedActive });
      setBanners(prev => prev.map(b => b.id === banner.id ? data : b));
      toast.success(`Banner status updated successfully.`);
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this banner advertisement?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners(prev => prev.filter(b => b.id !== id));
      toast.success('Banner deleted');
    } catch (err: any) {
      toast.error('Failed to delete banner');
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setPosition('hero');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
  };

  const getFullImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `http://localhost:5000${url}`;
  };

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Banners & Ads</h1>
          <p className="text-slate-450 text-xs mt-1">Manage marketing placement slots and schedule advertisements</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 transition-all active:scale-98"
          >
            <Plus size={16} /> Create Banner
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
              <Sparkles size={16} className="text-indigo-400" /> Create Banner Ad
            </h3>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* File uploader panel */}
            <div className="md:col-span-1 space-y-3">
              <label className="text-xs text-slate-400 font-bold block">Banner Graphic *</label>
              {previewUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-850 rounded-lg text-red-400 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center cursor-pointer hover:border-slate-700 transition-colors py-8">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <ImageIcon size={28} className="text-slate-650 mb-2" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Select File</span>
                  <span className="text-[9px] text-slate-550 mt-1">PNG, JPG, WEBP up to 5MB</span>
                </div>
              )}
            </div>

            {/* Placement details */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Display Placement *</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="hero">Hero Top Carousel</option>
                  <option value="mid-page">Mid-Page Grid Banner</option>
                  <option value="promo-bar">Top Promotion Bar</option>
                  <option value="sidebar">Sidebar Widget</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-350 cursor-pointer">Activate immediately upon save</label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Schedule Start Date (Optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Schedule End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
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
              {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Save Campaign'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Banners */}
      {isLoading ? (
        <div className="py-24 flex justify-center items-center text-slate-400">
          <Loader2 className="animate-spin text-indigo-400 mr-2" size={24} />
          <span className="text-xs uppercase tracking-wider font-bold">Loading Campaigns...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500 bg-slate-900/40 border border-slate-850 rounded-2xl">
          <ImageIcon size={36} className="text-slate-700 mb-3" />
          <p className="text-sm font-bold">No banners registered yet</p>
          <p className="text-xs mt-1">Upload graphics to publish discounts on homepage widgets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-850/60 rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Graphic thumbnail */}
              <div className="relative aspect-video bg-slate-950 border-b border-slate-850/60 group">
                <img 
                  src={getFullImageUrl(banner.image_url)} 
                  alt="Campaign banner" 
                  className="w-full h-full object-cover" 
                />
                
                {/* Image Overlay trigger */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2.5 duration-200">
                  <button
                    onClick={() => setViewBannerUrl(banner.image_url)}
                    className="p-2 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-500 shadow-md transition-colors"
                    title="View Full Graphic"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 bg-red-600 text-white rounded-xl cursor-pointer hover:bg-red-500 shadow-md transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Campaign settings */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Layout size={10} /> {banner.position}
                    </span>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className={`text-slate-400 hover:text-slate-200 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer`}
                    >
                      {banner.is_active ? (
                        <span className="text-green-400 flex items-center gap-1"><ToggleRight size={22} /> Active</span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1"><ToggleLeft size={22} /> Inactive</span>
                      )}
                    </button>
                  </div>

                  {/* Schedule dates */}
                  {(banner.start_date || banner.end_date) ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-450 mt-1 font-semibold">
                      <Calendar size={12} className="text-slate-500" />
                      <span>
                        {banner.start_date ? new Date(banner.start_date).toLocaleDateString() : 'Immediate'}
                        {' — '}
                        {banner.end_date ? new Date(banner.end_date).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-semibold">
                      <Calendar size={12} />
                      <span>Always Active (No limits)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-550 border-t border-slate-850/40 pt-3 mt-1 font-semibold">
                  <span>Registered: {new Date(banner.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="text-red-400/80 hover:text-red-400 font-bold uppercase transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Graphic Preview Lightbox Modal */}
      {viewBannerUrl && (
        <div 
          onClick={() => setViewBannerUrl(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 flex items-center justify-center shadow-2xl">
            <img 
              src={getFullImageUrl(viewBannerUrl)} 
              alt="Expanded Banner Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl" 
            />
            <button
              onClick={() => setViewBannerUrl(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 border border-slate-800 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBanners;
