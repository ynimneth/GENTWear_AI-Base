import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ShoppingBag, CreditCard, CheckCircle2, ChevronRight, Plus, 
  Trash2, Loader2, ShieldCheck, ArrowLeft, Info, HelpCircle, Phone, User
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAddressStore } from '../store/addressStore';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

// Stripe Elements Imports
import { loadStripe } from '@stripe/stripe-js/pure';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import confetti from 'canvas-confetti';

// Stripe publishable key configuration
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51P00000000000000000000000000000000000000000000000000000000000000000000000000000000';

let stripePromise: any = null;
const getStripePromise = () => {
  if (!stripePromise && !stripeKey.startsWith('pk_test_51P0000')) {
    try {
      // Disable telemetry/fraud detection requests to avoid ERR_BLOCKED_BY_CLIENT
      loadStripe.setLoadParameters({ advancedFraudSignals: false });
    } catch (e) {
      console.warn('Stripe load parameters warning:', e);
    }
    stripePromise = loadStripe(stripeKey);
  }
  return stripePromise;
};

// Premium Mock Payment Form for Stripe Sandbox Mode
const MockPaymentForm: React.FC<{
  clientSecret: string;
  orderId: number;
  total: number;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ clientSecret, orderId, total, onSuccess, onBack }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardCvc(value);
    }
  };

  const getCardType = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'visa';
    if (cleanNum.startsWith('5')) return 'mastercard';
    if (cleanNum.startsWith('3')) return 'amex';
    return 'generic';
  };

  const cardType = getCardType(cardNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardNumber || cardNumber.replace(/\s+/g, '').length < 16) {
      toast.error('Please enter a valid 16-digit card number');
      return;
    }
    if (!cardName) {
      toast.error('Please enter cardholder name');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      toast.error('Please enter expiry date (MM/YY)');
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      toast.error('Please enter CVC code');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[Payment Sandbox] Simulating mock checkout processing...');
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      try {
        await fetch('http://localhost:5000/payments/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: clientSecret.split('_secret_')[0],
                amount: Math.round(total * 100),
                status: 'succeeded'
              }
            }
          })
        });
      } catch (webhookErr) {
        console.warn('[Payments Webhook Sandbox] Mock webhook trigger warning:', webhookErr);
      }

      setIsProcessing(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during sandbox payment');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 3D Visual Card Preview */}
      <div className="card-perspective w-full max-w-[340px] h-[210px] mx-auto mb-8 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`card-inner w-full h-full relative rounded-2xl ${isFlipped ? 'is-flipped' : ''}`}>
          {/* Card Front */}
          <div className="card-front absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
            {/* Holographic glowing orb background pattern */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start">
              {/* Chip and contact-less icon */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-7 bg-gradient-to-r from-amber-400 to-amber-200 rounded-md opacity-85 relative overflow-hidden flex flex-wrap p-1">
                  <div className="w-full h-[1px] bg-slate-900/15"></div>
                  <div className="w-full h-[1px] bg-slate-900/15"></div>
                  <div className="w-1/2 h-full border-r border-slate-900/15"></div>
                </div>
                <div className="text-slate-500 rotate-90 scale-90">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.66 0 3 1.34 3 3v1.71c.77.13 1.4.66 1.66 1.39l.24.64z"/>
                  </svg>
                </div>
              </div>

              {/* Brand Logo */}
              <div className="font-black tracking-widest text-sm uppercase italic bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent flex flex-col items-end">
                {cardType === 'visa' && <span className="text-blue-400 font-extrabold not-italic text-lg">VISA</span>}
                {cardType === 'mastercard' && (
                  <div className="flex items-center -space-x-2">
                    <div className="w-5 h-5 rounded-full bg-rose-500 opacity-90"></div>
                    <div className="w-5 h-5 rounded-full bg-amber-500 opacity-90"></div>
                  </div>
                )}
                {cardType === 'amex' && <span className="text-cyan-400 font-extrabold not-italic text-sm">AMEX</span>}
                {cardType === 'generic' && <span className="text-[10px] tracking-widest font-semibold text-slate-400">GENTWEAR</span>}
              </div>
            </div>

            {/* Card Number */}
            <div className="text-center py-2">
              <span className="font-mono text-lg tracking-[0.2em] text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                {cardNumber || '•••• •••• •••• ••••'}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Cardholder Name</span>
                <span className="font-mono text-xs tracking-wider text-slate-200 uppercase truncate max-w-[170px]">
                  {cardName || 'JOHN DOE'}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Expires</span>
                <span className="font-mono text-xs tracking-wider text-slate-200">
                  {cardExpiry || 'MM/YY'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Back */}
          <div className="card-back absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-slate-800 rounded-2xl py-6 flex flex-col justify-between shadow-2xl overflow-hidden">
            <div className="w-full h-11 bg-slate-950 mt-1"></div>
            
            <div className="px-6 flex flex-col gap-2">
              <span className="text-[8px] uppercase tracking-widest text-slate-500 text-left font-bold pl-1">Authorized Signature</span>
              <div className="w-full h-9 bg-slate-100/90 rounded-md flex items-center justify-between px-3 overflow-hidden">
                <div className="w-3/4 h-full bg-[linear-gradient(45deg,rgba(0,0,0,0.02)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.02)_75%,transparent_75%,transparent)] bg-[size:10px_10px] flex items-center">
                  <span className="font-serif italic text-slate-700 text-sm opacity-60 tracking-wider truncate max-w-[120px]">
                    {cardName}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-950 font-bold italic tracking-wider">
                  {cardCvc || '•••'}
                </span>
              </div>
            </div>

            <div className="px-6 text-[7px] text-slate-500 leading-normal text-left">
              This is a development sandbox credit card mockup. Payments simulated using this card are for testing purposes only and do not charge real financial institutions.
            </div>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sandbox Payment (No Real Charge)</span>
          <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
            <ShieldCheck size={14} /> Sandbox Mode
          </span>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-bold block mb-1">Cardholder Name</label>
          <input
            type="text"
            required
            placeholder="John Doe"
            value={cardName}
            onFocus={() => setIsFlipped(false)}
            onChange={(e) => setCardName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 font-bold block mb-1">Card Number</label>
          <input
            type="text"
            required
            placeholder="4111 1111 1111 1111"
            value={cardNumber}
            onFocus={() => setIsFlipped(false)}
            onChange={handleCardNumberChange}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono tracking-widest"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">Expiration Date</label>
            <input
              type="text"
              required
              placeholder="MM/YY"
              value={cardExpiry}
              onFocus={() => setIsFlipped(false)}
              onChange={handleExpiryChange}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1">CVC Code</label>
            <input
              type="password"
              required
              placeholder="•••"
              value={cardCvc}
              onFocus={() => setIsFlipped(true)}
              onBlur={() => setIsFlipped(false)}
              onChange={handleCvcChange}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-300">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>Sandbox Active:</strong> You can enter any 16-digit card number and expiry details to proceed. We recommend using <code>4111 1111 1111 1111</code> (test Visa).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 text-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Processing...
            </>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

// Sub-component for Payment Form to access Elements context
const PaymentForm: React.FC<{
  clientSecret: string;
  orderId: number;
  total: number;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ clientSecret, orderId, total, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe is not fully loaded. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Check if it is a sandbox mock secret
      if (clientSecret.startsWith('pi_mock_')) {
        console.log('[Payment Sandbox] Simulating mock checkout processing...');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        
        // Call local server webhook directly or mock success since webhook is mock
        // For mock order, we'll hit our payment webhook to confirm payment status
        try {
          await fetch('http://localhost:5000/payments/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'payment_intent.succeeded',
              data: {
                object: {
                  id: clientSecret.split('_secret_')[0],
                  amount: Math.round(total * 100),
                  status: 'succeeded'
                }
              }
            })
          });
        } catch (webhookErr) {
          console.warn('[Payments Webhook Sandbox] Mock webhook trigger warning:', webhookErr);
        }

        setIsProcessing(false);
        onSuccess();
        return;
      }

      // Real Stripe payment confirmation
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.error('Credit card details form is missing.');
        setIsProcessing(false);
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement
        }
      });

      if (result.error) {
        toast.error(result.error.message || 'Payment confirmation failed');
        setIsProcessing(false);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          setIsProcessing(false);
          onSuccess();
        } else {
          toast.error('Payment intent status: ' + result.paymentIntent.status);
          setIsProcessing(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during payment');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit or Debit Card</span>
          <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
            <ShieldCheck size={14} /> 256-bit Encrypted
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#f8fafc',
                  iconColor: '#6366f1',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSmoothing: 'antialiased',
                  fontSize: '15px',
                  '::placeholder': {
                    color: '#64748b'
                  }
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444'
                }
              }
            }}
          />
        </div>
        
        {clientSecret.startsWith('pi_mock_') && (
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-300">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              <strong>Sandbox Mode Active:</strong> Stripe keys are missing or invalid, so a mock PaymentIntent is used. Feel free to input any dummy digits to proceed.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Processing...
            </>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();

  // Stores hook
  const { cartItems, fetchCart } = useCartStore() as any;
  const { user } = useAuthStore() as any;
  const { addresses, isLoading: addressLoading, fetchAddresses, addAddress } = useAddressStore() as any;
  const { createOrder, createPaymentIntent } = useOrderStore() as any;

  // Checkout states
  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  
  // New address form state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: '',
    full_name: '',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_default: false
  });

  // Created order references
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Load addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Set default address if available
  useEffect(() => {
    if (addresses.length > 0 && selectedAddressId === null) {
      const defaultAddr = addresses.find((a: any) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else {
        setSelectedAddressId(addresses[0].id);
      }
    }
  }, [addresses, selectedAddressId]);

  // Calculate pricing breakdown
  const subtotal = cartItems.reduce((sum: number, item: any) => {
    const price = item.variant?.price_override !== null && item.variant?.price_override !== undefined
      ? parseFloat(item.variant.price_override)
      : parseFloat(item.Product.price);
    return sum + (price * item.quantity);
  }, 0);

  const freeShippingThreshold = 150;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCost = subtotal === 0 ? 0 : (isFreeShipping ? 0 : 15);
  const totalCost = subtotal + shippingCost;

  // Form handlers
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Quick validation
    const required = ['title', 'full_name', 'phone_number', 'address_line1', 'city', 'state', 'postal_code', 'country'];
    for (const field of required) {
      if (!addressForm[field as keyof typeof addressForm]) {
        toast.error(`${field.replace('_', ' ')} is required`);
        return;
      }
    }

    const res = await addAddress(addressForm);
    if (res.success) {
      toast.success('Shipping address added!');
      setSelectedAddressId(res.data.id);
      setShowNewAddressForm(false);
      setAddressForm({
        title: '',
        full_name: '',
        phone_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        is_default: false
      });
    } else {
      toast.error(res.message);
    }
  };

  const proceedToStep2 = () => {
    if (!selectedAddressId) {
      toast.error('Please select or add a shipping address');
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;

    setIsSubmittingOrder(true);
    
    try {
      // 1. Post to create order endpoint
      const orderRes = await createOrder({ address_id: selectedAddressId });
      
      if (!orderRes.success) {
        toast.error(orderRes.message);
        setIsSubmittingOrder(false);
        return;
      }

      setPlacedOrder(orderRes.order);

      // 2. Fetch Payment Intent for order
      const intentRes = await createPaymentIntent(orderRes.order.id);
      if (!intentRes.success) {
        toast.error(intentRes.message);
        setIsSubmittingOrder(false);
        return;
      }

      setClientSecret(intentRes.data.clientSecret);
      setStep(3); // Go to Payment Step
      
      // Refresh cart context in store (should now be empty)
      fetchCart();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during order routing');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const triggerConfetti = () => {
    // Blast confetti!
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7', '#f43f5e']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7', '#f43f5e']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handlePaymentSuccess = () => {
    setStep(4); // Go to Confirmation Step
    triggerConfetti();
  };

  // Find currently selected address
  const activeAddress = addresses.find((a: any) => a.id === selectedAddressId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-100 tracking-wider uppercase">Secure Checkout</h1>
            <p className="text-slate-450 text-xs mt-1">Complete your menswear purchase</p>
          </div>
          <button 
            onClick={() => navigate('/products')} 
            className="text-slate-400 hover:text-slate-200 text-xs font-bold border border-slate-800 bg-slate-900/40 hover:bg-slate-850 px-4 py-2.5 rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>

        {/* Steps indicator */}
        <div className="grid grid-cols-4 gap-2 mb-10 text-center relative">
          {[
            { num: 1, label: 'Address' },
            { num: 2, label: 'Review' },
            { num: 3, label: 'Payment' },
            { num: 4, label: 'Confirm' }
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                step === s.num
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20 scale-105'
                  : step > s.num
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest mt-2 ${
                step === s.num ? 'text-indigo-400' : step > s.num ? 'text-emerald-500' : 'text-slate-500'
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Checkout Wizard Panel */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Address Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <MapPin size={20} className="text-indigo-400" /> Shipping Address
                      </h2>
                      {!showNewAddressForm && (
                        <button
                          onClick={() => setShowNewAddressForm(true)}
                          className="text-xs font-bold text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus size={14} /> Add New Address
                        </button>
                      )}
                    </div>

                    {showNewAddressForm ? (
                      <form onSubmit={handleCreateAddress} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Address Label *</label>
                            <input
                              type="text"
                              name="title"
                              placeholder="e.g. Home, Office"
                              value={addressForm.title}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Full Name *</label>
                            <input
                              type="text"
                              name="full_name"
                              placeholder="John Doe"
                              value={addressForm.full_name}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Phone Number *</label>
                            <input
                              type="text"
                              name="phone_number"
                              placeholder="+1 555-0199"
                              value={addressForm.phone_number}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Address Line 1 *</label>
                            <input
                              type="text"
                              name="address_line1"
                              placeholder="123 Main St"
                              value={addressForm.address_line1}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              name="address_line2"
                              placeholder="Apt, Suite, Room"
                              value={addressForm.address_line2}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">City *</label>
                            <input
                              type="text"
                              name="city"
                              placeholder="New York"
                              value={addressForm.city}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">State / Region *</label>
                            <input
                              type="text"
                              name="state"
                              placeholder="NY"
                              value={addressForm.state}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">ZIP / Postal Code *</label>
                            <input
                              type="text"
                              name="postal_code"
                              placeholder="10001"
                              value={addressForm.postal_code}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">Country *</label>
                            <input
                              type="text"
                              name="country"
                              placeholder="United States"
                              value={addressForm.country}
                              onChange={handleAddressInputChange}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            name="is_default"
                            id="is_default"
                            checked={addressForm.is_default}
                            onChange={handleAddressInputChange}
                            className="w-4 h-4 accent-indigo-600 rounded bg-slate-950 border border-slate-800"
                          />
                          <label htmlFor="is_default" className="text-xs text-slate-350 cursor-pointer">Set as default shipping address</label>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-850">
                          <button
                            type="button"
                            onClick={() => setShowNewAddressForm(false)}
                            className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-indigo-600/10"
                          >
                            Save Address
                          </button>
                        </div>
                      </form>
                    ) : addressLoading ? (
                      <div className="py-12 flex justify-center items-center">
                        <Loader2 className="animate-spin text-indigo-400" size={32} />
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="py-8 text-center flex flex-col justify-center items-center">
                        <MapPin size={36} className="text-slate-650 mb-3" />
                        <p className="text-slate-400 text-sm font-semibold">No addresses saved yet</p>
                        <p className="text-slate-550 text-xs mt-1">Add your shipping details to get started.</p>
                        <button
                          onClick={() => setShowNewAddressForm(true)}
                          className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                        >
                          Add Shipping Address
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((addr: any) => (
                          <div 
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex justify-between relative overflow-hidden group ${
                              selectedAddressId === addr.id
                                ? 'bg-indigo-600/5 border-indigo-500 shadow-md shadow-indigo-500/5'
                                : 'bg-slate-950/40 border-slate-850/60 hover:border-slate-800 hover:bg-slate-950/60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-slate-100">{addr.title}</span>
                                {addr.is_default && (
                                  <span className="text-[9px] font-bold tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-300 mt-2 flex items-center gap-1.5">
                                <User size={12} className="text-slate-500" /> {addr.full_name}
                              </p>
                              <p className="text-xs text-slate-450 mt-1 flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-500" /> {addr.phone_number}
                              </p>
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed pl-5">
                                {addr.address_line1}
                                {addr.address_line2 ? `, ${addr.address_line2}` : ''}<br/>
                                {addr.city}, {addr.state} {addr.postal_code}, {addr.country}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                selectedAddressId === addr.id
                                  ? 'border-indigo-500 bg-indigo-600 text-white'
                                  : 'border-slate-800 bg-slate-950'
                              }`}>
                                {selectedAddressId === addr.id && <span className="w-2 h-2 rounded-full bg-white"></span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!showNewAddressForm && addresses.length > 0 && (
                    <button
                      onClick={proceedToStep2}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                    >
                      Continue to Review <ChevronRight size={16} />
                    </button>
                  )}
                </motion.div>
              )}

              {/* Step 2: Review Order */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {/* Delivery Address Summary card */}
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl text-left">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-400" /> Delivery Shipping Details
                      </h3>
                      <button 
                        onClick={() => setStep(1)} 
                        className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                    {activeAddress && (
                      <div className="text-xs text-slate-400 space-y-1">
                        <p className="font-bold text-slate-200 text-sm">{activeAddress.full_name}</p>
                        <p className="text-slate-300">{activeAddress.phone_number}</p>
                        <p className="pt-1">{activeAddress.address_line1}{activeAddress.address_line2 ? `, ${activeAddress.address_line2}` : ''}</p>
                        <p>{activeAddress.city}, {activeAddress.state} {activeAddress.postal_code}</p>
                        <p>{activeAddress.country}</p>
                      </div>
                    )}
                  </div>

                  {/* Review terms alert */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed text-left">
                    <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      Please verify your shipping details and order summaries before confirming. Clicking "Confirm & Proceed to Payment" will deduct inventory levels from stock to reserve your items.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setStep(1)}
                      disabled={isSubmittingOrder}
                      className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98 disabled:opacity-50"
                    >
                      <ArrowLeft size={16} /> Edit Address
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmittingOrder}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <Loader2 className="animate-spin" size={16} /> Reserving Items...
                        </>
                      ) : (
                        <>
                          Proceed to Payment <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment Intent Form */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6 text-left"
                >
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
                      <CreditCard size={20} className="text-indigo-400" /> Enter Payment Details
                    </h2>
                    <p className="text-slate-400 text-xs mb-6">
                      Payment for Order <strong className="text-slate-200 font-bold">#{placedOrder?.id}</strong> is required to finalize delivery.
                    </p>

                    {clientSecret && (
                      clientSecret.startsWith('pi_mock_') ? (
                        <MockPaymentForm
                          clientSecret={clientSecret}
                          orderId={placedOrder?.id}
                          total={placedOrder ? parseFloat(placedOrder.total) : totalCost}
                          onSuccess={handlePaymentSuccess}
                          onBack={() => setStep(2)}
                        />
                      ) : (
                        <Elements stripe={getStripePromise()}>
                          <PaymentForm
                            clientSecret={clientSecret}
                            orderId={placedOrder?.id}
                            total={placedOrder ? parseFloat(placedOrder.total) : totalCost}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep(2)}
                          />
                        </Elements>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirm Order Screen */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-8 rounded-2xl shadow-2xl text-center space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto scale-110 mb-2 animate-pulse">
                    <CheckCircle2 size={36} />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wide">Order Confirmed!</h2>
                    <p className="text-emerald-400 text-xs font-bold mt-1 uppercase tracking-wider">Payment Received Successfully</p>
                    <p className="text-slate-400 text-xs mt-3 max-w-md mx-auto leading-relaxed">
                      Thank you for your order! We've sent a detailed summary confirmation email to <strong className="text-slate-200">{user?.email}</strong> via SendGrid. Your package is currently being processed.
                    </p>
                  </div>

                  {placedOrder && (
                    <div className="bg-slate-950/60 border border-slate-850 p-4 max-w-sm mx-auto rounded-xl text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Order Reference:</span>
                        <span className="text-slate-300 font-mono">#{placedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Total Paid:</span>
                        <span className="text-indigo-400 font-bold">${parseFloat(placedOrder.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Delivery Status:</span>
                        <span className="text-yellow-500 font-bold uppercase tracking-wider text-[10px]">Processing</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-850 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate('/profile')}
                      className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      View Order History
                    </button>
                    <button
                      onClick={() => navigate('/products')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Sidebar: Order Summary panel (Only shown for steps 1, 2, 3) */}
          {step <= 3 && (
            <div className="space-y-4 text-left">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 p-6 rounded-2xl shadow-xl space-y-6">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2 pb-4 border-b border-slate-850">
                  <ShoppingBag size={16} className="text-indigo-400" /> Order Summary
                </h3>

                {/* Cart items summary */}
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {cartItems.map((item: any, idx: number) => {
                    const price = item.variant?.price_override !== null && item.variant?.price_override !== undefined
                      ? parseFloat(item.variant.price_override)
                      : parseFloat(item.Product.price);
                    
                    return (
                      <div key={`${item.productId}-${idx}`} className="flex justify-between items-start text-xs gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-slate-200 line-clamp-1">{item.Product.name}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">
                            Qty {item.quantity} {item.variant?.size ? `• Size ${item.variant.size}` : ''}
                          </p>
                        </div>
                        <span className="font-bold text-slate-350 shrink-0">
                          ${(price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals calculations */}
                <div className="border-t border-slate-850 pt-4 space-y-2.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-300">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-bold text-slate-300">
                      {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-850 pt-3 flex justify-between text-sm">
                    <span className="font-bold text-slate-200">Total</span>
                    <span className="font-extrabold text-indigo-400 text-base">
                      ${placedOrder ? parseFloat(placedOrder.total).toFixed(2) : totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantees card */}
              <div className="p-4 rounded-xl border border-slate-850/60 bg-slate-900/20 text-[10px] text-slate-500 leading-relaxed space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                  <ShieldCheck size={12} className="text-indigo-400" /> Buyer Guarantees
                </div>
                <p>
                  Free shipping on orders over $150. Tracked shipping, easy 14-day returns policy. Standard delivery arrives in 3-5 business days.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Checkout;
