import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { getImageUrl } from './ProductList';
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
    
    // Quick spring bounce on the delete button
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 text-sm tracking-widest uppercase animate-pulse">Loading saved items...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-650/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-650/5 rounded-full blur-[155px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-12 border-b border-slate-900 pb-8 text-center md:text-left">
          <span className="text-indigo-400 text-xs font-extrabold uppercase tracking-widest mb-1.5 block">My Collection</span>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-100 to-purple-300">
            My Wishlist
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl leading-relaxed">
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
              className="min-h-[350px] bg-slate-900/10 border border-dashed border-slate-850 rounded-3xl flex flex-col justify-center items-center p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-700 mb-5 relative">
                <Heart size={24} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-350">Your Wishlist is empty</h3>
              <p className="text-slate-500 max-w-xs text-xs mt-1.5 leading-relaxed">
                Save your favorite menswear pieces while browsing, and find them grouped here whenever you are ready.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
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
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 hover:border-slate-750/80 rounded-2xl overflow-hidden shadow-lg group cursor-pointer flex flex-col h-full relative"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden w-full">
                      <img
                        src={getImageUrl(primaryImg?.url)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Out of Stock Warning */}
                      {totalStock === 0 && (
                        <span className="absolute top-3 left-3 bg-red-650/90 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-md">
                          Sold Out
                        </span>
                      )}

                      {/* Remove from wishlist button overlay */}
                      <button
                        onClick={(e) => handleRemove(e, prod.id, prod.name)}
                        className="absolute top-3 right-3 p-2 bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-red-400 rounded-full transition-all cursor-pointer z-20 group/trash"
                        title="Remove from favorites"
                      >
                        <Trash2 size={14} className="group-hover/trash:scale-110 transition-transform" />
                      </button>

                      {/* View Details hover overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <span className="bg-slate-900 border border-slate-800 text-slate-100 rounded-full p-2.5 shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                          <Eye size={16} />
                        </span>
                      </div>
                    </div>

                    {/* Product Metadata Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block mb-1">
                          {prod.category?.name || 'Collections'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                          {prod.name}
                        </h3>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-100">
                          ${parseFloat(prod.price).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1 group-hover:underline">
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
