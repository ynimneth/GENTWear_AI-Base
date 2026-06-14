import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { getImageUrl, formatLKR } from './ProductList';
import { Heart, Trash2, Eye, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { gsap } from 'gsap';

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore() as any;
  const { wishlistItems, fetchWishlist, toggleWishlist, isLoading } = useWishlistStore() as any;

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to view your wishlist.');
      navigate('/login');
    } else {
      fetchWishlist();
    }
  }, [user, navigate, fetchWishlist]);

  const handleRemove = async (e: React.MouseEvent, productId: number, productName: string) => {
    e.stopPropagation();
    
    const trashBtn = e.currentTarget;
    gsap.to(trashBtn, {
      scale: 0.8,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: async () => {
        const res = await toggleWishlist(productId);
        if (res.success) {
          toast.success(`${productName} removed from wishlist.`);
        } else {
          toast.error(res.message);
        }
      }
    });
  };

  if (isLoading && wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-white text-neutral-800 flex flex-col justify-center items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-black border-r-neutral-400 animate-spin"></div>
        </div>
        <p className="mt-4 text-neutral-500 text-sm tracking-widest uppercase animate-pulse">Loading saved items...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-800 p-6 md:p-12 relative overflow-hidden select-none font-sans">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-12 border-b border-neutral-200 pb-8 text-center md:text-left">
          <span className="text-[#f0a500] text-xs font-extrabold uppercase tracking-widest mb-1.5 block">My Collection</span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-neutral-900 leading-tight">
            My Wishlist
          </h1>
          <p className="text-neutral-500 mt-2 text-xs max-w-xl leading-relaxed">
            Browse through your saved items. Click on an item to view sizes and colors, or click remove to delete it from your favorites.
          </p>
        </div>

        {/* Wishlist Grid */}
        <AnimatePresence mode="popLayout">
          {wishlistItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="min-h-[350px] bg-neutral-50 border border-neutral-200 rounded-3xl flex flex-col justify-center items-center p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-350 mb-5 relative shadow-sm">
                <Heart size={22} className="animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-neutral-700">Your Wishlist is empty</h3>
              <p className="text-neutral-450 max-w-xs text-xs mt-1.5 leading-relaxed">
                Save your favorite menswear pieces while browsing, and find them grouped here whenever you are ready.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="mt-8 bg-black hover:bg-neutral-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Discover Apparel
              </button>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {wishlistItems.map((prod: any) => {
                const primaryImg = prod.images?.find((img: any) => img.is_primary) || prod.images?.[0];
                const totalStock = prod.variants?.reduce((sum: number, v: any) => sum + v.stock_qty, 0) || 0;

                return (
                  <motion.div
                    key={prod.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="bg-white border border-neutral-205 hover:border-neutral-400 hover:shadow-lg rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full relative"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden w-full">
                      <img
                        src={getImageUrl(primaryImg?.url)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      
                      {/* Out of Stock Warning */}
                      {totalStock === 0 && (
                        <span className="absolute top-3 left-3 bg-red-650/90 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                          Sold Out
                        </span>
                      )}

                      {/* Remove from wishlist button overlay */}
                      <button
                        onClick={(e) => handleRemove(e, prod.id, prod.name)}
                        className="absolute top-3 right-3 p-2 bg-white/90 border border-neutral-200 hover:bg-white text-neutral-400 hover:text-red-500 rounded-full shadow-sm transition-all cursor-pointer z-25 group/trash"
                        title="Remove from favorites"
                      >
                        <Trash2 size={13} className="group-hover/trash:scale-110 transition-transform" />
                      </button>

                      {/* View Details hover overlay */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="bg-white border border-neutral-200 text-neutral-800 rounded-full p-2.5 shadow-md transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                          <Eye size={16} />
                        </span>
                      </div>
                    </div>

                    {/* Product Metadata Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between text-left">
                      <div>
                        <span className="text-[9px] text-[#f0a500] font-extrabold uppercase tracking-wider block mb-1">
                          {prod.category?.name || 'Collections'}
                        </span>
                        <h3 className="text-xs font-bold text-neutral-700 line-clamp-1 group-hover:text-neutral-900 transition-colors font-sans">
                          {prod.name}
                        </h3>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-850">
                          {formatLKR(prod.price)}
                        </span>
                        <span className="text-[9px] text-[#f0a500] font-bold uppercase tracking-wider flex items-center gap-1 group-hover:underline font-sans">
                          Buy Now →
                        </span>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Wishlist;
