'use client';

import Link from 'next/link';

export interface FeatureItem {
  title: string;
  desc: string;
  href: string;
}

export default function FeatureCarousel({ items }: { items: FeatureItem[] }) {
  // duplicate items to create an infinite loop look
  const track = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F9FAFB] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F9FAFB] to-transparent z-10" />

      <div className="group [--speed:50s]" role="region" aria-label="Features carousel">
        <ul className="flex gap-4 w-max animate-[scroll_var(--speed)_linear_infinite] hover:[animation-play-state:paused]">
          {track.map((it, idx) => (
            <li key={idx} className="w-[320px]">
              <Link href={it.href} className="block relative p-5 rounded-xl bg-white border border-[#E5E7EB] shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#0F3D73]/20">
                <span className="absolute inset-x-0 -top-0.5 h-1 rounded-t-xl bg-[linear-gradient(90deg,#3AAFA9_0%,#0F3D73_50%,#3AAFA9_100%)] opacity-70" />
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-1.5 rounded-md bg-[#EAF2FB]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0F3D73"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 5v5l4 2-1 1-5-3V7h2Z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[#0F3D73] flex items-center justify-between">
                      <span>{it.title}</span>
                      <span className="text-[#0F3D73]/70 transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                    </div>
                    <div className="text-sm text-[#2E3A59]/80 mt-1">{it.desc}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-[#0F3D73]/60">Open</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF2FB] text-[#0F3D73]">Live</span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
