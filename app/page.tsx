import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Hero from "@/app/components/Hero";
import FeatureCarousel from "@/app/components/FeatureCarousel";
import FeatureTimeline from "@/app/components/FeatureTimeline";
import AnimatedSection from "@/app/components/AnimatedSection";
import Navbar from "@/app/components/Navbar";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-white to-[#EAF2FB]">
      <Navbar isAuthed={!!user} />
      <Hero isAuthed={!!user} />

      <AnimatedSection>
        <div id="features">
          <FeatureTimeline />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <section id="features-carousel" className="px-6 pb-14 sm:px-10 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F3D73] mb-4">Powerful Features</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Everything you need to manage your nursing education in one place</p>
            </div>
            <FeatureCarousel
              items={[
                { title: 'Assignments', desc: 'Track deadlines, status, priority; add attachments.', href: '/assignments' },
                { title: 'Clinicals', desc: 'Rotations, sites/departments, shifts, hours log.', href: '/clinicals' },
                { title: 'Exams', desc: 'Plan dates, location/time, see days left.', href: '/exams' },
                { title: 'Collaboration', desc: 'Group sessions, discussions, votes, attachments.', href: '/collaboration' },
                { title: 'Glossary & Skills', desc: 'Drug and term lookups with personal notes.', href: '/glossary-skills' },
                { title: 'Study Tools', desc: 'Pomodoro timer, to‑do lists, and note taking.', href: '/study-tools' },
              ]}
            />
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection delay={0.3}>
        <section id="how-it-works" className="px-6 pb-14 sm:px-10 md:px-16 lg:px-24 bg-gradient-to-r from-[#EAF2FB] to-[#D6E8F9] py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F3D73] mb-4">How It Works</h2>
              <p className="text-gray-600">Get started in three simple steps</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <StepCard n={1} title="Create an account" desc="Sign up and set your profile." />
              <StepCard n={2} title="Add your schedule" desc="Add exams, shifts, assignments and sessions." />
              <StepCard n={3} title="Focus and collaborate" desc="Use study tools and group features daily." />
            </div>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection delay={0.4}>
        <section id="faq" className="px-6 pt-16 pb-20 sm:px-10 md:px-16 lg:px-24 bg-[linear-gradient(135deg,#0F3D73_0%,#0B2F59_100%)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mb-40 blur-3xl"></div>
          
          <div className="max-w-6xl mx-auto text-white relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-white/80">Everything you need to know about MedMind</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="p-5 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-all">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#3AAFA9] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg mb-2">Is it free?</div>
                      <div className="text-white/80 text-sm">MedMind is free; future plans may offer extra features.</div>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-all">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#3AAFA9] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg mb-2">Do I need to install anything?</div>
                      <div className="text-white/80 text-sm">No. MedMind is web-based; use it on any device.</div>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-white/10 border border-white/20 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-all">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#3AAFA9] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <div className="font-semibold text-lg mb-2">Is my data safe?</div>
                      <div className="text-white/80 text-sm">Backed by Supabase Auth and RLS. Your data is yours.</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-white/15 to-white/5 border border-white/30 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#3AAFA9] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-xl">Stay in the loop</div>
                    <div className="text-sm text-white/80">Get product updates and study tips</div>
                  </div>
                </div>
                <form className="space-y-3" action="#">
                  <input type="email" placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-white/90 text-[#0F3D73] placeholder-[#0F3D73]/60 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9] transition-all" />
                  <button type="button" className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#3AAFA9] to-[#2E8B85] text-white font-semibold hover:shadow-lg transition-all">
                    Subscribe Now
                  </button>
                </form>
                <div className="mt-3 text-xs text-white/60 text-center">No spam. Unsubscribe any time.</div>
              </div>
            </div>

            {/* Link columns */}
            <div className="mt-16 pt-12 border-t border-white/20 grid md:grid-cols-4 gap-8 text-sm relative z-10">
            <div>
              <div className="font-semibold">MedMind</div>
              <div className="text-white/70 mt-1">Study OS for Ateneo de Zamboanga Nursing.</div>
            </div>
            <div>
              <div className="font-semibold mb-2">Product</div>
              <ul className="space-y-1 text-white/80">
                <li><Link href="/assignments" className="hover:text-white">Assignments</Link></li>
                <li><Link href="/exams" className="hover:text-white">Exams</Link></li>
                <li><Link href="/clinicals" className="hover:text-white">Clinicals</Link></li>
                <li><Link href="/collaboration" className="hover:text-white">Collaboration</Link></li>
                <li><Link href="/glossary-skills" className="hover:text-white">Glossary & Skills</Link></li>
                <li><Link href="/study-tools" className="hover:text-white">Study Tools</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Resources</div>
              <ul className="space-y-1 text-white/80">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Docs (soon)</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Connect</div>
              <div className="flex gap-3">
                <a href="#" aria-label="Twitter" className="hover:opacity-90">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white/80"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 0 0 1.88-2.37 8.62 8.62 0 0 1-2.73 1.04A4.29 4.29 0 0 0 16.1 4c-2.38 0-4.3 1.93-4.3 4.3 0 .34.04.67.11.99A12.19 12.19 0 0 1 3.15 5.15a4.29 4.29 0 0 0 1.33 5.73 4.26 4.26 0 0 1-1.95-.54v.05c0 2.09 1.49 3.83 3.46 4.23-.36.1-.75.15-1.14.15-.28 0-.56-.03-.83-.08.56 1.76 2.2 3.04 4.13 3.07A8.61 8.61 0 0 1 2 19.54 12.14 12.14 0 0 0 8.56 21.5c7.02 0 10.86-5.81 10.86-10.86 0-.17 0-.34-.01-.5A7.77 7.77 0 0 0 22.46 6z"/></svg>
                </a>
                <a href="#" aria-label="GitHub" className="hover:opacity-90">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white/80"><path fillRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.36 6.84 9.72.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.19-1.12-1.5-1.12-1.5-.92-.65.07-.64.07-.64 1.02.07 1.56 1.07 1.56 1.07.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.09 0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.06a9.2 9.2 0 0 1 5 0c1.91-1.33 2.75-1.06 2.75-1.06.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.77 0 3.96-2.34 4.83-4.57 5.08.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" clipRule="evenodd"/></svg>
                </a>
              </div>
            </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-10 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between text-xs text-white/70 gap-3 relative z-10">
              <div>© {new Date().getFullYear()} MedMind — Built for Ateneo de Zamboanga Nursing</div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-[#0F3D73] transition-all duration-300 hover:-translate-y-1">
      <div className="absolute -top-4 left-6 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0F3D73] to-[#2E3A59] text-white flex items-center justify-center text-xl font-bold shadow-lg group-hover:scale-110 transition-transform">
        {n}
      </div>
      <div className="mt-6 font-bold text-lg text-[#0F3D73] mb-2">{title}</div>
      <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
      <div className="mt-4 flex items-center text-[#0F3D73] font-semibold text-sm group-hover:gap-2 transition-all">
        <span>Learn more</span>
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
