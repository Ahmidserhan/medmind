'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { getProfile, updateProfile, uploadAvatar, type Profile } from '@/app/actions/profile';

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await getProfile();
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Failed to load profile', text: res.error });
      } else {
        setProfile(res.data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    Swal.fire({ title: 'Saving', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await updateProfile(form);
    if ('error' in res) Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    else Swal.fire({ icon: 'success', title: 'Saved' });
  };

  const onAvatar = async (file?: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    Swal.fire({ title: 'Uploading', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await uploadAvatar(fd);
    if ('error' in res) Swal.fire({ icon: 'error', title: 'Upload failed', text: res.error });
    else { Swal.fire({ icon: 'success', title: 'Avatar updated' }); setProfile(res.data); }
  };

  if (loading) return (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center shadow-lg">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73] mb-4"></div>
      <div className="text-gray-600 font-medium">Loading profile...</div>
    </div>
  );
  if (!profile) return (
    <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-center shadow-lg">
      <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="text-red-600 font-semibold">Profile not found</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl font-bold text-[#0F3D73] shadow-lg" style={{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {!profile.avatar_url && (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase()}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl cursor-pointer hover:shadow-lg transition-all shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>onAvatar(e.target.files?.[0])} />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.full_name || 'No name set'}</h2>
            <div className="text-gray-600 mb-2">{profile.email}</div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {profile.school && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  {profile.school}
                </span>
              )}
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={onSave} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-lg space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
              <input name="full_name" defaultValue={profile.full_name || ''} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" placeholder="Enter your full name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">School / Institution</label>
              <input name="school" defaultValue={profile.school || ''} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all" placeholder="e.g., Harvard Medical School" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
          <textarea name="bio" defaultValue={profile.bio || ''} rows={4} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all resize-none" placeholder="Tell us about yourself..." />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Notifications</label>
              <select name="email_notifications" defaultValue={String(profile.email_notifications ?? false)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white transition-all">
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Theme</label>
              <select name="theme" defaultValue={profile.theme || 'light'} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white transition-all">
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button type="submit" className="px-6 py-3 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </button>
          <button type="button" onClick={()=>window.location.reload()} className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
