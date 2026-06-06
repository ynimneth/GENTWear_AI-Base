import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Star, Check, Trash2, Reply, X, Loader2, 
  AlertCircle, ShieldCheck, Shirt, User
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

interface Review {
  id: number;
  rating: number;
  comment: string;
  is_approved: boolean;
  createdAt: string;
  User: {
    full_name: string;
    email: string;
  };
  Product: {
    id: number;
    name: string;
    price: string;
  };
}

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyReviewId, setReplyReviewId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchPendingReviews = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/reviews/pending');
      setReviews(data);
    } catch (err) {
      toast.error('Failed to load pending reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Review approved and published!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve review');
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Are you sure you want to reject and delete this customer review?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Review rejected and deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error('Reply comment text cannot be empty');
      return;
    }

    setIsSubmittingReply(true);
    try {
      await api.post(`/admin/reviews/${id}/reply`, { admin_reply: replyText });
      toast.success('Official reply saved! Review remains pending. Click Approve to publish both.');
      
      // Clear reply state
      setReplyReviewId(null);
      setReplyText('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6 text-left relative">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase text-slate-100 tracking-wider">Review Moderation</h1>
        <p className="text-slate-450 text-xs mt-1">Approve client reviews, reject violations, and submit official replies</p>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl p-6 min-h-[50vh] flex flex-col">
        {isLoading ? (
          <div className="py-24 flex-1 flex justify-center items-center text-slate-400">
            <Loader2 className="animate-spin text-indigo-400 mr-2" size={24} />
            <span className="text-xs uppercase tracking-wider font-bold">Querying Awaiting Reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
            <MessageSquare size={36} className="text-slate-700 mb-3" />
            <p className="text-sm font-bold">No reviews awaiting moderation</p>
            <p className="text-xs mt-1">All customer comments are currently reviewed and published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reviews.map(review => (
              <div 
                key={review.id}
                className="p-5 rounded-xl border border-slate-850 bg-slate-950/30 flex flex-col md:flex-row gap-5 justify-between relative"
              >
                {/* Details info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={13} 
                          className={s <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-700'} 
                        />
                      ))}
                    </div>
                    <span className="text-slate-500 text-[10px]">•</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <User size={10} /> {review.User?.full_name} ({review.User?.email})
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-slate-200 text-xs leading-relaxed italic bg-slate-950/45 p-3 rounded-lg border border-slate-850/40">
                    "{review.comment}"
                  </p>

                  {/* Product Details Tag */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-450">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <Shirt size={11} /> {review.Product?.name}
                    </span>
                    <span>•</span>
                    <span>Submitted: {new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Moderate Actions */}
                <div className="flex flex-col justify-between items-end gap-4 shrink-0 md:w-52 border-t md:border-t-0 md:border-l border-slate-850 pt-4 md:pt-0 md:pl-5">
                  <div className="w-full space-y-2">
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={13} /> Approve Review
                    </button>
                    <button
                      onClick={() => handleReject(review.id)}
                      className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} /> Reject / Delete
                    </button>
                    
                    {replyReviewId !== review.id ? (
                      <button
                        onClick={() => setReplyReviewId(review.id)}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-bold uppercase py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Reply size={13} /> Official Reply
                      </button>
                    ) : (
                      <button
                        onClick={() => setReplyReviewId(null)}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 text-[10px] font-bold uppercase py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X size={13} /> Cancel Reply
                      </button>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                {replyReviewId === review.id && (
                  <form 
                    onSubmit={(e) => handleReplySubmit(e, review.id)}
                    className="absolute inset-0 bg-slate-900 border border-indigo-500/35 rounded-xl p-4 flex flex-col justify-between z-10 animate-fadeIn"
                  >
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck size={12} /> Post Official Reply
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setReplyReviewId(null)}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Type official store reply (e.g. Thanks for your purchase! We are glad you like it...)"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-150 focus:outline-none focus:border-indigo-500 resize-none font-medium leading-relaxed"
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => { setReplyReviewId(null); setReplyText(''); }}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-850 px-4 py-2 rounded-lg text-[10px] font-bold uppercase text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReply}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        {isSubmittingReply ? <Loader2 size={10} className="animate-spin" /> : 'Save Reply'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminReviews;
