'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function Hero({ isAuthed }: { isAuthed: boolean }) {
  const phrases = useMemo(() => ['Plan', 'Collaborate', 'Excel'], []);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState('');

  useEffect(() => {
    let i = 0;
    let dir: 'in' | 'out' = 'in';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const word = phrases[idx % phrases.length];
      if (dir === 'in') {
        setShow(word.slice(0, i + 1));
        i++;
        if (i >= word.length) { dir = 'out'; timer = setTimeout(run, 1200); return; }
      } else {
        setShow(word.slice(0, i - 1));
        i--;
        if (i <= 0) { dir = 'in'; setIdx((p) => (p + 1) % phrases.length); }
      }
      timer = setTimeout(run, 80);
    };
    run();
    return () => { if (timer) clearTimeout(timer); };
  }, [idx, phrases]);

  return (
    <section className="relative overflow-hidden pt-16 sm:pt-20">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0F3D73_0%,#0B2F59_50%,#092748_100%)]" />
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-20 bg-[#3AAFA9]" />
      <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full blur-3xl opacity-10 bg-white" />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 py-20 sm:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">
              Your all‑in‑one Study OS for Ateneo de Zamboanga Nursing
            </h1>
            <p className="mt-3 text-[#E6EEF7]">
              Plan rotations and exams, collaborate with peers, and stay focused with Pomodoro, To‑Dos, and notes — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {!isAuthed ? (
                <>
                  <Link href="/signup" className="px-5 py-2.5 rounded-lg bg-white text-[#0F3D73] hover:bg-[#E6EEF7] transition-colors">Sign up free</Link>
                  <Link href="/login" className="px-5 py-2.5 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors">Log in</Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="px-5 py-2.5 rounded-lg bg-white text-[#0F3D73] hover:bg-[#E6EEF7] transition-colors">Open dashboard</Link>
                  <Link href="/study-tools" className="px-5 py-2.5 rounded-lg bg-[#3AAFA9] text-white hover:bg-[#2E8B85] transition-colors">Start studying</Link>
                </>
              )}
            </div>

            <div className="mt-6 text-[#E6EEF7] text-sm">
              <span className="opacity-80">Made to help you </span>
              <span className="inline-block min-w-[7ch] font-semibold text-white">{show}</span>
              <span className="ml-1 animate-pulse">▍</span>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/10 rounded-xl p-6 border border-white/20">
            <div className="text-white/90 font-medium mb-2">Quick links</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link href="/assignments" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Assignments</Link>
              <Link href="/exams" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Exams</Link>
              <Link href="/clinicals" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Clinicals</Link>
              <Link href="/collaboration" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Collaboration</Link>
              <Link href="/glossary-skills" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Glossary & Skills</Link>
              <Link href="/study-tools" className="px-3 py-2 rounded border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors">Study Tools</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
