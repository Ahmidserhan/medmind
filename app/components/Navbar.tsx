'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface NavbarProps {
  isAuthed: boolean;
}

export default function Navbar({ isAuthed }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white/10 backdrop-blur-md border-b border-white/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden group-hover:scale-110 transition-transform shadow-sm">
              <Image
                src="/Logo.png"
                alt="MedMind Logo"
                width={40}
                height={40}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <span className={`text-xl font-bold transition-colors ${isScrolled ? 'text-[#0F3D73]' : 'text-white'}`}>
              MedMind
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className={`font-medium transition-colors hover:text-[#0F3D73] ${
                isScrolled ? 'text-gray-700' : 'text-white/90'
              }`}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className={`font-medium transition-colors hover:text-[#0F3D73] ${
                isScrolled ? 'text-gray-700' : 'text-white/90'
              }`}
            >
              How It Works
            </Link>
            <Link
              href="#faq"
              className={`font-medium transition-colors hover:text-[#0F3D73] ${
                isScrolled ? 'text-gray-700' : 'text-white/90'
              }`}
            >
              FAQ
            </Link>

            {isAuthed ? (
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className={`font-medium transition-colors hover:text-[#0F3D73] ${
                    isScrolled ? 'text-gray-700' : 'text-white/90'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="#features"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#faq"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            {isAuthed ? (
              <Link
                href="/dashboard"
                className="block px-4 py-2.5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl font-semibold text-center shadow-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2.5 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl font-semibold text-center shadow-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
