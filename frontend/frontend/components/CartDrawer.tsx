import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { toast } from 'react-hot-toast';
import { getImageUrl, formatLKR } from '../pages/ProductList';

const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
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
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
            className="relative w-full max-w-md h-full bg-white border-l border-neutral-200 shadow-2xl flex flex-col z-10 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between text-neutral-800">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-neutral-500" />
                <h2 className="text-base font-bold">Shopping Bag</h2>
                <span className="text-xs bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold px-2 py-0.5 rounded-full">
                  {cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Item List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-400 mb-4 animate-bounce">
                    <ShoppingBag size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-700">Your bag is empty</h3>
                  <p className="text-neutral-500 text-xs mt-1.5 max-w-[240px] leading-relaxed">
                    Looks like you haven't added anything to your cart yet. Let's change that!
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="mt-6 bg-black hover:bg-neutral-850 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
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
                      className="flex gap-4 p-3 bg-neutral-50 border border-neutral-200 rounded-xl relative group hover:border-neutral-300 transition-colors text-left"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-20 aspect-[4/5] bg-white rounded-lg overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={getImageUrl(primaryImg?.url)}
                          alt={item.Product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-700 line-clamp-1 group-hover:text-black transition-colors font-sans">
                            {item.Product.name}
                          </h4>
                          
                          {/* Variant Attributes */}
                          {item.variant && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {item.variant.color && (
                                <div className="flex items-center gap-1 text-[9px] text-neutral-500 font-bold uppercase">
                                  {item.variant.color_hex && (
                                    <span 
                                      className="w-2 h-2 rounded-full border border-neutral-300 inline-block"
                                      style={{ backgroundColor: item.variant.color_hex }}
                                    />
                                  )}
                                  {item.variant.color}
                                </div>
                              )}
                              {item.variant.size && (
                                <span className="text-[9px] bg-white border border-neutral-250 text-neutral-550 font-bold px-1.5 py-0.5 rounded uppercase font-sans">
                                  Size {item.variant.size}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Price & Quantity Controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 h-8 justify-between w-20">
                            <button
                              onClick={() => handleUpdateQty(item, item.quantity - 1)}
                              disabled={isLoading}
                              className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold text-neutral-800 select-none font-sans">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQty(item, item.quantity + 1)}
                              disabled={isLoading}
                              className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          
                          <span className="text-xs font-bold text-neutral-850 font-sans">
                            {formatLKR(itemPrice * item.quantity)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        disabled={isLoading}
                        className="absolute top-2 right-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-neutral-200 bg-neutral-50 space-y-4">
                
                {/* Shipping Indicator */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-700 text-left font-sans">
                  <div className="p-2 bg-neutral-100 text-neutral-800 rounded-lg shrink-0">
                    <Truck size={14} />
                  </div>
                  <div>
                    {isFreeShipping ? (
                      <span className="text-emerald-600 font-bold">You qualify for Free Shipping!</span>
                    ) : (
                      <span>
                        Add <span className="font-bold text-black">{formatLKR(freeShippingThreshold - subtotal)}</span> more to unlock <span className="font-bold">Free Shipping</span>.
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtotal */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-semibold font-sans">Subtotal</span>
                    <span className="text-base font-extrabold text-neutral-900 font-sans">{formatLKR(subtotal)}</span>
                  </div>
                  <p className="text-[10px] text-neutral-450 font-sans leading-normal">Shipping and taxes will be calculated at checkout.</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/checkout');
                    }}
                    className="w-full bg-black hover:bg-neutral-850 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer text-xs uppercase tracking-widest font-sans"
                  >
                    Proceed to Checkout
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs font-bold text-neutral-500 hover:text-neutral-800 py-1 transition-colors cursor-pointer font-sans"
                  >
                    Continue Shopping
                  </button>
                </div>

                {/* Trust Signoff */}
                <div className="flex justify-center items-center gap-1.5 text-[9px] text-neutral-400 font-bold uppercase tracking-wider font-sans">
                  <ShieldCheck size={12} className="text-[#f0a500]" /> Secure SSL encrypted checkout
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
