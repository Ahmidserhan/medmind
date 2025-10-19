'use client';

import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { signup } from '@/app/actions/auth';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isEmailValid = (v: string) => /.+@.+\..+/.test(v);
  const canSubmit = useMemo(() => fullName.trim().length>0 && isEmailValid(email) && password.length >= 6 && !loading, [fullName, email, password, loading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !isEmailValid(email) || password.length < 6) return;

    setLoading(true);
    Swal.fire({
      title: 'Creating Account',
      text: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const form = new FormData();
    form.append('full_name', fullName);
    form.append('email', email);
    form.append('password', password);

    const result = await signup(form);

    if (result?.error) {
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Signup Failed',
        text: result.error,
        confirmButtonColor: '#3AAFA9',
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Verify your email',
      html: `We sent a confirmation link to <b>${email}</b>. Please verify to finish signup.`,
      confirmButtonColor: '#3AAFA9',
    }).then(() => {
      window.location.href = '/login';
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F9FAFB]">
      {/* Brand side */}
      <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0F3D73_0%,#0B2F59_50%,#092748_100%)]" />
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-20 bg-[#3AAFA9]" />
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <div className="text-3xl font-semibold leading-tight">Create your MedMind account</div>
            <p className="mt-3 text-white/80">Set up in minutes. Verify your email to get started.</p>
            <ul className="mt-6 space-y-2 text-white/80 text-sm">
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3AAFA9]" /> Student‑first design</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3AAFA9]" /> Secure by Supabase Auth</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3AAFA9]" /> Free to start</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-sm">
          <div className="mb-6">
            <div className="text-2xl font-semibold text-[#0F3D73]">Create account</div>
            <p className="text-sm text-[#6B7280]">Join and start using the dashboard.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F3D73] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${fullName.trim() ? 'border-[#D1D5DB] focus:ring-[#3AAFA9]' : 'border-[#FCA5A5] focus:ring-[#F87171]'}`}
                required
              />
              {!fullName.trim() && (
                <div className="text-xs text-[#DC2626] mt-1">Full name is required.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F3D73] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${isEmailValid(email) ? 'border-[#D1D5DB] focus:ring-[#3AAFA9]' : 'border-[#FCA5A5] focus:ring-[#F87171]'}`}
                required
                placeholder="you@example.com"
              />
              {!isEmailValid(email) && email.length>0 && (
                <div className="text-xs text-[#DC2626] mt-1">Enter a valid email.</div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#0F3D73] mb-1">Password</label>
                <button type="button" onClick={()=>setShowPw(s=>!s)} className="text-xs text-[#0F3D73] hover:underline">{showPw ? 'Hide' : 'Show'}</button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">{showPw ? '👁️' : '👁️‍🗨️'}</span>
              </div>
              {password.length>0 && password.length<6 && (
                <div className="text-xs text-[#DC2626] mt-1">At least 6 characters.</div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full px-4 py-2 bg-[#0F3D73] text-white rounded-lg hover:bg-[#0B2F59] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-3 items-center gap-3">
            <div className="h-px bg-[#E5E7EB]" />
            <div className="text-xs text-[#6B7280] text-center">or</div>
            <div className="h-px bg-[#E5E7EB]" />
          </div>

          <button
            type="button"
            className="mt-3 w-full px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#0F3D73]"
          >
            Continue with Google
          </button>

          <div className="text-sm text-[#6B7280] mt-4 text-center">
            Already have an account? <a className="text-[#0F3D73] hover:underline" href="/login">Log in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
