import Link from "next/link";

export default function FeatureTimeline() {
  const items: { title: string; desc: string; href: string; side: "left"|"right"; }[] = [
    { title: "Plan with confidence", desc: "Calendar, exams and assignments in one place.", href: "/assignments", side: "left" },
    { title: "Collaborate smarter", desc: "Group sessions, discussions, participants and votes.", href: "/collaboration", side: "right" },
    { title: "Master the material", desc: "Glossary & Skills with RxNav and CTSS lookups + notes.", href: "/glossary-skills", side: "left" },
    { title: "Stay focused", desc: "Pomodoro timer, to‑dos and notes to keep momentum.", href: "/study-tools", side: "right" },
  ];

  return (
    <section className="px-6 py-14 sm:px-10 md:px-16 lg:px-24">
      <div className="max-w-6xl mx-auto relative">
        {/* center line */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#3AAFA9] via-[#0F3D73] to-[#3AAFA9] opacity-70" />

        <ul className="space-y-10">
          {items.map((it, i) => (
            <li key={i} className={`relative flex ${it.side === 'left' ? 'justify-start' : 'justify-end'}`}>
              {/* node */}
              <span className="absolute left-1/2 -translate-x-1/2 top-5 w-8 h-8 rounded-full bg-[#0F3D73] border-2 border-white shadow-md flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 5v5l4 2-1 1-5-3V7h2Z"/></svg>
              </span>

              <div className={`${it.side === 'left' ? 'mr-[52%]' : 'ml-[52%]'} w-full max-w-xl`}>
                <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm p-6">
                  <div className="text-[#0F3D73] font-semibold">{it.title}</div>
                  <div className="text-sm text-[#4B5563] mt-1">{it.desc}</div>
                  <div className="mt-4">
                    <Link href={it.href} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#EAF2FB] text-[#0F3D73] hover:bg-[#dbe8f7] text-sm">Explore <span>→</span></Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
