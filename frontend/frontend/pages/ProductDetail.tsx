import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ShoppingCart, ShieldCheck, Truck, RotateCcw, 
  Plus, Minus, RefreshCw, AlertCircle, Check, Heart,
  Star, MessageSquare, ThumbsUp, ShieldAlert, Award, User as UserIcon,
  Loader2, Sparkles
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductVariant, ProductImage } from '../types';
import { getImageUrl, formatLKR } from './ProductList';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { gsap } from 'gsap';
import api from '../lib/api';
import { ScrollAnimate } from '../components/ScrollAnimate';

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

  // Similar Products Recommendations States
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  // Fetch similar product recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!id) return;
      setRecsLoading(true);
      try {
        const { data } = await api.get(`/products/${id}/recommendations`);
        setRecommendations(data || []);
      } catch (err) {
        console.error('Failed to load vector similarity recommendations:', err);
      } finally {
        setRecsLoading(false);
      }
    };
    fetchRecommendations();
  }, [id]);

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
      setSelectedRating(null);
      setReviewComment('');
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
          
          const primary = data.images?.find((img: ProductImage) => img.is_primary) || data.images?.[0];
          if (primary) {
            setSelectedImage(primary.url);
          }

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
      <div className="min-h-screen bg-white text-neutral-800 flex flex-col justify-center items-center">
        <RefreshCw className="animate-spin text-neutral-500 mb-2" size={36} />
        <p className="text-neutral-500 text-sm animate-pulse">Loading product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white text-neutral-800 flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold font-sans">Product Not Found</h2>
        <p className="text-neutral-500 max-w-sm mt-1">
          The item you are looking for might have been removed or the URL is incorrect.
        </p>
        <button
          onClick={() => navigate('/products')}
          className="mt-6 bg-black hover:bg-neutral-800 text-white text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Back to Collections
        </button>
      </div>
    );
  }

  const uniqueColors = product.variants
    ?.map(v => ({ name: v.color, hex: v.color_hex }))
    .filter((v, i, self) => v.name && v.hex && self.findIndex(t => t.name === v.name) === i) || [];

  const uniqueSizes = product.variants
    ?.map(v => v.size)
    .filter((v, i, self) => v && self.indexOf(v) === i) || [];

  const matchedVariant = product.variants?.find(v => {
    const sizeMatches = !v.size || v.size === selectedSize;
    const colorMatches = !v.color || v.color === selectedColor;
    return sizeMatches && colorMatches;
  });

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
        <div className="flex flex-col text-xs text-left text-neutral-800">
          <span className="font-bold">Added to Cart!</span>
          <span className="text-neutral-500">{product.name} ({selectedColor || ''} {selectedSize ? `- Size ${selectedSize}` : ''}) x{quantity}</span>
        </div>
      );
      
      setTimeout(() => {
        setIsOpen(true);
      }, 950);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-805 p-6 md:p-12 relative overflow-hidden select-none font-sans">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/products')}
          className="mb-8 flex items-center gap-2 text-neutral-500 hover:text-neutral-800 text-sm font-semibold transition-colors group cursor-pointer"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Collections
        </button>

        {/* Product Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Preview Container */}
            <div className="aspect-[4/5] bg-white border border-neutral-200/80 rounded-2xl overflow-hidden relative group shadow-sm">
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
                <span className="absolute top-4 left-4 bg-black text-white text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                  Featured
                </span>
              )}
            </div>

            {/* Thumbnail navigation */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar pr-1">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 aspect-[4/5] rounded-xl overflow-hidden border transition-all shrink-0 cursor-pointer ${
                      selectedImage === img.url 
                        ? 'border-neutral-800 ring-2 ring-neutral-200' 
                        : 'border-neutral-200 hover:border-neutral-400'
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
              
              <div className="text-left">
                <span className="text-[10px] text-[#f0a500] font-extrabold uppercase tracking-widest">
                  {product.category?.name || 'Collections'}
                </span>
                <h1 className="text-2xl font-serif font-bold text-neutral-850 mt-1.5 leading-tight">
                  {product.name}
                </h1>
                
                {/* Product Price */}
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-2xl font-bold text-neutral-900">
                    {formatLKR(currentPrice)}
                  </span>
                  {product.compare_at_price && (
                    <span className="text-sm line-through text-neutral-400">
                      {formatLKR(product.compare_at_price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="border-t border-b border-neutral-200 py-4 text-left">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-neutral-600 text-xs leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Color Selection Swatches */}
              {uniqueColors.length > 0 && (
                <div className="text-left">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">
                    Color: <span className="text-neutral-800">{selectedColor || 'Choose a color'}</span>
                  </h3>
                  <div className="flex gap-2.5 flex-wrap">
                    {uniqueColors.map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedColor(color.name || null); setQuantity(1); }}
                        style={{ backgroundColor: color.hex || '' }}
                        title={color.name || ''}
                        className={`w-7 h-7 rounded-full border border-neutral-300 ring-2 transition-all flex items-center justify-center cursor-pointer ${
                          selectedColor === color.name 
                            ? 'ring-neutral-400 scale-105 shadow-sm' 
                            : 'ring-transparent hover:ring-neutral-200'
                        }`}
                      >
                        {selectedColor === color.name && (
                          <Check 
                            size={12} 
                            className={color.name?.toLowerCase() === 'white' || color.hex === '#FFFFFF' ? 'text-neutral-900' : 'text-white'} 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Buttons */}
              {uniqueSizes.length > 0 && (
                <div className="text-left">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">
                    Size: <span className="text-neutral-800">{selectedSize || 'Select sizing'}</span>
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {uniqueSizes.map((size, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedSize(size || null); setQuantity(1); }}
                        className={`min-w-10 h-10 px-3 rounded-lg border text-xs font-bold transition-all uppercase cursor-pointer ${
                          selectedSize === size 
                            ? 'bg-black border-black text-white shadow-sm' 
                            : 'bg-white border-neutral-300 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector & SKU / Stock */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-left">
                
                {/* Quantity */}
                <div>
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Quantity</h3>
                  <div className="flex items-center bg-white border border-neutral-350 rounded-xl px-2 py-1 h-10 w-28 justify-between">
                    <button
                      onClick={() => handleQuantityChange('dec')}
                      disabled={quantity <= 1 || stockAvailable === 0}
                      className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold text-neutral-800 select-none">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange('inc')}
                      disabled={quantity >= stockAvailable || stockAvailable === 0}
                      className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* SKU & Availability details */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Status</span>
                  <div className="text-xs">
                    {stockAvailable > 0 ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        In Stock ({stockAvailable} units)
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold flex items-center gap-1">
                        Out Of Stock
                      </span>
                    )}
                    {matchedVariant?.sku && (
                      <span className="text-neutral-500 font-medium block mt-0.5">
                        SKU: <code className="text-neutral-600 font-bold font-mono bg-neutral-100 px-1 rounded">{matchedVariant.sku}</code>
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
                  className="flex-1 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <ShoppingCart size={16} />
                  {stockAvailable === 0 ? 'Out of Stock' : !matchedVariant ? 'Choose Specifications' : 'Add to Shopping Bag'}
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className="p-4 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-400 hover:text-red-500 rounded-xl transition-all cursor-pointer flex items-center justify-center group/heart"
                  title="Add to Wishlist"
                >
                  <Heart 
                    size={18} 
                    className={`transition-all duration-350 ${
                      isInWishlist(product.id) 
                        ? "fill-red-500 text-red-500 scale-110" 
                        : "text-neutral-400 group-hover/heart:scale-110"
                    }`}
                  />
                </button>
              </div>

              {/* Service trust badges */}
              <div className="grid grid-cols-3 gap-4 border-t border-neutral-200 pt-6">
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <ShieldCheck size={18} className="text-[#f0a500] mb-1" />
                  <span className="text-[10px] font-bold text-neutral-800">Authentic Only</span>
                  <span className="text-[9px] text-neutral-500 mt-0.5 leading-tight">100% genuine GENTWear</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <Truck size={18} className="text-[#f0a500] mb-1" />
                  <span className="text-[10px] font-bold text-neutral-800">Express Delivery</span>
                  <span className="text-[9px] text-neutral-500 mt-0.5 leading-tight">Free over $150 purchases</span>
                </div>
                 <div className="flex flex-col items-center text-center p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <RotateCcw size={18} className="text-[#f0a500] mb-1" />
                  <span className="text-[10px] font-bold text-neutral-800">30 Day Returns</span>
                  <span className="text-[9px] text-neutral-550 mt-0.5 leading-tight">Hassle-free return policy</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Similarity Recommendations Shelf */}
        {!recsLoading && recommendations.length > 0 && (
          <ScrollAnimate className="mt-20 pt-12 border-t border-neutral-200 text-left space-y-8 animate-fadeIn">
            <div>
              <span className="text-xs text-[#f0a500] font-extrabold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" /> Curated Selection
              </span>
              <h2 className="text-xl font-serif font-black uppercase tracking-wider text-neutral-850 mt-1">You May Also Like</h2>
              <p className="text-neutral-500 text-xs mt-1">Discover items styled similarly based on semantic description matching</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {recommendations.map((prod) => {
                const primaryImg = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                return (
                  <div
                    key={prod.id}
                    onClick={() => { navigate(`/products/${prod.id}`); window.scrollTo(0, 0); }}
                    className="bg-white border border-neutral-200 hover:border-neutral-400 hover:shadow-lg rounded-2xl overflow-hidden shadow-sm group cursor-pointer flex flex-col h-full transition-all duration-300"
                  >
                    <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden w-full">
                      <img
                        src={getImageUrl(primaryImg?.url)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1 text-left">
                      <h3 className="text-xs font-bold text-neutral-700 line-clamp-1 group-hover:text-neutral-900 transition-colors font-sans">
                        {prod.name}
                      </h3>
                      <div className="mt-auto pt-2 border-t border-neutral-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-neutral-805 font-sans">{formatLKR(prod.price)}</span>
                        <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-wider font-sans">View Item →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollAnimate>
        )}

        {/* Customer Reviews Section */}
        <ScrollAnimate className="mt-20 pt-12 border-t border-neutral-200 text-left space-y-10">
          <div>
            <h2 className="text-xl font-serif font-black uppercase tracking-wider text-neutral-850">Customer Reviews</h2>
            <p className="text-neutral-500 text-xs mt-1">Share your experience and verify ratings of fellow customers</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Column 1: Rating Stats Breakdown */}
            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex items-center gap-4 text-left">
                <div className="text-center">
                  <span className="text-4xl font-black text-neutral-800">{averageRating}</span>
                  <span className="text-xs text-neutral-400 block mt-0.5">out of 5</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const avg = parseFloat(averageRating);
                      return (
                        <Star 
                          key={s} 
                          size={15} 
                          className={s <= Math.round(avg) ? 'fill-yellow-500 text-yellow-500' : 'text-neutral-200'} 
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider">
                    {totalReviews} verified {totalReviews === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>
              </div>

              {/* Star Progress Bars */}
              <div className="space-y-2.5 pt-4 border-t border-neutral-200">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starCounts[stars - 1] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="w-6 font-bold shrink-0">{stars} ★</span>
                      <div className="flex-1 h-2 bg-neutral-100 border border-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-semibold text-neutral-400 text-[10px]">
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
                  className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm space-y-4 text-left"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-200 mb-2">
                    <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 font-sans">
                      <MessageSquare size={16} className="text-neutral-700" /> Share Your Thoughts
                    </h3>
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck size={11} /> Verified Buyer
                    </span>
                  </div>

                  {/* Hover Star selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-500 font-bold block">Rating *</label>
                    <div className="flex items-center gap-1.5 h-7">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHoveredRating(s)}
                          onMouseLeave={() => setHoveredRating(null)}
                          onClick={() => setSelectedRating(s)}
                          className="p-0.5 text-neutral-400 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star 
                            size={20} 
                            className={
                              s <= (hoveredRating !== null ? hoveredRating : (selectedRating || 0))
                                ? 'fill-yellow-500 text-yellow-500' 
                                : 'text-neutral-200'
                            } 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-500 font-bold block">Review Comment *</label>
                    <textarea
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Detail your experience with sizing, color matches, fabric quality, and comfort..."
                      className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none focus:border-neutral-500 resize-none font-medium leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full bg-black hover:bg-neutral-850 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    {isSubmittingReview ? <Loader2 className="animate-spin" size={14} /> : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-500 leading-relaxed flex items-start gap-2.5 text-left">
                  <ShieldAlert size={16} className="text-[#f0a500] shrink-0 mt-0.5" />
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
                        Please <button onClick={() => navigate('/login')} className="text-[#f0a500] font-bold hover:underline">Log In</button> to write a review. Only verified buyers can submit comments.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews List & Sort */}
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    Customer Comments ({totalReviews})
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">Sort By:</span>
                    <select
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value)}
                      className="bg-white border border-neutral-305 rounded-lg px-2.5 py-1 text-[10px] font-bold text-neutral-600 focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="helpful">Helpful Count</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                    </select>
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="py-12 flex justify-center items-center text-neutral-400">
                    <Loader2 className="animate-spin text-neutral-500 mr-2" size={16} /> Loading reviews...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-12 text-center text-neutral-450 text-xs">
                    No reviews published for this product yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div 
                        key={rev.id} 
                        className="p-5 bg-white border border-neutral-200 rounded-2xl text-left space-y-3 relative hover:border-neutral-350 transition-colors"
                      >
                        {/* Rating Stars & Customer */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  size={11} 
                                  className={s <= rev.rating ? 'fill-yellow-500 text-yellow-500' : 'text-neutral-200'} 
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-neutral-500 font-bold block uppercase mt-0.5 font-sans">
                              {rev.User?.full_name || 'Anonymous Customer'}
                            </span>
                          </div>
                          
                          <span className="text-[9px] text-neutral-400 font-semibold font-sans">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Review text */}
                        <p className="text-neutral-600 text-xs leading-relaxed whitespace-pre-line pl-1 font-sans">
                          "{rev.comment}"
                        </p>

                        {/* Vote Helpful button & Admin Reply Trigger */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                          <button
                            onClick={() => handleHelpfulVote(rev.id)}
                            className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                              hasVotedHelpful[rev.id]
                                ? 'bg-neutral-100 border border-neutral-300 text-neutral-700 font-extrabold'
                                : 'bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-500 hover:text-black'
                            }`}
                          >
                            <ThumbsUp size={10} /> Helpful ({rev.helpful_count})
                          </button>
                        </div>

                        {/* Official Store response */}
                        {rev.admin_reply && (
                          <div className="mt-4 p-4 rounded-xl border border-neutral-250 bg-neutral-50 space-y-1.5 relative overflow-hidden">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-800">
                              <Award size={12} className="text-[#f0a500]" /> Official Store Reply
                            </div>
                            <p className="text-neutral-500 text-xs italic pl-4 leading-relaxed font-sans">
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
        </ScrollAnimate>

      </div>
    </div>
  );
};

export default ProductDetail;
