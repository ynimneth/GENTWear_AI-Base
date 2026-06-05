import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { toast } from 'react-hot-toast';

const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
};

const CartDrawer: React.FC = () => {
  const { 
    cartItems, 
    isOpen, 
    setIsOpen, 
    updateQuantity, 
    removeFromCart, 
    isLoading 
  } = useCartStore() as any;

  // Listen for Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Calculate Subtotal
  const subtotal = cartItems.reduce((sum: number, item: any) => {
    const price = item.variant?.price_override !== null && item.variant?.price_override !== undefined
      ? parseFloat(item.variant.price_override)
      : parseFloat(item.Product.price);
    return sum + (price * item.quantity);
  }, 0);

  const freeShippingThreshold = 150;
  const isFreeShipping = subtotal >= freeShippingThreshold;

  const handleUpdateQty = async (item: any, newQty: number) => {
    if (newQty < 1) return;
    const stock = item.variant ? item.variant.stock_qty : 999;
    if (newQty > stock) {
      toast.error(`Only ${stock} items available in stock.`);
      return;
    }
    const res = await updateQuantity(item.productId, item.variantId, newQty);
    if (!res.success) {
      toast.error(res.message);
    }
  };

  const handleRemoveItem = async (item: any) => {
    const res = await removeFromCart(item.productId, item.variantId);
    if (res.success) {
      toast.success(`${item.Product.name} removed from bag.`);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
            className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800/80 shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={20} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-slate-100">Shopping Bag</h2>
                <span className="text-xs bg-slate-850 border border-slate-700/60 text-slate-300 font-bold px-2 py-0.5 rounded-full">
                  {cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Item List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-600 mb-4 animate-bounce">
                    <ShoppingBag size={26} />
                  </div>
                  <h3 className="text-base font-bold text-slate-300">Your bag is empty</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-[240px]">
                    Looks like you haven't added anything to your cart yet. Let's change that!
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Explore Collections
                  </button>
                </div>
              ) : (
                cartItems.map((item: any, index: number) => {
                  const itemPrice = item.variant?.price_override !== null && item.variant?.price_override !== undefined
                    ? parseFloat(item.variant.price_override)
                    : parseFloat(item.Product.price);
                  const primaryImg = item.Product.images?.find((img: any) => img.is_primary) || item.Product.images?.[0];

                  return (
                    <motion.div
                      key={`${item.productId}-${item.variantId || 'novar'}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex gap-4 p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl relative group hover:border-slate-800 transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-20 aspect-[4/5] bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-850">
                        <img
                          src={getImageUrl(primaryImg?.url)}
                          alt={item.Product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                            {item.Product.name}
                          </h4>
                          
                          {/* Variant Attributes */}
                          {item.variant && (
                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                              {item.variant.color && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                                  {item.variant.color_hex && (
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full border border-slate-950 inline-block"
                                      style={{ backgroundColor: item.variant.color_hex }}
                                    />
                                  )}
                                  {item.variant.color}
                                </div>
                              )}
                              {item.variant.size && (
                                <span className="text-[10px] bg-slate-850 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase">
                                  Size {item.variant.size}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Price & Quantity Controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg p-1 h-8 justify-between w-24">
                            <button
                              onClick={() => handleUpdateQty(item, item.quantity - 1)}
                              disabled={isLoading}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-350 rounded transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold text-slate-300">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQty(item, item.quantity + 1)}
                              disabled={isLoading}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-350 rounded transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          
                          <span className="text-sm font-bold text-slate-100">
                            ${(itemPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        disabled={isLoading}
                        className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-slate-800/60 bg-slate-900/60 space-y-4">
                
                {/* Shipping Indicator */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-850/60 text-xs">
                  <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg shrink-0">
                    <Truck size={14} />
                  </div>
                  <div>
                    {isFreeShipping ? (
                      <span className="text-green-400 font-bold">You qualify for Free Shipping!</span>
                    ) : (
                      <span className="text-slate-300">
                        Add <span className="font-bold text-indigo-400">${(freeShippingThreshold - subtotal).toFixed(2)}</span> more to unlock <span className="font-bold">Free Shipping</span>.
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtotal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-semibold">Subtotal</span>
                    <span className="text-lg font-extrabold text-slate-100">${subtotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Shipping and taxes will be calculated at checkout.</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      toast.success('Proceeding to Checkout...');
                    }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-98"
                  >
                    Proceed to Checkout
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>

                {/* Trust Signoff */}
                <div className="flex justify-center items-center gap-1 text-[10px] text-slate-600 font-semibold">
                  <ShieldCheck size={11} /> Secure 256-bit SSL encrypted checkout
                </div>

              </div>
            )}

          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
