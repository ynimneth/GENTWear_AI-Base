import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, ArrowUp, ArrowDown, X, 
  Folder, FolderOpen, Shield, RefreshCw, ArrowLeft, AlertCircle
} from 'lucide-react';
import { categoryService } from '../services/categoryService';
import { Category } from '../types';
import { toast } from 'react-hot-toast';

const AdminCategories: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Fetch Categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Modal actions
  const handleOpenAddModal = () => {
    setSelectedCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
    setSortOrder('0');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setParentId(cat.parent_id ? cat.parent_id.toString() : '');
    setSortOrder(cat.sort_order.toString());
    setIsActive(cat.is_active);
    setIsModalOpen(true);
  };

  // Submit Category Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Category name is required.');
      return;
    }

    const payload = {
      name,
      slug: slug || undefined,
      description,
      parent_id: parentId ? parseInt(parentId) : null,
      sort_order: parseInt(sortOrder || '0'),
      is_active: isActive
    };

    setLoading(true);
    try {
      if (selectedCategory) {
        await categoryService.updateCategory(selectedCategory.id, payload);
        toast.success('Category updated successfully!');
      } else {
        await categoryService.createCategory(payload);
        toast.success('Category created successfully!');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Error submitting category:', err);
      toast.error(err.response?.data?.message || 'Action failed.');
      setLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category? Deleting a parent category will delete all its subcategories.')) {
      setLoading(true);
      try {
        await categoryService.deleteCategory(id);
        toast.success('Category deleted successfully.');
        fetchCategories();
      } catch (err) {
        console.error('Delete category error:', err);
        toast.error('Deletion failed.');
        setLoading(false);
      }
    }
  };

  // Move / Reorder categories (up or down sort_order)
  const handleMoveOrder = async (cat: Category, direction: 'up' | 'down') => {
    setLoading(true);
    try {
      const adjustment = direction === 'up' ? -1 : 1;
      const newOrder = Math.max(0, cat.sort_order + adjustment);
      
      await categoryService.updateCategory(cat.id, {
        sort_order: newOrder
      });
      
      toast.success(`Position adjusted for ${cat.name}.`);
      fetchCategories();
    } catch (err) {
      console.error('Reordering category error:', err);
      toast.error('Failed to change categories position.');
      setLoading(false);
    }
  };

  // Flat list of categories for parent select dropdown
  const getFlatCategoriesList = (cats: Category[], depth = 0): { id: number; name: string }[] => {
    let list: { id: number; name: string }[] = [];
    cats.forEach(c => {
      list.push({ id: c.id, name: '— '.repeat(depth) + c.name });
      if (c.subcategories && c.subcategories.length > 0) {
        list = [...list, ...getFlatCategoriesList(c.subcategories, depth + 1)];
      }
    });
    return list;
  };

  const flatCategories = getFlatCategoriesList(categories);

  // Recursively render categories hierarchy tree
  const renderCategoryNode = (cat: Category) => {
    const hasChildren = cat.subcategories && cat.subcategories.length > 0;

    return (
      <div key={cat.id} className="pl-4 border-l border-slate-800/80 my-2 space-y-2">
        <div className="flex items-center justify-between p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-850 rounded-xl transition-all group">
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <FolderOpen size={16} className="text-indigo-400" />
            ) : (
              <Folder size={16} className="text-slate-500" />
            )}
            <div>
              <span className="font-bold text-slate-100">{cat.name}</span>
              {cat.description && (
                <span className="text-slate-400 text-xs block mt-0.5 line-clamp-1 max-w-sm">
                  {cat.description}
                </span>
              )}
            </div>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-bold px-2 py-0.5 rounded-full font-mono">
              Order: {cat.sort_order}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
            {/* Reordering */}
            <button
              onClick={() => handleMoveOrder(cat, 'up')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Move Up"
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={() => handleMoveOrder(cat, 'down')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Move Down"
            >
              <ArrowDown size={12} />
            </button>
            
            {/* CRUD */}
            <button
              onClick={() => handleOpenEditModal(cat)}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer ml-3"
              title="Edit"
            >
              <Edit size={12} />
            </button>
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && (
          <div className="ml-4">
            {cat.subcategories?.map(sub => renderCategoryNode(sub))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
              <Shield size={14} /> Admin Dashboard
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 mt-1">Navigation Category Builder</h1>
            <p className="text-slate-400 text-xs mt-0.5">Structure navigation menu headers and hierarchies</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back to Profile
            </button>
            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-98"
            >
              <Plus size={14} /> Add Category
            </button>
          </div>
        </div>

        {/* Categories Tree */}
        {loading && categories.length === 0 ? (
          <div className="min-h-[300px] flex flex-col justify-center items-center">
            <RefreshCw className="animate-spin text-indigo-500 mb-2" size={32} />
            <p className="text-slate-400 text-sm animate-pulse">Loading categories schema...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="min-h-[300px] bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl flex flex-col justify-center items-center p-8 text-center">
            <Folder size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-300">No Categories Defined</h3>
            <p className="text-slate-500 max-w-sm text-sm mt-1">
              Set up sections so products can be catalogued and displayed in the navigation headers.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg cursor-pointer"
            >
              Add First Category
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-850 rounded-2xl p-6 shadow-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">
              Categories Tree Hierarchy (Drag-and-Drop or Ordering supported)
            </span>
            <div className="space-y-4">
              {categories.map(cat => renderCategoryNode(cat))}
            </div>
          </div>
        )}
      </div>

      {/* Form Drawer / Modal (Add / Edit) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950"
            ></motion.div>

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Shield size={16} className="text-indigo-400" />
                  {selectedCategory ? `Edit: ${selectedCategory.name}` : 'Create Category'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Blazers, Shirts"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SEO Custom Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. premium-blazers (auto-generated if empty)"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent Category</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {flatCategories
                      .filter(item => !selectedCategory || item.id !== selectedCategory.id) // cannot nest under itself
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort Order (Custom Menu Position)</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description of the collection..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-350">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4.5 h-4.5 rounded accent-indigo-600 bg-slate-950 border border-slate-850 focus:ring-0"
                    />
                    Category is Active (Visible in Menus)
                  </label>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-250 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg cursor-pointer"
                  >
                    {selectedCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategories;
