import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, Search, ChevronDown, RefreshCw, 
  Grid, List, Eye, ShoppingBag, ArrowUpDown, X, Heart, Sparkles
} from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, Category } from '../types';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { gsap } from 'gsap';
import { toast } from 'react-hot-toast';

// Trie, QuickSort and API imports
import { Trie } from '../algorithms/Trie';
import { quickSort } from '../algorithms/quickSort';
import api from '../lib/api';
import { ScrollAnimate } from '../components/ScrollAnimate';

export const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'; // fallback placeholder
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
};

export const formatLKR = (usdPrice: any) => {
  if (!usdPrice) return '';
  const converted = Math.round(parseFloat(usdPrice) * 300);
  return `LKR ${converted.toLocaleString()}`;
};

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catIdParam = searchParams.get('category_id');

  const { toggleWishlist, isInWishlist } = useWishlistStore() as any;
  const { user } = useAuthStore() as any;

  const handleToggleWishlist = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to save items to your wishlist.');
      navigate('/login');
      return;
    }

    const heartIcon = e.currentTarget.querySelector('svg');
    if (heartIcon) {
      gsap.fromTo(heartIcon, 
        { scale: 0.8 }, 
        { scale: 1.35, duration: 0.2, yoyo: true, repeat: 1, ease: 'back.out(2)' }
      );
    }

    const res = await toggleWishlist(productId);
    if (res.success) {
      if (res.added) {
        toast.success('Added to wishlist!');
      } else {
        toast.success('Removed from wishlist.');
      }
    } else {
      toast.error(res.message);
    }
  };

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

  // CS Algorithms & AI search states
  const [isAISearch, setIsAISearch] = useState(false);
  const [trie] = useState(() => new Trie());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Collaborative recommendations states
  const [collabRecs, setCollabRecs] = useState<Product[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);

  // Hero banner slider state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play sliding carousel every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Load all product names into the autocomplete Trie on mount
  useEffect(() => {
    const seedTrie = async () => {
      try {
        const data = await productService.getProducts({ limit: 100 });
        if (data.products) {
          data.products.forEach((p: Product) => trie.insert(p.name));
        }
      } catch (err) {
        console.warn('Failed to seed Trie client-side:', err);
      }
    };
    seedTrie();
  }, [trie]);

  // Fetch collaborative recommendations
  useEffect(() => {
    const fetchCollabRecs = async () => {
      setCollabLoading(true);
      try {
        const { data } = await api.get('/products/recommendations/collaborative');
        setCollabRecs(data || []);
      } catch (err) {
        console.warn('Failed to fetch collaborative recommendations:', err);
      } finally {
        setCollabLoading(false);
      }
    };
    fetchCollabRecs();
  }, [user]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (val.trim()) {
      const prefixMatches = trie.searchPrefix(val);
      setSuggestions(prefixMatches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setCurrentPage(1);
    setTimeout(() => fetchProducts(), 0);
  };

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
      if (isAISearch && search.trim()) {
        const { data } = await api.get('/products/search', {
          params: { q: search }
        });
        
        let sortedList = data || [];
        if (sort === 'price_asc') {
          sortedList = quickSort(sortedList, (a: Product, b: Product) => parseFloat(a.price as any) - parseFloat(b.price as any));
        } else if (sort === 'price_desc') {
          sortedList = quickSort(sortedList, (a: Product, b: Product) => parseFloat(b.price as any) - parseFloat(a.price as any));
        }
        
        setProducts(sortedList);
        setTotalProducts(sortedList.length);
        setTotalPages(1);
      } else {
        const params: any = {
          page: currentPage,
          limit: 12, // increase layout density for 4-column alignment
          sort
        };
        if (selectedCategory) params.category_id = selectedCategory;
        if (search) params.search = search;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;

        const data = await productService.getProducts(params);
        let sortedList = data.products || [];
        
        if (sort === 'price_asc') {
          sortedList = quickSort(sortedList, (a: Product, b: Product) => parseFloat(a.price as any) - parseFloat(b.price as any));
        } else if (sort === 'price_desc') {
          sortedList = quickSort(sortedList, (a: Product, b: Product) => parseFloat(b.price as any) - parseFloat(a.price as any));
        }

        setProducts(sortedList);
        setTotalProducts(data.total || 0);
        setTotalPages(data.pages || 1);
      }
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
  }, [selectedCategory, sort, currentPage, isAISearch]);

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
    setIsAISearch(false);
    setCurrentPage(1);
    setTimeout(() => fetchProducts(), 0);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-800 p-6 md:p-12 relative overflow-hidden select-none font-sans">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* custom slider carousel */}
        <div className="relative w-full h-[38vh] md:h-[50vh] overflow-hidden rounded-3xl mb-12 border border-neutral-200/80 shadow-md flex bg-white">
          {currentSlide === 0 ? (
            <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
              <div className="w-full md:w-[40%] bg-[#f4efe8] flex flex-col justify-center p-8 md:p-12 text-left h-full">
                <span className="font-serif tracking-[0.3em] text-neutral-500 text-xs uppercase">O D E L</span>
                <h2 className="font-serif text-3xl md:text-5xl font-light tracking-wide text-neutral-900 mt-5 leading-tight">
                  THE PARADISE <br/>
                  <span className="italic font-normal font-playfair">edit</span>
                </h2>
                <button 
                  onClick={() => {
                    const el = document.getElementById('catalog-grid-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest text-[9px] font-bold px-5 py-3 mt-6 w-fit rounded-full transition-all active:scale-[0.98] cursor-pointer"
                >
                  Shop Now
                </button>
              </div>
              <div className="w-full md:w-[60%] relative h-full">
                <img 
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80" 
                  alt="Paradise Edit"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
              <div className="w-full md:w-[40%] bg-[#1c1c1c] flex flex-col justify-center p-8 md:p-12 text-left h-full text-white">
                <span className="font-sans tracking-[0.25em] text-neutral-400 text-[10px] uppercase font-bold">End of Season</span>
                <h2 className="font-serif text-3xl md:text-5xl font-black text-[#f0a500] mt-4 leading-tight uppercase">
                  SALE 60% OFF
                </h2>
                <p className="text-neutral-400 text-xs mt-3 tracking-wider leading-relaxed">
                  Valid from 08th - 30th June. Until stocks last.
                </p>
                <button 
                  onClick={() => {
                    const el = document.getElementById('catalog-grid-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#f0a500] hover:bg-[#d49200] text-black uppercase tracking-widest text-[9px] font-bold px-5 py-3 mt-6 w-fit rounded-full transition-all active:scale-[0.98] cursor-pointer"
                >
                  Explore Sale
                </button>
              </div>
              <div className="w-full md:w-[60%] relative h-full">
                <img 
                  src="https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&q=80" 
                  alt="Season Sale"
                  className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                />
              </div>
            </div>
          )}

          {/* Slider Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
            {[0, 1].map((slideIdx) => (
              <button
                key={slideIdx}
                onClick={() => setCurrentSlide(slideIdx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === slideIdx ? 'w-6 bg-black' : 'w-2 bg-neutral-400/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Promotions Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif text-neutral-900 font-bold tracking-wide text-left mb-6">Promotions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Promo Card 1 */}
            <div className="relative h-48 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80" 
                alt="Fragrance Promo" 
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-6 text-left text-white">
                <span className="text-[10px] tracking-widest uppercase font-extrabold text-[#f0a500]">LIFESTYLE EDIT</span>
                <h3 className="text-xl font-serif mt-2 font-semibold">Luxury Fragrances</h3>
                <p className="text-[11px] text-neutral-350 mt-1 max-w-[220px] leading-normal">Experience timeless luxury scents designed for the modern gentleman.</p>
              </div>
            </div>
            
            {/* Promo Card 2 */}
            <div className="relative h-48 rounded-2xl overflow-hidden border border-neutral-100 shadow-sm group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1534030756701-46b7edb57629?auto=format&fit=crop&w=800&q=80" 
                alt="Suits Promo" 
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-6 text-left text-white">
                <span className="text-[10px] tracking-widest uppercase font-extrabold text-[#f0a500]">TAILORING DEALS</span>
                <h3 className="text-xl font-serif mt-2 font-semibold">Bespoke Blazers</h3>
                <p className="text-[11px] text-neutral-355 mt-1 max-w-[220px] leading-normal">Discover structural excellence and hand-stitched premium wool items.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SHOP BY BRAND Section */}
        <div id="shop-by-brand-section" className="mb-12">
          <div className="bg-[#333333] text-white p-3 uppercase tracking-widest text-[10px] font-extrabold text-left mb-6 pl-6">
            SHOP BY BRAND
          </div>
          <div className="relative flex items-center group">
            {/* horizontal brands layout */}
            <div className="w-full flex overflow-x-auto gap-4 py-2 no-scrollbar scroll-smooth">
              
              {/* Brand 1: Levi's */}
              <div className="min-w-[240px] md:min-w-[280px] bg-white border border-neutral-200 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow shrink-0">
                <div className="text-left">
                  <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase">Casual Wear</span>
                  <h4 className="text-sm font-bold text-neutral-800 mt-1 font-sans">Levi's</h4>
                </div>
                <div className="bg-[#cc0000] text-white text-xs font-black px-3.5 py-1.5 uppercase italic tracking-widest">
                  Levi's
                </div>
              </div>

              {/* Brand 2: U.S. Polo */}
              <div className="min-w-[240px] md:min-w-[280px] bg-white border border-neutral-200 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow shrink-0">
                <div className="text-left">
                  <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase">Classic Polos</span>
                  <h4 className="text-sm font-bold text-neutral-800 mt-1 font-sans">U.S. Polo Assn.</h4>
                </div>
                <div className="bg-[#0b2447] text-white text-[9px] font-bold px-3 py-2 uppercase tracking-wide text-center font-sans">
                  U.S. POLO ASSN.
                </div>
              </div>

              {/* Brand 3: Armani */}
              <div className="min-w-[240px] md:min-w-[280px] bg-white border border-neutral-200 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow shrink-0">
                <div className="text-left">
                  <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase">High Fashion</span>
                  <h4 className="text-sm font-bold text-neutral-800 mt-1 font-sans">Armani Exchange</h4>
                </div>
                <div className="border border-black text-black text-[10px] font-bold px-3 py-1.5 uppercase tracking-[0.2em]">
                  A|X
                </div>
              </div>

              {/* Brand 4: Cotton Collection */}
              <div className="min-w-[240px] md:min-w-[280px] bg-white border border-neutral-200 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow shrink-0">
                <div className="text-left">
                  <span className="text-[10px] text-neutral-400 font-bold tracking-widest uppercase">Natural Cotton</span>
                  <h4 className="text-sm font-bold text-neutral-800 mt-1 font-sans">Cotton Collection</h4>
                </div>
                <div className="font-serif italic text-neutral-800 text-xs font-semibold uppercase tracking-wider">
                  cotton
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Action Controls & Filters Bar */}
        <div id="catalog-grid-section" className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 shrink-0 bg-neutral-50 border border-neutral-200/80 rounded-2xl p-6 shadow-sm sticky top-24 self-start">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 mb-6">
              <h2 className="text-base font-bold flex items-center gap-2 text-neutral-800 font-sans">
                <SlidersHorizontal size={16} className="text-neutral-500" /> Filters
              </h2>
              <button 
                onClick={handleResetFilters}
                className="text-xs font-bold text-[#f0a500] hover:text-[#d49200] transition-colors cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Search Input with autocomplete suggestions */}
            <form onSubmit={handleSearchSubmit} className="mb-4 relative">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block font-sans">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Shirts, Blazers..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full bg-white border border-neutral-300 rounded-xl py-2.5 pl-4 pr-10 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 placeholder-neutral-400 font-sans"
                />
                <button type="submit" className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600">
                  <Search size={14} />
                </button>
              </div>

              {/* Trie Autocomplete Suggestion Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-30 p-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(sug)}
                      className="text-left text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-sans"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* AI Search Toggle Switch */}
            <div className="mb-6 bg-neutral-100/50 border border-neutral-200 rounded-xl p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1 font-sans">
                  <Sparkles size={10} /> AI Semantic Search
                </span>
                <p className="text-[9px] text-neutral-450 mt-0.5 leading-tight font-sans">
                  Vector search matching descriptive queries
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAISearch(!isAISearch); setCurrentPage(1); }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                  isAISearch ? 'bg-black' : 'bg-neutral-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isAISearch ? 'translate-x-4' : 'translate-x-0'
                }`}></div>
              </button>
            </div>

            {/* Categories Filter */}
            <div className="mb-6">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 block font-sans">Categories</label>
              <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                <button
                  onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
                  className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all font-sans ${
                    selectedCategory === null 
                      ? 'bg-neutral-900 text-white font-bold' 
                      : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All Products
                </button>

                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                      className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all flex justify-between items-center font-sans ${
                        selectedCategory === cat.id 
                          ? 'bg-neutral-900 text-white font-bold' 
                          : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                    {/* Render subcategories if category is active or parent */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pl-3 space-y-1">
                        {cat.subcategories.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => { setSelectedCategory(sub.id); setCurrentPage(1); }}
                            className={`w-full text-left text-[11px] py-1 px-3 rounded-md transition-all font-sans ${
                              selectedCategory === sub.id 
                                ? 'bg-neutral-100 text-neutral-800 font-bold' 
                                : 'hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700'
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
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block font-sans">Price Range ($)</label>
              <div className="flex gap-2.5 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 font-sans"
                />
                <span className="text-neutral-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 font-sans"
                />
              </div>
              <button
                onClick={() => { setCurrentPage(1); fetchProducts(); }}
                className="w-full mt-3 bg-black hover:bg-neutral-850 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer font-sans"
              >
                Apply Range
              </button>
            </div>
          </aside>

          {/* Main Products Grid & Mobile Header */}
          <div className="flex-1">
            
            {/* Sorting & Filter toggle header */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
              <div className="text-xs text-neutral-500 font-sans">
                Showing <span className="text-neutral-800 font-bold">{products.length}</span> of{' '}
                <span className="text-neutral-800 font-bold">{totalProducts}</span> Products
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer font-sans"
                >
                  <SlidersHorizontal size={14} /> Filter
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs font-sans">
                  <ArrowUpDown size={14} className="text-neutral-400" />
                  <select
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent border-none text-neutral-700 focus:outline-none pr-6 cursor-pointer font-bold"
                  >
                    <option value="newest" className="bg-white">Newest Arrival</option>
                    <option value="price_asc" className="bg-white">Price: Low to High</option>
                    <option value="price_desc" className="bg-white">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-neutral-50 border border-neutral-150 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full animate-shimmer">
                    <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden w-full"></div>
                    <div className="p-5 flex-1 flex flex-col space-y-3">
                      <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
                      <div className="h-5 bg-neutral-200/60 rounded w-3/4"></div>
                      <div className="h-3.5 bg-neutral-200/40 rounded w-1/2"></div>
                      <div className="pt-3 border-t border-neutral-200 flex justify-between items-center mt-auto">
                        <div className="h-5 bg-neutral-200/60 rounded w-1/4"></div>
                        <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="min-h-[400px] bg-neutral-50 border border-dashed border-neutral-250 rounded-2xl flex flex-col justify-center items-center p-8 text-center">
                <ShoppingBag size={44} className="text-neutral-400 mb-4" />
                <h3 className="text-lg font-bold text-neutral-700 font-sans">No Products Found</h3>
                <p className="text-neutral-500 max-w-sm text-xs mt-1 leading-normal font-sans">
                  We couldn't find any items matching your selected criteria. Try adjusting filters or resetting the search.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-6 bg-black hover:bg-neutral-850 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer font-sans"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div>
                {/* 4 columns Product Grid on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {products.map((prod) => {
                      const primaryImg = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                      const totalStock = prod.variants?.reduce((sum, v) => sum + v.stock_qty, 0) || 0;
                      
                      // Gather unique colors from variants
                      const colors = prod.variants
                        ?.map(v => ({ name: v.color, hex: v.color_hex }))
                        .filter((val, idx, self) => val.hex && self.findIndex(t => t.hex === val.hex) === idx) || [];
 
                      return (
                        <ScrollAnimate key={prod.id} className="h-full">
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => navigate(`/products/${prod.id}`)}
                            className="bg-white border border-neutral-200 hover:border-neutral-400 hover:shadow-lg rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full transition-all duration-300"
                          >
                            {/* Image container */}
                            <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden w-full">
                              <img
                                src={getImageUrl(primaryImg?.url)}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              />
                              
                              {/* Badges on top-left */}
                              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                <span className="bg-black text-white text-[9px] font-extrabold uppercase tracking-widest w-9 h-9 rounded-full flex items-center justify-center shadow-md">
                                  NEW
                                </span>
                                {prod.compare_at_price && (
                                  <span className="bg-[#f0a500] text-white text-[9px] font-extrabold uppercase tracking-widest w-9 h-9 rounded-full flex items-center justify-center shadow-md">
                                    {Math.round((1 - parseFloat(prod.price as any) / parseFloat(prod.compare_at_price as any)) * 100)}%
                                  </span>
                                )}
                              </div>
                              
                              {/* Wishlist Heart Toggle */}
                              <button
                                onClick={(e) => handleToggleWishlist(e, prod.id)}
                                className="absolute top-3 right-3 p-2 bg-white/90 border border-neutral-200 hover:bg-white rounded-full text-neutral-400 hover:text-red-500 shadow-sm transition-all cursor-pointer z-30 group/heart"
                                title="Add to Wishlist"
                              >
                                <Heart 
                                  size={14} 
                                  className={`transition-all duration-350 ${
                                    isInWishlist(prod.id) 
                                      ? "fill-red-500 text-red-500 scale-110" 
                                      : "text-neutral-400 group-hover/heart:scale-110"
                                  }`} 
                                />
                              </button>
 
                              {/* Stock status tag */}
                              {totalStock === 0 && (
                                <span className="absolute top-14 right-3 bg-red-650/90 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm z-10">
                                  Out of Stock
                                </span>
                              )}
 
                              {/* Quick View slide-up overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex justify-center z-20">
                                <span className="bg-black hover:bg-neutral-850 text-white font-bold text-[11px] py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer font-sans uppercase tracking-widest">
                                  <Eye size={12} /> Quick View
                                </span>
                              </div>
                            </div>
 
                            {/* Info panel */}
                            <div className="p-4 flex-1 flex flex-col text-left">
                              <span className="text-[9px] text-[#f0a500] font-bold mb-1 uppercase tracking-wider block font-sans">
                                {prod.category?.name || 'Uncategorized'}
                              </span>
                              <h3 className="text-xs font-bold text-neutral-700 line-clamp-1 group-hover:text-neutral-900 transition-colors mb-2 font-sans">
                                {prod.name}
                              </h3>
 
                              {/* Color Swatches */}
                              {colors.length > 0 && (
                                <div className="flex gap-1 mb-2 flex-wrap">
                                  {colors.map((c, i) => (
                                    <div
                                      key={i}
                                      style={{ backgroundColor: c.hex || '' }}
                                      title={c.name || ''}
                                      className="w-3.5 h-3.5 rounded-full border border-neutral-300 ring-1 ring-neutral-100"
                                    ></div>
                                  ))}
                                </div>
                              )}
 
                              <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-neutral-850 font-sans">{formatLKR(prod.price)}</span>
                                  {prod.compare_at_price && (
                                    <span className="text-[10px] line-through text-neutral-400 mt-0.5">
                                      {formatLKR(prod.compare_at_price)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[8px] text-neutral-450 font-bold uppercase tracking-wider font-sans">
                                  {totalStock > 0 ? `${totalStock} in stock` : 'Sold Out'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        </ScrollAnimate>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Collaborative Recommendations Shelf */}
                {!collabLoading && collabRecs.length > 0 && (
                  <ScrollAnimate className="mt-16 pt-12 border-t border-neutral-200 text-left space-y-8">
                    <div>
                      <span className="text-xs text-[#f0a500] font-extrabold uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Sparkles size={12} className="animate-pulse" /> Personalized Curation
                      </span>
                      <h2 className="text-xl font-serif font-bold uppercase tracking-wider text-neutral-800 mt-1">Recommended For You</h2>
                      <p className="text-neutral-500 text-xs mt-1 font-sans">Custom tailoring recommendations curated from your style profile and purchases</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {collabRecs.map((prod) => {
                        const primaryImg = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                        return (
                          <div
                            key={prod.id}
                            onClick={() => { navigate(`/products/${prod.id}`); window.scrollTo(0, 0); }}
                            className="bg-white border border-neutral-205 hover:border-neutral-400 hover:shadow-lg rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full transition-all duration-300"
                          >
                            <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden w-full">
                              <img
                                src={getImageUrl(primaryImg?.url)}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                              />
                            </div>
                            <div className="p-4 flex flex-col flex-1 text-left">
                              <h3 className="text-xs font-bold text-neutral-700 line-clamp-1 group-hover:text-neutral-900 transition-colors font-sans">
                                {prod.name}
                              </h3>
                              <div className="mt-auto pt-2 border-t border-neutral-100 flex justify-between items-center text-xs">
                                <span className="font-bold text-neutral-800 font-sans">{formatLKR(prod.price)}</span>
                                <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-wider font-sans">View Item →</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollAnimate>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-white border border-neutral-300 hover:border-neutral-400 disabled:opacity-50 disabled:hover:border-neutral-300 text-neutral-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer font-sans"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer font-sans ${
                          currentPage === i + 1
                            ? 'bg-black border-black text-white shadow-md'
                            : 'bg-white border-neutral-300 text-neutral-500 hover:border-neutral-400'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-white border border-neutral-300 hover:border-neutral-400 disabled:opacity-50 disabled:hover:border-neutral-300 text-neutral-700 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer font-sans"
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
              className="relative w-80 max-w-[85vw] h-full bg-white border-r border-neutral-200 p-6 flex flex-col z-10 overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-200 mb-6">
                <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2 font-sans text-left">
                  <SlidersHorizontal size={16} className="text-neutral-500" /> Filters
                </h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="mb-4 relative">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block font-sans text-left">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Shirts, Blazers..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowSuggestions(suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full bg-white border border-neutral-300 rounded-xl py-2.5 pl-4 pr-10 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 placeholder-neutral-400 font-sans"
                  />
                  <button type="submit" className="absolute right-3 top-3 text-neutral-450 hover:text-neutral-600">
                    <Search size={14} />
                  </button>
                </div>

                {/* Autocomplete dropdown for mobile */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-250 rounded-xl shadow-lg overflow-hidden z-30 p-1 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { handleSuggestionClick(sug); setShowMobileFilters(false); }}
                        className="text-left text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 px-3 py-2 rounded-lg cursor-pointer font-sans"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {/* AI Search Toggle Switch for mobile */}
              <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <Sparkles size={10} /> AI Semantic Search
                  </span>
                  <p className="text-[9px] text-neutral-450 mt-0.5 leading-tight font-sans">
                    Vector search matching descriptions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAISearch(!isAISearch); setCurrentPage(1); }}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                    isAISearch ? 'bg-black' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isAISearch ? 'translate-x-4' : 'translate-x-0'
                  }`}></div>
                </button>
              </div>

              {/* Mobile Categories */}
              <div className="mb-6">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 block font-sans text-left">Categories</label>
                <div className="space-y-1.5 text-left">
                  <button
                    onClick={() => { setSelectedCategory(null); setCurrentPage(1); setShowMobileFilters(false); }}
                    className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all font-sans ${
                      selectedCategory === null 
                        ? 'bg-neutral-900 text-white font-bold' 
                        : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-905'
                    }`}
                  >
                    All Products
                  </button>

                  {categories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); setShowMobileFilters(false); }}
                        className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all font-sans ${
                          selectedCategory === cat.id 
                            ? 'bg-neutral-900 text-white font-bold' 
                            : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-905'
                        }`}
                      >
                        {cat.name}
                      </button>
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="pl-3 space-y-1">
                          {cat.subcategories.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => { setSelectedCategory(sub.id); setCurrentPage(1); setShowMobileFilters(false); }}
                              className={`w-full text-left text-[11px] py-1 px-3 rounded-md transition-all font-sans ${
                                selectedCategory === sub.id 
                                  ? 'bg-neutral-100 text-neutral-805 font-bold' 
                                  : 'hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700'
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
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block font-sans text-left">Price Range ($)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 font-sans"
                  />
                  <span className="text-neutral-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-neutral-500 text-neutral-800 font-sans"
                  />
                </div>
              </div>

              {/* Apply & Reset Buttons */}
              <div className="mt-auto space-y-2.5 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => { setCurrentPage(1); fetchProducts(); setShowMobileFilters(false); }}
                  className="w-full bg-black hover:bg-neutral-850 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md cursor-pointer font-sans"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => { handleResetFilters(); setShowMobileFilters(false); }}
                  className="w-full bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer font-sans"
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
