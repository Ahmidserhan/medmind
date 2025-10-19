"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { logoutAndRedirect } from "@/app/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: 'home' },
  { href: "/assignments", label: "Assignments", icon: 'tasks' },
  { href: "/calendar", label: "Calendar", icon: 'calendar' },
  { href: "/clinicals", label: "Clinicals", icon: 'clinic' },
  { href: "/collaboration", label: "Collaboration", icon: 'chat' },
  { href: "/exams", label: "Exams", icon: 'exam' },
  { href: "/glossary-skills", label: "Glossary & Skills", icon: 'book' },
  { href: "/study-tools", label: "Study Tools", icon: 'tools' },
  { href: "/profile", label: "Profile", icon: 'user' },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = "w-4 h-4" + (className ? ` ${className}` : "");
  switch (name) {
    case 'home':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 3 10v10a1 1 0 0 0 1 1h6v-6h4v6h6a1 1 0 0 0 1-1V10Z"/></svg>);
    case 'tasks':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h14v2H4V5Zm0 6h10v2H4v-2Zm0 6h14v2H4v-2Z"/></svg>);
    case 'calendar':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1Zm12 8H5v9h14v-9Z"/></svg>);
    case 'clinic':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 7v15h7v-6h4v6h7V7l-9-5Zm1 8V8h2V6h2v2h2v2h-2v2h-2v-2h-2Z"/></svg>);
    case 'chat':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v10H7l-3 3V4Z"/></svg>);
    case 'exam':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14v18H5V3Zm4 4h6v2H9V7Zm0 4h6v2H9v-2Zm0 4h6v2H9v-2Z"/></svg>);
    case 'book':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h10a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4V3Zm0 16h10a3 3 0 0 1 3 3H7a3 3 0 0 1-3-3Z"/></svg>);
    case 'tools':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M7 2l2 2-2 2-2-2 2-2Zm6 0 2 2-8 8-2-2 8-8Zm3 5 2 2-8 8-2-2 8-8ZM4 16l4 4H4v-4Z"/></svg>);
    case 'settings':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>);
    case 'user':
      return (<svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5Z"/></svg>);
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const grouped = useMemo(() => ([
    { title: 'Main', items: navItems.slice(0, 1) },
    { title: 'Planning', items: navItems.slice(1, 6) },
    { title: 'Knowledge', items: navItems.slice(6, 8) },
    { title: 'Account', items: navItems.slice(8) },
  ]), []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#0F3D73] text-white shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen z-40
        w-64 shrink-0 bg-[linear-gradient(135deg,#0F3D73_0%,#0B2F59_100%)] text-white
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-white/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20" />
          <div>
            <div className="text-sm font-semibold">MedMind</div>
            <div className="text-[11px] text-white/70">Student Dashboard</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-4">
        {grouped.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-1 text-[11px] uppercase tracking-wide text-white/60">{group.title}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={
                      "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all " +
                      (active
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/85 hover:bg-white/10")
                    }
                  >
                    {/* active indicator */}
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[linear-gradient(180deg,#E6EEF7_0%,#FFFFFF_100%)]" />}
                    <Icon name={item.icon} className={active ? "text-white" : "text-white/70"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/15 bg-white/0">
        <div className="flex items-center justify-between text-xs text-white/80">
          <form action={logoutAndRedirect}>
            <button type="submit" className="hover:text-white">Logout</button>
          </form>
        </div>
      </div>
    </aside>
    </>
  );
}
