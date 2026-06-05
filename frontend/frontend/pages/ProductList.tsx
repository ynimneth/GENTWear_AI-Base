import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, Search, ChevronDown, RefreshCw, 
  Grid, List, Eye, ShoppingBag, ArrowUpDown, X
} from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, Category } from '../types';

export const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'; // fallback placeholder
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
};

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catIdParam = searchParams.get('category_id');

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch initial categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products when filters or page changes
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 9,
        sort
      };
      if (selectedCategory) params.category_id = selectedCategory;
      if (search) params.search = search;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const data = await productService.getProducts(params);
      setProducts(data.products || []);
      setTotalProducts(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (catIdParam) {
      setSelectedCategory(parseInt(catIdParam));
    } else {
      setSelectedCategory(null);
    }
    setCurrentPage(1);
  }, [catIdParam]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sort, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setCurrentPage(1);
    // Fetch immediately
    setTimeout(() => fetchProducts(), 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Title */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-2 block">Premium Apparel</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-purple-300">
            Explore GENTWear Collections
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
            Curated menswear designed with tailoring excellence. Browse through our premium selections, filtered exactly to your preferences.
          </p>
        </div>

        {/* Action Controls & Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 shrink-0 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-xl sticky top-6 self-start">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800/60 mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                <SlidersHorizontal size={18} className="text-indigo-400" /> Filters
              </h2>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Reset All
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Shirts, Blazers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500/80 text-slate-100 placeholder-slate-500"
                />
                <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
                  <Search size={16} />
                </button>
              </div>
            </form>

            {/* Categories Filter */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Categories</label>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
                  className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all ${
                    selectedCategory === null 
                      ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold' 
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Products
                </button>

                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                      className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all flex justify-between items-center ${
                        selectedCategory === cat.id 
                          ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold' 
                          : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                    {/* Render subcategories if category is active or parent */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pl-4 space-y-1">
                        {cat.subcategories.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => { setSelectedCategory(sub.id); setCurrentPage(1); }}
                            className={`w-full text-left text-xs py-1.5 px-3 rounded-md transition-all ${
                              selectedCategory === sub.id 
                                ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                                : 'hover:bg-slate-850 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            • {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Price Range ($)</label>
              <div className="flex gap-2.5 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/80 text-slate-100"
                />
                <span className="text-slate-600">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/80 text-slate-100"
                />
              </div>
              <button
                onClick={() => { setCurrentPage(1); fetchProducts(); }}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-xs transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </aside>

          {/* Main Products Grid & Mobile Header */}
          <div className="flex-1">
            
            {/* Sorting & Filter toggle header */}
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-slate-400">
                Showing <span className="text-slate-200 font-bold">{products.length}</span> of{' '}
                <span className="text-slate-200 font-bold">{totalProducts}</span> Products
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 px-4 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal size={14} /> Filter
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-slate-850 border border-slate-800 rounded-xl py-2 px-3 text-xs">
                  <ArrowUpDown size={14} className="text-slate-400" />
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent border-none text-slate-200 focus:outline-none pr-6 cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900">Newest Arrival</option>
                    <option value="price_asc" className="bg-slate-900">Price: Low to High</option>
                    <option value="price_desc" className="bg-slate-900">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="min-h-[400px] flex flex-col justify-center items-center">
                <RefreshCw className="animate-spin text-indigo-500 mb-2" size={32} />
                <p className="text-slate-400 text-sm animate-pulse">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="min-h-[400px] bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl flex flex-col justify-center items-center p-8 text-center">
                <ShoppingBag size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-300">No Products Found</h3>
                <p className="text-slate-500 max-w-sm text-sm mt-1">
                  We couldn't find any items matching your selected criteria. Try adjusting filters or resetting the search.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {products.map((prod) => {
                      const primaryImg = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                      const totalStock = prod.variants?.reduce((sum, v) => sum + v.stock_qty, 0) || 0;
                      
                      // Gather unique colors from variants
                      const colors = prod.variants
                        ?.map(v => ({ name: v.color, hex: v.color_hex }))
                        .filter((val, idx, self) => val.hex && self.findIndex(t => t.hex === val.hex) === idx) || [];

                      return (
                        <motion.div
                          key={prod.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          whileHover={{ y: -6 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => navigate(`/products/${prod.id}`)}
                          className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg group cursor-pointer flex flex-col h-full"
                        >
                          {/* Image container */}
                          <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden w-full">
                            <img
                              src={getImageUrl(primaryImg?.url)}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                            {/* Featured tag */}
                            {prod.is_featured && (
                              <span className="absolute top-3 left-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                                Featured
                              </span>
                            )}
                            {/* Stock status tag */}
                            {totalStock === 0 && (
                              <span className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                                Out of Stock
                              </span>
                            )}

                            {/* Dark overlay with hover details */}
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                              <span className="bg-slate-900 border border-slate-750 text-slate-100 rounded-full p-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                <Eye size={18} />
                              </span>
                            </div>
                          </div>

                          {/* Info panel */}
                          <div className="p-5 flex-1 flex flex-col">
                            <span className="text-xs text-indigo-400 font-semibold mb-1 uppercase tracking-wider block">
                              {prod.category?.name || 'Uncategorized'}
                            </span>
                            <h3 className="text-base font-bold text-slate-100 line-clamp-1 group-hover:text-indigo-300 transition-colors mb-2">
                              {prod.name}
                            </h3>

                            {/* Color Swatches */}
                            {colors.length > 0 && (
                              <div className="flex gap-1.5 mb-3 flex-wrap">
                                {colors.map((c, i) => (
                                  <div
                                    key={i}
                                    style={{ backgroundColor: c.hex || '' }}
                                    title={c.name || ''}
                                    className="w-3.5 h-3.5 rounded-full border border-slate-950 ring-1 ring-slate-800"
                                  ></div>
                                ))}
                              </div>
                            )}

                            <div className="mt-auto pt-3 border-t border-slate-850 flex justify-between items-center">
                              <div>
                                <span className="text-lg font-bold text-slate-100">${parseFloat(prod.price as any).toFixed(2)}</span>
                                {prod.compare_at_price && (
                                  <span className="text-xs line-through text-slate-500 ml-2">
                                    ${parseFloat(prod.compare_at_price as any).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                {totalStock > 0 ? `${totalStock} in stock` : 'Sold Out'}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:hover:border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                          currentPage === i + 1
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:hover:border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Filter (collapsible) */}
      <AnimatePresence>
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black"
            ></motion.div>

            {/* Sidebar drawer content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-10 overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-indigo-400" /> Filters
                </h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="mb-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Shirts, Blazers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500/80 text-slate-100 placeholder-slate-500"
                  />
                  <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
                    <Search size={16} />
                  </button>
                </div>
              </form>

              {/* Mobile Categories */}
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Categories</label>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedCategory(null); setCurrentPage(1); setShowMobileFilters(false); }}
                    className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all ${
                      selectedCategory === null 
                        ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Products
                  </button>

                  {categories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); setShowMobileFilters(false); }}
                        className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all ${
                          selectedCategory === cat.id 
                            ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {cat.subcategories.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => { setSelectedCategory(sub.id); setCurrentPage(1); setShowMobileFilters(false); }}
                              className={`w-full text-left text-xs py-1.5 px-3 rounded-md transition-all ${
                                selectedCategory === sub.id 
                                  ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                                  : 'hover:bg-slate-850 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              • {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Price Range ($)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/80 text-slate-100"
                  />
                  <span className="text-slate-600">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/80 text-slate-100"
                  />
                </div>
              </div>

              {/* Apply & Reset Buttons */}
              <div className="mt-auto space-y-2.5 pt-4 border-t border-slate-800">
                <button
                  onClick={() => { setCurrentPage(1); fetchProducts(); setShowMobileFilters(false); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => { handleResetFilters(); setShowMobileFilters(false); }}
                  className="w-full bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-200 font-medium py-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductList;
