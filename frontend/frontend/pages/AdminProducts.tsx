import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, X, Upload, Check, AlertCircle, 
  RefreshCw, ArrowLeft, Shield, CheckSquare, Image as ImageIcon
} from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, Category, ProductVariant, ProductImage } from '../types';
import { getImageUrl } from './ProductList';
import { toast } from 'react-hot-toast';

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Variants and Images Form State
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [primaryImageIdx, setPrimaryImageIdx] = useState(0);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        productService.getProducts({ limit: 100 }), // retrieve products
        categoryService.getCategories()
      ]);
      setProducts(prodData.products || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal open
  const handleOpenAddModal = () => {
    setSelectedProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setCompareAtPrice('');
    setCategoryId('');
    setIsActive(true);
    setIsFeatured(false);
    setVariants([]);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setPrimaryImageIdx(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price.toString());
    setCompareAtPrice(product.compare_at_price ? product.compare_at_price.toString() : '');
    setCategoryId(product.category_id ? product.category_id.toString() : '');
    setIsActive(product.is_active);
    setIsFeatured(product.is_featured);
    setVariants(product.variants || []);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages(product.images || []);
    
    // Find primary index of existing images
    const primIdx = product.images?.findIndex(img => img.is_primary) ?? 0;
    setPrimaryImageIdx(primIdx >= 0 ? primIdx : 0);
    
    setIsModalOpen(true);
  };

  // Handle variants change
  const handleAddVariantRow = () => {
    setVariants(prev => [...prev, { size: '', color: '', color_hex: '#6366f1', price_override: null, stock_qty: 10, sku: '' }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, key: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [key]: value } : v));
  };

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...filesArr]);
      
      const newPreviews = filesArr.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (primaryImageIdx >= existingImages.length + index) {
      setPrimaryImageIdx(0);
    }
  };

  const handleRemoveExistingImage = (id: number) => {
    setExistingImages(prev => prev.filter(img => img.id !== id));
    setPrimaryImageIdx(0); // reset primary
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price) {
      toast.error('Name and Price are required.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    if (compareAtPrice) formData.append('compare_at_price', compareAtPrice);
    if (categoryId) formData.append('category_id', categoryId);
    formData.append('is_active', String(isActive));
    formData.append('is_featured', String(isFeatured));
    formData.append('variants', JSON.stringify(variants));

    // Append images
    imageFiles.forEach(file => {
      formData.append('images', file);
    });

    // Formulate primary index and existing image ordering
    const totalImagesLength = existingImages.length + imageFiles.length;
    if (totalImagesLength > 0) {
      // Map primary tags on existing
      const updatedExisting = existingImages.map((img, idx) => ({
        ...img,
        is_primary: idx === primaryImageIdx,
        sort_order: idx
      }));
      formData.append('existing_images', JSON.stringify(updatedExisting));
      
      // If primary belongs to newly uploaded, pass it
      if (primaryImageIdx >= existingImages.length) {
        formData.append('primary_image_index', String(primaryImageIdx - existingImages.length));
      } else {
        formData.append('primary_image_index', '-1'); // primary is in existing
      }
    }

    setLoading(true);
    try {
      if (selectedProduct) {
        // Edit product
        await productService.updateProduct(selectedProduct.id, formData);
        toast.success('Product updated successfully!');
      } else {
        // Create product
        await productService.createProduct(formData);
        toast.success('Product created successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error submitting product:', err);
      toast.error(err.response?.data?.message || 'Submission failed.');
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product? All variants and images will be permanently removed.')) {
      setLoading(true);
      try {
        await productService.deleteProduct(id);
        toast.success('Product deleted successfully.');
        fetchData();
      } catch (err) {
        console.error('Delete product error:', err);
        toast.error('Deletion failed.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
              <Shield size={14} /> Admin Dashboard
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 mt-1">Product Control Hub</h1>
            <p className="text-slate-400 text-xs mt-0.5">Add, modify, and delete inventory files</p>
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
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

        {/* Dashboard table */}
        {loading && products.length === 0 ? (
          <div className="min-h-[400px] flex flex-col justify-center items-center">
            <RefreshCw className="animate-spin text-indigo-500 mb-2" size={32} />
            <p className="text-slate-400 text-sm animate-pulse">Loading catalog records...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="min-h-[400px] bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl flex flex-col justify-center items-center p-8 text-center">
            <ImageIcon size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-300">Catalog is Empty</h3>
            <p className="text-slate-500 max-w-sm text-sm mt-1">
              There are no products in the database. Get started by clicking "Add Product".
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg cursor-pointer"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/40 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Base Price</th>
                    <th className="py-4 px-6">Variants</th>
                    <th className="py-4 px-6">Total Stock</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm">
                  {products.map((prod) => {
                    const primary = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                    const stock = prod.variants?.reduce((sum, v) => sum + v.stock_qty, 0) || 0;
                    
                    return (
                      <tr key={prod.id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="py-4.5 px-6 flex items-center gap-3">
                          <div className="w-12 h-14 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shrink-0">
                            <img
                              src={getImageUrl(primary?.url)}
                              alt="thumb"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 block">{prod.name}</span>
                            <span className="text-slate-500 text-xs font-mono">{prod.slug}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-slate-300 font-medium">
                          {prod.category?.name || <span className="text-slate-600">None</span>}
                        </td>
                        <td className="py-4.5 px-6 font-bold text-slate-100">
                          ${parseFloat(prod.price as any).toFixed(2)}
                        </td>
                        <td className="py-4.5 px-6 text-slate-400 font-medium">
                          {prod.variants?.length || 0} variants
                        </td>
                        <td className="py-4.5 px-6">
                          <span className={`font-bold ${stock === 0 ? 'text-red-400' : 'text-slate-350'}`}>{stock}</span>
                        </td>
                        <td className="py-4.5 px-6 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            prod.is_active 
                              ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}>
                            {prod.is_active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-right space-x-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white p-2.5 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/30 text-red-400 p-2.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
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
              className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col relative z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6 shrink-0">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-400" />
                  {selectedProduct ? `Modify: ${selectedProduct.name}` : 'Create New Product Record'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                
                {/* 1. Basic Details */}
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 border-b border-slate-800/40 pb-1.5">1. Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Premium Cotton Dress Shirt"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                      >
                        <option value="">Select a Category</option>
                        {categories.map(cat => (
                          <React.Fragment key={cat.id}>
                            <option value={cat.id}>{cat.name}</option>
                            {cat.subcategories?.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                &nbsp;&nbsp;— {sub.name}
                              </option>
                            ))}
                          </React.Fragment>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="89.99"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compare-at Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="120.00"
                        value={compareAtPrice}
                        onChange={(e) => setCompareAtPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Tell the buyers about your garment..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
                      />
                    </div>

                    <div className="flex gap-6 items-center py-2 md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-350">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4.5 h-4.5 rounded accent-indigo-600 bg-slate-950 border border-slate-850 focus:ring-0"
                        />
                        Publish Product (Visible to Public)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-350">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="w-4.5 h-4.5 rounded accent-indigo-600 bg-slate-950 border border-slate-850 focus:ring-0"
                        />
                        Mark as Featured Product
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Variant Configuration */}
                <div>
                  <div className="flex justify-between items-center mb-3 border-b border-slate-800/40 pb-1.5">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">2. Variant Configuration (Size / Color)</h3>
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={10} /> Add Variant Row
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="p-5 bg-slate-950/20 border border-slate-850 rounded-xl text-center text-xs text-slate-500">
                      No custom variants created. The product will be sold as a single unified item using base price.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((v, i) => (
                        <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-3.5 items-end bg-slate-950/30 p-3 border border-slate-850 rounded-xl relative group">
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Size</label>
                            <input
                              type="text"
                              placeholder="S, M, 32"
                              value={v.size || ''}
                              onChange={(e) => handleVariantChange(i, 'size', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Color Name</label>
                            <input
                              type="text"
                              placeholder="Midnight Blue"
                              value={v.color || ''}
                              onChange={(e) => handleVariantChange(i, 'color', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Color Hex</label>
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="color"
                                value={v.color_hex || '#6366f1'}
                                onChange={(e) => handleVariantChange(i, 'color_hex', e.target.value)}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer p-0 shrink-0"
                              />
                              <input
                                type="text"
                                value={v.color_hex || ''}
                                onChange={(e) => handleVariantChange(i, 'color_hex', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-200"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Price Override ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Override"
                              value={v.price_override || ''}
                              onChange={(e) => handleVariantChange(i, 'price_override', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Stock Qty *</label>
                            <input
                              type="number"
                              required
                              value={v.stock_qty || 0}
                              onChange={(e) => handleVariantChange(i, 'stock_qty', parseInt(e.target.value || '0'))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200"
                            />
                          </div>

                          <div className="space-y-1 flex gap-2 items-center">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">SKU</label>
                              <input
                                type="text"
                                placeholder="GENT-SH-BLU-S"
                                value={v.sku || ''}
                                onChange={(e) => handleVariantChange(i, 'sku', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-250"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantRow(i)}
                              className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 p-2 rounded-lg transition-colors cursor-pointer shrink-0 mt-4.5"
                            >
                              <X size={12} />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Product Gallery */}
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 border-b border-slate-800/40 pb-1.5">3. Media Gallery</h3>
                  
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer group mb-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={32} className="text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-200 block">Drag & Drop Images Here</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Supports JPG, PNG, WEBP (Max 5MB each)</span>
                  </div>

                  {/* Previews List */}
                  {(existingImages.length > 0 || imagePreviews.length > 0) && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Uploaded Images (Select swatches to set primary cover)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                        
                        {/* Existing Database Images */}
                        {existingImages.map((img, idx) => (
                          <div
                            key={img.id}
                            className={`relative aspect-[4/5] rounded-xl overflow-hidden border bg-slate-950 group/img ${
                              primaryImageIdx === idx 
                                ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                                : 'border-slate-800'
                            }`}
                          >
                            <img
                              src={getImageUrl(img.url)}
                              alt="database img"
                              onClick={() => setPrimaryImageIdx(idx)}
                              className="w-full h-full object-cover cursor-pointer"
                            />
                            {primaryImageIdx === idx && (
                              <div className="absolute top-2 left-2 bg-indigo-500 text-white rounded-full p-1 text-[9px] font-extrabold flex items-center justify-center">
                                <Check size={8} />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.id)}
                              className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer shadow-md"
                            >
                              <X size={10} />
                            </button>
                            <span className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400">
                              DB Saved
                            </span>
                          </div>
                        ))}

                        {/* Newly uploaded images */}
                        {imagePreviews.map((url, idx) => {
                          const actualIdx = existingImages.length + idx;
                          return (
                            <div
                              key={idx}
                              className={`relative aspect-[4/5] rounded-xl overflow-hidden border bg-slate-950 group/img ${
                                primaryImageIdx === actualIdx 
                                  ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                                  : 'border-slate-800'
                              }`}
                            >
                              <img
                                src={url}
                                alt="preview img"
                                onClick={() => setPrimaryImageIdx(actualIdx)}
                                className="w-full h-full object-cover cursor-pointer"
                              />
                              {primaryImageIdx === actualIdx && (
                                <div className="absolute top-2 left-2 bg-indigo-500 text-white rounded-full p-1 text-[9px] font-extrabold flex items-center justify-center">
                                  <Check size={8} />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveNewImage(idx)}
                                className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer shadow-md"
                              >
                                <X size={10} />
                              </button>
                              <span className="absolute bottom-2 left-2 bg-yellow-500/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold text-slate-950">
                                New File
                              </span>
                            </div>
                          );
                        })}

                      </div>
                    </div>
                  )}

                </div>

              </form>

              {/* Form Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-250 text-xs font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors shadow-lg cursor-pointer"
                >
                  {selectedProduct ? 'Save Changes' : 'Publish Product'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProducts;
