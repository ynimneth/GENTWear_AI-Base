import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ShoppingCart, ShieldCheck, Truck, RotateCcw, 
  Plus, Minus, RefreshCw, AlertCircle, Check, Heart,
  Star, MessageSquare, ThumbsUp, ShieldAlert, Award, User as UserIcon,
  Loader2
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductVariant, ProductImage } from '../types';
import { getImageUrl } from './ProductList';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { gsap } from 'gsap';
import api from '../lib/api';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  // Selection states
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { addToCart, setIsOpen } = useCartStore() as any;
  const { toggleWishlist, isInWishlist } = useWishlistStore() as any;
  const { user } = useAuthStore() as any;

  // Review Type Definition
  interface Review {
    id: number;
    rating: number;
    comment: string;
    is_approved: boolean;
    helpful_count: number;
    admin_reply: string | null;
    createdAt: string;
    User?: {
      full_name: string;
    };
  }

  // Reviews States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [reviewSort, setReviewSort] = useState('newest');
  
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasVotedHelpful, setHasVotedHelpful] = useState<Record<number, boolean>>({});

  // Deriving reviews statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) 
    : '0.0';

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach(rev => {
    if (rev.rating >= 1 && rev.rating <= 5) {
      starCounts[rev.rating - 1]++;
    }
  });

  // Fetch reviews whenever component mounts, product ID changes, or sort parameter changes
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      setReviewsLoading(true);
      try {
        const { data } = await api.get(`/products/${id}/reviews`, {
          params: { sort: reviewSort }
        });
        setReviews(data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id, reviewSort]);

  // Check user review eligibility when product ID or user changes
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user || !id) {
        setIsEligible(false);
        setEligibilityChecked(true);
        return;
      }
      try {
        const { data } = await api.get(`/products/${id}/reviews/eligible`);
        setIsEligible(!!data.eligible);
        setEligibilityMessage(data.message || '');
      } catch (err) {
        console.error('Error checking review eligibility:', err);
        setIsEligible(false);
      } finally {
        setEligibilityChecked(true);
      }
    };

    checkEligibility();
  }, [id, user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!reviewComment.trim()) {
      toast.error('Please write a comment for your review.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await api.post(`/products/${id}/reviews`, {
        rating: selectedRating,
        comment: reviewComment
      });
      toast.success('Your review has been submitted for moderation.');
      // Reset form states
      setSelectedRating(null);
      setReviewComment('');
      // Mark as ineligible so they cannot submit again immediately
      setIsEligible(false);
      setEligibilityMessage('Your review is pending moderation.');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleHelpfulVote = async (reviewId: number) => {
    if (hasVotedHelpful[reviewId]) {
      toast.error('You have already marked this review as helpful.');
      return;
    }
    try {
      const { data } = await api.post(`/reviews/helpful/${reviewId}`);
      // Update reviews state
      setReviews(prev => 
        prev.map(r => r.id === reviewId ? { ...r, helpful_count: data.helpful_count } : r)
      );
      setHasVotedHelpful(prev => ({ ...prev, [reviewId]: true }));
      toast.success('Thank you for your feedback!');
    } catch (err) {
      console.error('Error voting helpful:', err);
      toast.error('Failed to submit vote.');
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
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

    if (product) {
      const res = await toggleWishlist(product.id);
      if (res.success) {
        if (res.added) {
          toast.success('Added to wishlist!');
        } else {
          toast.success('Removed from wishlist.');
        }
      } else {
        toast.error(res.message);
      }
    }
  };

  const runFlyToCartAnimation = () => {
    const imgEl = document.querySelector('.main-product-image');
    const cartEl = document.getElementById('navbar-cart-btn');
    if (!imgEl || !cartEl) return;

    const imgRect = imgEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();

    // Create fly clone element
    const clone = document.createElement('img');
    clone.src = getImageUrl(selectedImage);
    clone.style.position = 'fixed';
    clone.style.top = `${imgRect.top}px`;
    clone.style.left = `${imgRect.left}px`;
    clone.style.width = `${imgRect.width}px`;
    clone.style.height = `${imgRect.height}px`;
    clone.style.objectFit = 'cover';
    clone.style.borderRadius = '1rem';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    // Curve fly path towards the navbar cart button coordinates
    gsap.to(clone, {
      top: cartRect.top + 8,
      left: cartRect.left + 8,
      width: 24,
      height: 30,
      opacity: 0.15,
      rotation: 360,
      duration: 0.85,
      ease: "power2.inOut",
      onComplete: () => {
        clone.remove();
        // Scale bounce the cart button
        gsap.fromTo(cartEl, 
          { scale: 1 }, 
          { scale: 1.35, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" }
        );
      }
    });
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await productService.getProductById(id);
          setProduct(data);
          
          // Set primary image or first image as default selected image
          const primary = data.images?.find((img: ProductImage) => img.is_primary) || data.images?.[0];
          if (primary) {
            setSelectedImage(primary.url);
          }

          // Pre-select first available variant characteristics
          if (data.variants && data.variants.length > 0) {
            const firstVariant = data.variants[0];
            if (firstVariant.size) setSelectedSize(firstVariant.size);
            if (firstVariant.color) setSelectedColor(firstVariant.color);
          }
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        toast.error('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <RefreshCw className="animate-spin text-indigo-500 mb-2" size={36} />
        <p className="text-slate-400 text-sm animate-pulse">Loading product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <p className="text-slate-400 max-w-sm mt-1">
          The item you are looking for might have been removed or the URL is incorrect.
        </p>
        <button
          onClick={() => navigate('/products')}
          className="mt-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Back to Collections
        </button>
      </div>
    );
  }

  // Get list of unique colors and sizes
  const uniqueColors = product.variants
    ?.map(v => ({ name: v.color, hex: v.color_hex }))
    .filter((v, i, self) => v.name && v.hex && self.findIndex(t => t.name === v.name) === i) || [];

  const uniqueSizes = product.variants
    ?.map(v => v.size)
    .filter((v, i, self) => v && self.indexOf(v) === i) || [];

  // Find currently matched variant
  const matchedVariant = product.variants?.find(v => {
    const sizeMatches = !v.size || v.size === selectedSize;
    const colorMatches = !v.color || v.color === selectedColor;
    return sizeMatches && colorMatches;
  });

  // Calculate price dynamically
  const currentPrice = matchedVariant?.price_override !== null && matchedVariant?.price_override !== undefined
    ? parseFloat(matchedVariant.price_override as any)
    : parseFloat(product.price as any);

  const stockAvailable = matchedVariant ? matchedVariant.stock_qty : 0;

  const handleQuantityChange = (type: 'inc' | 'dec') => {
    if (type === 'inc') {
      if (quantity < stockAvailable) {
        setQuantity(prev => prev + 1);
      } else {
        toast.error(`Only ${stockAvailable} items available in stock.`);
      }
    } else {
      setQuantity(prev => Math.max(prev - 1, 1));
    }
  };

  const handleAddToCart = async () => {
    if (!matchedVariant) {
      toast.error('Please select a valid variant combination.');
      return;
    }
    if (stockAvailable === 0) {
      toast.error('Selected variant is currently out of stock.');
      return;
    }

    runFlyToCartAnimation();

    const res = await addToCart(product.id, matchedVariant.id, quantity);
    if (res.success) {
      toast.success(
        <div className="flex flex-col text-xs text-left">
          <span className="font-bold text-slate-100">Added to Cart!</span>
          <span className="text-slate-400">{product.name} ({selectedColor || ''} {selectedSize ? `- Size ${selectedSize}` : ''}) x{quantity}</span>
        </div>
      );
      
      // Delay drawer opening slightly to let user see flying animation finish
      setTimeout(() => {
        setIsOpen(true);
      }, 900);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/products')}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors group cursor-pointer"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Collections
        </button>

        {/* Product Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Preview Container */}
            <div className="aspect-[4/5] bg-slate-900/30 backdrop-blur-md border border-slate-850 rounded-2xl overflow-hidden relative group">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={getImageUrl(selectedImage)}
                alt={product.name}
                className="w-full h-full object-cover main-product-image"
              />
              {product.is_featured && (
                <span className="absolute top-4 left-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                  Featured
                </span>
              )}
            </div>

            {/* Thumbnail navigation */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 aspect-[4/5] rounded-xl overflow-hidden border transition-all shrink-0 cursor-pointer ${
                      selectedImage === img.url 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={getImageUrl(img.url)}
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Product category & tag */}
              <div>
                <span className="text-xs text-indigo-400 font-extrabold uppercase tracking-widest">
                  {product.category?.name || 'Collections'}
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 mt-1">
                  {product.name}
                </h1>
                
                {/* Product Price */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-indigo-100">
                    ${currentPrice.toFixed(2)}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-base line-through text-slate-500">
                      ${parseFloat(product.compare_at_price as any).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="border-t border-b border-slate-850 py-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Color Selection Swatches */}
              {uniqueColors.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Color: <span className="text-slate-200">{selectedColor || 'Choose a color'}</span>
                  </h3>
                  <div className="flex gap-2.5 flex-wrap">
                    {uniqueColors.map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedColor(color.name || null); setQuantity(1); }}
                        style={{ backgroundColor: color.hex || '' }}
                        title={color.name || ''}
                        className={`w-8 h-8 rounded-full border border-slate-950 ring-2 transition-all flex items-center justify-center cursor-pointer ${
                          selectedColor === color.name 
                            ? 'ring-indigo-500 scale-110 shadow-lg shadow-indigo-600/20' 
                            : 'ring-slate-800 hover:ring-slate-600'
                        }`}
                      >
                        {selectedColor === color.name && (
                          <Check 
                            size={14} 
                            className={color.name?.toLowerCase() === 'white' || color.hex === '#FFFFFF' ? 'text-slate-900' : 'text-white'} 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Buttons */}
              {uniqueSizes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Size: <span className="text-slate-200">{selectedSize || 'Select sizing'}</span>
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {uniqueSizes.map((size, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedSize(size || null); setQuantity(1); }}
                        className={`min-w-10 h-10 px-3 rounded-lg border text-xs font-bold transition-all uppercase cursor-pointer ${
                          selectedSize === size 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-250'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector & SKU / Stock */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                
                {/* Quantity */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Quantity</h3>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 h-11 w-32 justify-between">
                    <button
                      onClick={() => handleQuantityChange('dec')}
                      disabled={quantity <= 1 || stockAvailable === 0}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-slate-200 select-none">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange('inc')}
                      disabled={quantity >= stockAvailable || stockAvailable === 0}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* SKU & Availability details */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <div className="text-xs">
                    {stockAvailable > 0 ? (
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        In Stock ({stockAvailable} units)
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        Out Of Stock
                      </span>
                    )}
                    {matchedVariant?.sku && (
                      <span className="text-slate-500 font-medium block mt-0.5">
                        SKU: <code className="text-slate-400 font-bold font-mono bg-slate-900 px-1 rounded">{matchedVariant.sku}</code>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action panel (Add to Cart / Trust markers) */}
            <div className="mt-8 space-y-6">
              
              {/* Add to Cart + Wishlist buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={stockAvailable === 0 || !matchedVariant}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-98"
                >
                  <ShoppingCart size={18} />
                  {stockAvailable === 0 ? 'Out of Stock' : !matchedVariant ? 'Choose Specifications' : 'Add to Shopping Bag'}
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className="p-4 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer flex items-center justify-center group/heart"
                  title="Add to Wishlist"
                >
                  <Heart 
                    size={20} 
                    className={`transition-all duration-350 ${
                      isInWishlist(product.id) 
                        ? "fill-red-500 text-red-500 scale-110" 
                        : "text-slate-400 group-hover/heart:scale-115"
                    }`}
                  />
                </button>
              </div>

              {/* Service trust badges */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-850 pt-6">
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/10 border border-slate-850">
                  <ShieldCheck size={20} className="text-indigo-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-200">Authentic Only</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">100% genuine GENTWear</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/10 border border-slate-850">
                  <Truck size={20} className="text-indigo-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-200">Express Shipping</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Free over $150 purchases</span>
                </div>
                 <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-900/10 border border-slate-850">
                  <RotateCcw size={20} className="text-indigo-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-200">30 Day Returns</span>
                  <span className="text-[9px] text-slate-550 mt-0.5">Hassle-free return policy</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Customer Reviews Section */}
        <div className="mt-20 pt-12 border-t border-slate-850/60 text-left space-y-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-slate-150">Customer Reviews</h2>
            <p className="text-slate-500 text-xs mt-1">Share your experience and verify ratings of fellow customers</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Column 1: Rating Stats Breakdown */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-100">{averageRating}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">out of 5</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const avg = parseFloat(averageRating);
                      return (
                        <Star 
                          key={s} 
                          size={15} 
                          className={s <= Math.round(avg) ? 'fill-yellow-500 text-yellow-500' : 'text-slate-750'} 
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    {totalReviews} verified {totalReviews === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>
              </div>

              {/* Star Progress Bars */}
              <div className="space-y-2.5 pt-4 border-t border-slate-850/60">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starCounts[stars - 1] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="w-6 font-bold shrink-0">{stars} ★</span>
                      <div className="flex-1 h-2 bg-slate-950 border border-slate-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-semibold text-slate-500 text-[10px]">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2 & 3: Submit Form and Reviews list */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Submission Form Alert/Panel */}
              {user && isEligible ? (
                <form 
                  onSubmit={handleReviewSubmit}
                  className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4 text-left"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850 mb-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-indigo-400" /> Share Your Thoughts
                    </h3>
                    <span className="text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck size={11} /> Verified Buyer
                    </span>
                  </div>

                  {/* Hover Star selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold block">Rating *</label>
                    <div className="flex items-center gap-1.5 h-7">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoveredRating(s)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() => setSelectedRating(s)}
                          className="p-0.5 text-slate-700 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star 
                            size={20} 
                            className={
                              s <= (hoveredRating !== null ? hoveredRating : (selectedRating || 0))
                                ? 'fill-yellow-500 text-yellow-500' 
                                : 'text-slate-750'
                            } 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold block">Review Comment *</label>
                    <textarea
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Detail your experience with sizing, color matches, fabric quality, and comfort..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-150 focus:outline-none focus:border-indigo-500 resize-none font-medium leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer active:scale-98 flex items-center justify-center gap-1"
                  >
                    {isSubmittingReview ? <Loader2 className="animate-spin" size={14} /> : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl border border-slate-850/65 bg-slate-900/10 text-xs text-slate-450 leading-relaxed flex items-start gap-2.5">
                  <ShieldAlert size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    {user ? (
                      <p>
                        {eligibilityChecked ? (
                          eligibilityMessage || 'You can only review products that you have purchased and received (delivered order).'
                        ) : (
                          'Checking review eligibility...'
                        )}
                      </p>
                    ) : (
                      <p>
                        Please <button onClick={() => navigate('/login')} className="text-indigo-400 font-bold hover:underline">Log In</button> to write a review. Only verified buyers can submit comments.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews List & Sort */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Customer Comments ({totalReviews})
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Sort By:</span>
                    <select
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-350 focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="helpful">Helpful Count</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                    </select>
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="py-12 flex justify-center items-center text-slate-500">
                    <Loader2 className="animate-spin text-indigo-400 mr-2" size={16} /> Loading reviews...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-12 text-center text-slate-550 text-xs">
                    No reviews published for this product yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div 
                        key={rev.id} 
                        className="p-5 bg-slate-900/10 border border-slate-850 rounded-2xl text-left space-y-3 relative hover:border-slate-800 transition-colors"
                      >
                        {/* Rating Stars & Customer */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  size={11} 
                                  className={s <= rev.rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-700'} 
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">
                              {rev.User?.full_name || 'Anonymous Customer'}
                            </span>
                          </div>
                          
                          <span className="text-[9px] text-slate-550 font-semibold">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Review text */}
                        <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line pl-1">
                          "{rev.comment}"
                        </p>

                        {/* Vote Helpful button & Admin Reply Trigger */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-850/30">
                          <button
                            onClick={() => handleHelpfulVote(rev.id)}
                            className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                              hasVotedHelpful[rev.id]
                                ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                                : 'bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-indigo-400'
                            }`}
                          >
                            <ThumbsUp size={10} /> Helpful ({rev.helpful_count})
                          </button>
                        </div>

                        {/* Official Store response */}
                        {rev.admin_reply && (
                          <div className="mt-4 p-4 rounded-xl border border-indigo-500/15 bg-indigo-950/10 space-y-1.5 relative overflow-hidden animate-slideDown">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                              <Award size={12} /> Official Store Reply
                            </div>
                            <p className="text-slate-350 text-xs italic pl-4 leading-relaxed">
                              "{rev.admin_reply}"
                            </p>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
