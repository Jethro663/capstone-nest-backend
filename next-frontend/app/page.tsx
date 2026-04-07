'use client';

import Image from 'next/image';
import Link from 'next/link';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { motion, type Variants, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Building2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Layers3,
  Mail,
  MapPin,
  NotebookPen,
  Orbit,
  Phone,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

type Metric = {
  value: string;
  label: string;
  detail: string;
};

type Feature = {
  icon: LucideIcon;
  title: string;
  copy: string;
  detail: string;
};

type RolePanel = {
  icon: LucideIcon;
  title: string;
  copy: string;
  tag: string;
};

type WorkflowItem = {
  label: string;
  status: string;
  detail: string;
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const riseIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

const signalMetrics: Metric[] = [
  {
    value: '2.4K+',
    label: 'Learners Connected',
    detail: 'Daily access to lessons, grades, announcements, and support tools.',
  },
  {
    value: '18',
    label: 'Sections Synced',
    detail: 'Class flows aligned across records, assessments, and progress tracking.',
  },
  {
    value: '99.9%',
    label: 'Portal Uptime Mindset',
    detail: 'Built to stay dependable during the everyday pace of campus operations.',
  },
];

const featureCards: Feature[] = [
  {
    icon: Bot,
    title: 'AI-assisted teaching flows',
    copy: 'Draft lessons, accelerate review cycles, and keep classroom prep moving without losing teacher control.',
    detail: 'Support stays inside the school workflow instead of living in separate tools.',
  },
  {
    icon: Layers3,
    title: 'One surface for every signal',
    copy: 'Assessments, announcements, class records, and learning experience tools live in one operating picture.',
    detail: 'Less context-switching for students, teachers, and school staff.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear role-based access',
    copy: 'Students, faculty, and administrators enter a portal shaped around what they actually need to do.',
    detail: 'Secure entry and cleaner navigation reduce friction from the first screen.',
  },
];

const rolePanels: RolePanel[] = [
  {
    icon: GraduationCap,
    title: 'Students',
    copy: 'Open lessons, check assessments, follow announcements, and keep learning support within reach.',
    tag: 'Focus-first experience',
  },
  {
    icon: NotebookPen,
    title: 'Teachers',
    copy: 'Manage sections, publish activities, review outcomes, and move from plan to delivery faster.',
    tag: 'Built for classroom pace',
  },
  {
    icon: Building2,
    title: 'School Operations',
    copy: 'Keep user management, reporting, sections, and oversight tools visible in a single control layer.',
    tag: 'System-wide visibility',
  },
];

const workflowItems: WorkflowItem[] = [
  {
    label: 'Lesson drafting',
    status: 'AI assist',
    detail: 'Teacher-ready drafts prepared for review and polish.',
  },
  {
    label: 'Assessment posting',
    status: 'Queued',
    detail: 'Schedules, publish states, and results stay easy to track.',
  },
  {
    label: 'Announcements',
    status: 'Live',
    detail: 'School-wide and section notices move through one shared stream.',
  },
];

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();

  const floatingHeroCard = shouldReduceMotion
    ? undefined
    : { y: [0, -14, 0], rotate: [0, 1.4, 0] };

  const floatingHeroCardAlt = shouldReduceMotion
    ? undefined
    : { y: [0, 12, 0], rotate: [0, -1.2, 0] };

  return (
    <div
      className={`${spaceGrotesk.className} landing-shell min-h-screen overflow-x-clip text-slate-100 selection:bg-rose-300 selection:text-slate-950`}
    >
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="landing-orb landing-orb-primary pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full" />
      <div className="landing-orb landing-orb-secondary pointer-events-none absolute right-0 top-12 h-80 w-80 rounded-full" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070b11]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/90 p-1 shadow-[0_18px_40px_-28px_rgba(255,255,255,0.5)]">
              <Image
                src="/taguigpic.png"
                alt="Gat Andres Bonifacio High School seal"
                width={52}
                height={52}
                priority
                className="rounded-[0.9rem]"
              />
            </div>
            <div className="min-w-0">
              <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.28em] text-rose-200/80`}>
                GABHS digital campus
              </p>
              <p className="truncate text-sm font-semibold tracking-[-0.03em] text-white sm:text-base">
                Nexora Portal
              </p>
            </div>
          </Link>

          <nav className={`${ibmPlexMono.className} hidden items-center gap-6 text-[0.72rem] uppercase tracking-[0.22em] text-slate-400 md:flex`}>
            <a href="#experience" className="transition-colors hover:text-white">
              Experience
            </a>
            <a href="#roles" className="transition-colors hover:text-white">
              Roles
            </a>
            <a href="#contact" className="transition-colors hover:text-white">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/demo" className="landing-button-ghost text-sm">
              Demo
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link href="/login" className="landing-button-solid text-sm">
              Access Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-6 pb-24 pt-10 lg:px-8 lg:pb-28 lg:pt-14">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="relative z-10"
            >
              <motion.div variants={riseIn}>
                <span className={`${ibmPlexMono.className} landing-chip`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  redesigned for a sharper first impression
                </span>
              </motion.div>

              <motion.h1
                variants={riseIn}
                className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.08em] text-white sm:text-6xl lg:text-7xl"
              >
                A school portal that feels fast,
                <span className="bg-gradient-to-r from-white via-amber-200 to-rose-300 bg-clip-text text-transparent">
                  {' '}
                  modern,
                </span>{' '}
                and alive.
              </motion.h1>

              <motion.p
                variants={riseIn}
                className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg"
              >
                Nexora turns the GABHS digital campus into one clear operating layer for
                students, teachers, and school teams. Assessments, announcements, records,
                and learning tools stay connected in a more cinematic, high-trust experience.
              </motion.p>

              <motion.div
                variants={riseIn}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link href="/login" className="landing-button-solid text-base">
                  Enter Nexora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/demo" className="landing-button-ghost text-base">
                  Open Demo
                  <Sparkles className="h-4 w-4" />
                </Link>
                <a href="#experience" className="landing-button-ghost text-base">
                  Explore the experience
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </motion.div>

              <motion.div
                variants={riseIn}
                className={`${ibmPlexMono.className} mt-10 flex flex-wrap gap-3 text-[0.7rem] uppercase tracking-[0.22em] text-slate-400`}
              >
                <span className="landing-chip-soft">Assessments</span>
                <span className="landing-chip-soft">Announcements</span>
                <span className="landing-chip-soft">AI support</span>
                <span className="landing-chip-soft">Class records</span>
                <span className="landing-chip-soft">Reports</span>
              </motion.div>

              <motion.div
                variants={stagger}
                className="mt-10 grid gap-4 sm:grid-cols-3"
              >
                {signalMetrics.map((metric) => (
                  <motion.article
                    key={metric.label}
                    variants={riseIn}
                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                    className="landing-panel rounded-[1.6rem] p-5"
                  >
                    <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-slate-400`}>
                      {metric.label}
                    </p>
                    <p className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white">
                      {metric.value}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{metric.detail}</p>
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
              className="relative z-10"
            >
              <div className="landing-panel landing-mesh relative overflow-hidden rounded-[2.25rem]">
                <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-slate-400`}>
                      nexora / command surface
                    </p>
                  </div>

                  <span className={`${ibmPlexMono.className} landing-chip-soft`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    live sync
                  </span>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[1.12fr_0.88fr]">
                  <div className="relative min-h-[420px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/20">
                    <Image
                      src="/NexoraHome.png"
                      alt="Nexora student hero artwork"
                      fill
                      priority
                      sizes="(min-width: 1024px) 28rem, 100vw"
                      className="object-cover object-right"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,10,18,0.9),rgba(6,10,18,0.28)_54%,rgba(239,68,68,0.16))]" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <span className={`${ibmPlexMono.className} landing-chip-soft`}>
                        student mode
                      </span>
                      <h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-[-0.05em] text-white">
                        Human-centered learning, framed like a product.
                      </h2>
                      <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">
                        The first impression now feels more premium: sharp typography,
                        glass layers, animated depth, and a clearer route into the platform.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-slate-400`}>
                          AI lesson drafting
                        </p>
                        <div className="rounded-2xl bg-rose-400/10 p-3 text-rose-200">
                          <Bot className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-8 flex items-end justify-between gap-6">
                        <div>
                          <p className="text-4xl font-semibold tracking-[-0.06em] text-white">
                            92%
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            ready for teacher review
                          </p>
                        </div>
                        <div className="max-w-[9rem] text-right text-xs leading-5 text-slate-400">
                          Draft outlines, objectives, and prompts stay in one workflow.
                        </div>
                      </div>

                      <div className="landing-progress mt-7">
                        <div className="landing-progress__bar" style={{ width: '92%' }} />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-slate-400`}>
                          workflow routing
                        </p>
                        <Orbit className="h-5 w-5 text-amber-200" />
                      </div>

                      <div className="mt-5 space-y-3">
                        {workflowItems.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[1.15rem] border border-white/10 bg-black/18 px-4 py-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-medium text-white">{item.label}</p>
                              <span className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-emerald-300`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-400">
                              {item.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={floatingHeroCard}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 7.2, repeat: Infinity, ease: 'easeInOut' }
                }
                className="landing-panel absolute -left-4 top-16 hidden w-56 rounded-[1.4rem] p-4 xl:block"
              >
                <p className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-slate-400`}>
                  secure access
                </p>
                <div className="mt-4 flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    Role-based entry keeps student, teacher, and admin paths sharply separated.
                  </p>
                </div>
              </motion.div>

              <motion.div
                animate={floatingHeroCardAlt}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 8.4, repeat: Infinity, ease: 'easeInOut' }
                }
                className="landing-panel absolute -right-4 bottom-8 hidden w-64 rounded-[1.4rem] p-4 lg:block"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-slate-400`}>
                    active handoff
                  </p>
                  <Sparkles className="h-4 w-4 text-amber-200" />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  New motion, contrast, and structure make the portal feel more intentional from the first click.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section
          id="experience"
          className="relative border-t border-black/5 bg-[#f6f1ea] px-6 py-24 text-slate-900 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="max-w-2xl">
                <motion.span variants={riseIn} className={`${ibmPlexMono.className} landing-chip-light`}>
                  Experience layer
                </motion.span>
                <motion.h2
                  variants={riseIn}
                  className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl"
                >
                  More than a hero refresh. The page now has a point of view.
                </motion.h2>
                <motion.p
                  variants={riseIn}
                  className="mt-5 text-base leading-8 text-slate-600"
                >
                  The redesign leans into a more product-grade visual system: richer contrast,
                  better rhythm, premium motion, and stronger framing for what Nexora actually
                  offers the school community.
                </motion.p>
              </div>

              <motion.div variants={stagger} className="grid gap-4 md:grid-cols-3">
                {featureCards.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <motion.article
                      key={feature.title}
                      variants={riseIn}
                      whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                      className="landing-panel-light group relative overflow-hidden rounded-[1.8rem] p-6"
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-rose-400/18 to-amber-300/20 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                      <div className="relative">
                        <div className="inline-flex rounded-[1.1rem] bg-slate-950 p-3 text-white shadow-[0_20px_40px_-26px_rgba(15,23,42,0.55)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                          {feature.title}
                        </h3>
                        <p className="mt-4 text-sm leading-7 text-slate-600">{feature.copy}</p>
                        <p className="mt-5 text-sm leading-7 text-slate-500">{feature.detail}</p>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section
          id="roles"
          className="relative bg-[#f6f1ea] px-6 pb-24 text-slate-900 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="landing-panel-light relative overflow-hidden rounded-[2rem] p-3"
            >
              <div className="relative min-h-[460px] overflow-hidden rounded-[1.7rem]">
                <Image
                  src="/Gatbg.png"
                  alt="GABHS campus gathering"
                  fill
                  sizes="(min-width: 1024px) 40rem, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.72))]" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <span className={`${ibmPlexMono.className} landing-chip-soft !border-white/20 !bg-white/10 !text-white`}>
                    One control center
                  </span>
                  <h3 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                    School operations stay visible instead of scattered.
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">
                    The new landing page explains Nexora the way the product should feel:
                    structured, connected, and ready for the real flow of a school day.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {signalMetrics.slice(0, 2).map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-[1.25rem] border border-white/12 bg-white/10 p-4 backdrop-blur-md"
                      >
                        <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.24em] text-slate-300`}>
                          {metric.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="grid gap-4"
            >
              {rolePanels.map((role) => {
                const Icon = role.icon;

                return (
                  <motion.article
                    key={role.title}
                    variants={riseIn}
                    whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                    className="landing-panel-light group rounded-[1.8rem] p-6"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <span className={`${ibmPlexMono.className} landing-chip-light`}>
                          {role.tag}
                        </span>
                        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                          {role.title}
                        </h3>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                          {role.copy}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] bg-slate-950 p-3 text-white shadow-[0_20px_40px_-26px_rgba(15,23,42,0.55)]">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-900">
                      View the flow
                      <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="relative bg-[#f6f1ea] px-6 pb-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="landing-panel landing-mesh mx-auto flex max-w-7xl flex-col gap-8 overflow-hidden rounded-[2rem] px-7 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="max-w-2xl">
              <span className={`${ibmPlexMono.className} landing-chip`}>
                launch-ready
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                The front door now feels closer to a premium product than a default school page.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                Stronger hierarchy, livelier motion, and a more opinionated visual language give
                the platform a higher-value presence before users even log in.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login" className="landing-button-solid text-base">
                Sign in now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#contact" className="landing-button-ghost text-base">
                Reach the school
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer
        id="contact"
        className="relative border-t border-white/10 bg-[#06090f] px-6 pb-10 pt-16 text-slate-300 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/90 p-1">
                <Image
                  src="/taguigpic.png"
                  alt="Gat Andres Bonifacio High School seal"
                  width={52}
                  height={52}
                  className="rounded-[0.9rem]"
                />
              </div>
              <div>
                <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.28em] text-rose-200/80`}>
                  GABHS
                </p>
                <p className="text-lg font-semibold tracking-[-0.03em] text-white">
                  Nexora Portal
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              A more expressive digital front door for Gat Andres Bonifacio High School,
              shaped to feel confident, modern, and operationally clear.
            </p>
          </div>

          <div>
            <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-slate-500`}>
              System direction
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
              <li>Unified access for students, teachers, and administrators.</li>
              <li>Animated presentation that feels closer to a real product launch.</li>
              <li>Brand tone grounded in GABHS identity instead of generic LMS styling.</li>
            </ul>
          </div>

          <div>
            <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-slate-500`}>
              Reach out
            </p>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <a
                href="https://maps.google.com/?q=Bonifacio%2C%20Taguig%20City%2C%20Philippines"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 transition-colors hover:text-white"
              >
                <MapPin className="mt-0.5 h-4 w-4 text-rose-300" />
                <span>Bonifacio, Taguig City, Philippines</span>
              </a>
              <a href="tel:+88087543" className="flex items-center gap-3 transition-colors hover:text-white">
                <Phone className="h-4 w-4 text-rose-300" />
                <span>+8808-75-43</span>
              </a>
              <a
                href="mailto:sdotapat.gabhs@deped.gov.ph"
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-rose-300" />
                <span>sdotapat.gabhs@deped.gov.ph</span>
              </a>
              <div className="flex items-center gap-3 text-slate-400">
                <Clock3 className="h-4 w-4 text-rose-300" />
                <span>Mon - Fri, 8:00 AM - 5:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-3 border-t border-white/8 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Gat Andres Bonifacio High School. All rights reserved.</p>
          <p className={`${ibmPlexMono.className} uppercase tracking-[0.22em]`}>
            Nexora / digital campus interface
          </p>
        </div>
      </footer>
    </div>
  );
}
