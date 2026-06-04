import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Watch password to calculate strength
  const passwordValue = watch('password', '');

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (!pass) return 0;
    if (pass.length >= 8) strength += 1;
    if (/[a-zA-Z]/.test(pass) && /[0-9]/.test(pass)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) strength += 1;
    if (pass.length >= 12) strength += 1;
    return strength;
  };

  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        role: 'user' // default to standard user
      });
      toast.success(res.data?.message || 'Registration successful! Verification link sent.');
      navigate('/login');
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141412] text-neutral-100 flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#1c1c1a] border border-[#2a2a27] rounded-xl p-8 shadow-2xl">
        <div className="mb-6">
          <span className="text-[10px] font-bold text-[#a3a39e] uppercase tracking-widest block mb-1">
            New Account
          </span>
          <h1 className="text-3xl font-serif text-slate-100 font-medium">
            Create account
          </h1>
          <p className="text-sm text-[#8a8a84] mt-1">
            Join in seconds. No credit card needed.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-[#a3a39e] mb-1.5">
              Full name
            </label>
            <input
              type="text"
              placeholder="Jane Smith"
              {...register('full_name', { required: 'Full name is required' })}
              className="w-full bg-transparent border border-[#30302d] focus:border-[#52524e] rounded-lg py-2.5 px-3 text-sm text-neutral-100 placeholder-[#52524e] focus:outline-none transition-colors"
            />
            {errors.full_name && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.full_name.message as string}
              </span>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#a3a39e] mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="jane@example.com"
              {...register('email', { 
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
              })}
              className="w-full bg-transparent border border-[#30302d] focus:border-[#52524e] rounded-lg py-2.5 px-3 text-sm text-neutral-100 placeholder-[#52524e] focus:outline-none transition-colors"
            />
            {errors.email && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.email.message as string}
              </span>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#a3a39e] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                className="w-full bg-transparent border border-[#30302d] focus:border-[#52524e] rounded-lg py-2.5 pl-3 pr-12 text-sm text-neutral-100 placeholder-[#52524e] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-2"
              >
                <span className="border border-[#30302d] hover:border-[#52524e] rounded-md p-1.5 hover:bg-neutral-800/30 text-neutral-400 hover:text-neutral-300 transition-all flex items-center justify-center cursor-pointer">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </span>
              </button>
            </div>
            {errors.password && (
              <span className="text-xs text-red-400 mt-1 block">
                {errors.password.message as string}
              </span>
            )}

            {/* Password strength indicator bars */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <div className={`h-1 rounded transition-colors ${strength >= 1 ? 'bg-red-500' : 'bg-[#30302d]'}`}></div>
              <div className={`h-1 rounded transition-colors ${strength >= 2 ? 'bg-amber-500' : 'bg-[#30302d]'}`}></div>
              <div className={`h-1 rounded transition-colors ${strength >= 3 ? 'bg-green-500' : 'bg-[#30302d]'}`}></div>
              <div className={`h-1 rounded transition-colors ${strength >= 4 ? 'bg-indigo-500' : 'bg-[#30302d]'}`}></div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2e2e2b] hover:bg-[#3d3d3a] text-neutral-100 border border-[#3e3e3b]/80 hover:border-neutral-500 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <hr className="border-[#30302d]" />
          <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-[#1c1c1a] px-3 text-[11px] text-[#8a8a84] font-medium tracking-wide">
            or continue with
          </span>
        </div>

        {/* Google OAuth mock */}
        <button
          type="button"
          onClick={() => toast.success('Google sign-in integration is a mock!')}
          className="w-full border border-[#30302d] hover:border-[#52524e] rounded-lg py-2.5 flex justify-center items-center gap-2 text-sm text-neutral-200 bg-transparent hover:bg-neutral-800/10 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.1C18.281 1.69 15.541 1 12.24 1 6.01 1 1 6.01 1 12.24s5.01 11.24 11.24 11.24c6.5 0 10.822-4.57 10.822-11.025 0-.74-.08-1.3-.176-1.785H12.24z"
            />
          </svg>
          Google
        </button>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#8a8a84]">
          Already have an account?{' '}
          <Link to="/login" className="text-neutral-200 hover:text-white font-medium underline underline-offset-4 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
