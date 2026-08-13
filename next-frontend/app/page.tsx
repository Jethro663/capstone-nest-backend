'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { motion, type Variants, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
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
import { getDefaultDashboardRouteForRole } from '@/lib/dashboard-route-access';
import { usePublicSessionProbe } from '@/hooks/usePublicSessionProbe';
import { useAuth } from '@/providers/AuthProvider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

type EntryHighlight = {
  label: string;
  title: string;
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

const entryHighlights: EntryHighlight[] = [
  {
    label: 'Student side',
    title: 'Lessons, assessments, and announcements stay in one familiar flow.',
    detail: 'The first screen now matches the same warm LMS direction students already see after login.',
  },
  {
    label: 'Teacher side',
    title: 'Planning, review, and delivery stay sharp instead of feeling disconnected.',
    detail: 'Teachers move from sections to lessons, assessments, and reports without jumping between visual systems.',
  },
  {
    label: 'School operations',
    title: 'Admin visibility stays clear from account access to reporting.',
    detail: 'The public page introduces the platform with the same campus-red structure used across the product.',
  },
];

const featureCards: Feature[] = [
  {
    icon: Bot,
    title: 'Guided AI support',
    copy: 'Drafting, review, and learning support stay inside the LMS instead of being split across separate tools.',
    detail: 'The product remains teacher-led while still reducing repetitive preparation work.',
  },
  {
    icon: Layers3,
    title: 'One LMS language',
    copy: 'Students, teachers, and school staff see the same brand tone, color system, and structural rhythm.',
    detail: 'That consistency makes the first impression feel connected to the actual product after sign in.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-ready access',
    copy: 'Each role enters a portal shaped around the work they actually need to do.',
    detail: 'Clearer contrast and calmer panels keep the page readable across desktop and mobile screens.',
  },
];

const rolePanels: RolePanel[] = [
  {
    icon: GraduationCap,
    title: 'Students',
    copy: 'Open lessons, check assessments, read announcements, and keep support tools close without getting lost in clutter.',
    tag: 'Student side',
  },
  {
    icon: NotebookPen,
    title: 'Teachers',
    copy: 'Manage classes, build learning materials, review outcomes, and move through the school day with less friction.',
    tag: 'Teacher side',
  },
  {
    icon: Building2,
    title: 'Administrators',
    copy: 'Keep sections, users, reporting, and oversight tools visible from a single operational layer.',
    tag: 'Operations side',
  },
];

const workflowItems: WorkflowItem[] = [
  {
    label: 'Announcements',
    status: 'Visible',
    detail: 'School and class updates remain easy to notice on the landing path and inside each role space.',
  },
  {
    label: 'Assessments',
    status: 'Ready',
    detail: 'Teachers publish and review with the same red-forward product language used across the LMS.',
  },
  {
    label: 'Learning support',
    status: 'Guided',
    detail: 'AI-backed flows stay framed as part of the classroom workflow rather than as a detached feature.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { isAuthenticated, loading, role } = useAuth();

  usePublicSessionProbe();

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    router.replace(getDefaultDashboardRouteForRole(role));
  }, [isAuthenticated, loading, role, router]);

  const floatingHeroCard = shouldReduceMotion
    ? undefined
    : { y: [0, -14, 0], rotate: [0, 1.4, 0] };

  const floatingHeroCardAlt = shouldReduceMotion
    ? undefined
    : { y: [0, 12, 0], rotate: [0, -1.2, 0] };

  return (
    <div
      className={`${spaceGrotesk.className} landing-shell min-h-screen overflow-x-clip text-[color:var(--landing-ink)] selection:bg-rose-200 selection:text-slate-950`}
    >
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="landing-orb landing-orb-primary pointer-events-none absolute -left-16 top-20 h-64 w-64 rounded-full sm:-left-20 sm:h-72 sm:w-72" />
      <div className="landing-orb landing-orb-secondary pointer-events-none absolute right-0 top-10 h-72 w-72 rounded-full sm:h-80 sm:w-80" />

      <header className="sticky top-0 z-50 border-b border-[color:var(--landing-border)] bg-[rgba(255,250,249,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--landing-border)] bg-white p-1 shadow-[0_18px_40px_-28px_rgba(127,29,29,0.28)]">
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
              <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.28em] text-[color:var(--teacher-accent)]`}>
                GABHS digital campus
              </p>
              <p className="truncate text-sm font-semibold tracking-[-0.03em] text-[color:var(--landing-ink)] sm:text-base">
                Nexora Portal
              </p>
            </div>
          </Link>

          <nav className={`${ibmPlexMono.className} hidden items-center gap-6 text-[0.72rem] uppercase tracking-[0.22em] text-[color:var(--landing-text-muted)] md:flex`}>
            <a href="#experience" className="transition-colors hover:text-[color:var(--teacher-accent)]">
              Experience
            </a>
            <a href="#roles" className="transition-colors hover:text-[color:var(--teacher-accent)]">
              Roles
            </a>
            <a href="#contact" className="transition-colors hover:text-[color:var(--teacher-accent)]">
              Contact
            </a>
          </nav>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/demo" className="landing-button-ghost justify-center text-sm">
              View Demo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="landing-button-solid justify-center text-sm">
              Access Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="relative z-10"
            >
              <motion.div variants={riseIn}>
                <span className={`${ibmPlexMono.className} landing-chip`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  LMS-ready first screen
                </span>
              </motion.div>

              <motion.h1
                variants={riseIn}
                className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.08em] text-[color:var(--landing-ink)] sm:text-5xl lg:text-7xl"
              >
                One LMS front door for
                <span className="bg-gradient-to-r from-[var(--teacher-accent)] via-[var(--student-accent)] to-[#fb7185] bg-clip-text text-transparent">
                  {' '}
                  students, teachers,
                </span>{' '}
                and school teams.
              </motion.h1>

              <motion.p
                variants={riseIn}
                className="mt-6 max-w-2xl text-base leading-8 text-[color:var(--landing-text-muted)] sm:text-lg"
              >
                Nexora should look like Nexora from the first screen. This landing page now
                follows the same campus-red LMS direction used in the student and teacher side,
                with clearer text, calmer surfaces, and cleaner mobile spacing.
              </motion.p>

              <motion.div
                variants={riseIn}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <Link href="/dashboard" className="landing-button-solid justify-center text-base">
                  Enter Nexora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/demo" className="landing-button-ghost justify-center text-base">
                  Open Demo
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a href="#experience" className="landing-button-ghost justify-center text-base">
                  Explore the platform
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </motion.div>

              <motion.div
                variants={riseIn}
                className={`${ibmPlexMono.className} mt-8 flex flex-wrap gap-3 text-[0.7rem] uppercase tracking-[0.22em] text-[color:var(--landing-text-muted)]`}
              >
                <span className="landing-chip-soft">Student portal</span>
                <span className="landing-chip-soft">Teacher workflow</span>
                <span className="landing-chip-soft">Announcements</span>
                <span className="landing-chip-soft">Assessments</span>
                <span className="landing-chip-soft">AI support</span>
              </motion.div>

              <motion.div variants={stagger} className="mt-10 grid gap-4 sm:grid-cols-3">
                {entryHighlights.map((highlight) => (
                  <motion.article
                    key={highlight.label}
                    variants={riseIn}
                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                    className="landing-panel rounded-[1.6rem] p-5"
                  >
                    <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-[color:var(--teacher-accent)]`}>
                      {highlight.label}
                    </p>
                    <p className="mt-4 text-xl font-semibold leading-7 tracking-[-0.04em] text-[color:var(--landing-ink)]">
                      {highlight.title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--landing-text-muted)]">
                      {highlight.detail}
                    </p>
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
              <div className="landing-panel landing-mesh relative overflow-hidden rounded-[2rem]">
                <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--landing-border)] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-[color:var(--landing-text-muted)]`}>
                      nexora / workflow preview
                    </p>
                  </div>

                  <span className={`${ibmPlexMono.className} landing-chip-soft`}>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    aligned theme
                  </span>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="relative min-h-[320px] overflow-hidden rounded-[1.6rem] border border-[color:rgba(255,255,255,0.45)] bg-[#5b0f12] sm:min-h-[380px] lg:min-h-[430px]">
                    <Image
                      src="/NexoraHome.png"
                      alt="Nexora student hero artwork"
                      fill
                      priority
                      sizes="(min-width: 1024px) 28rem, 100vw"
                      className="object-cover object-right"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(41,10,12,0.12),rgba(41,10,12,0.78)_74%,rgba(41,10,12,0.92))]" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <span className={`${ibmPlexMono.className} landing-chip-soft !border-white/20 !bg-white/10 !text-white`}>
                        student + teacher language
                      </span>
                      <h2 className="mt-4 max-w-sm text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
                        The landing page now feels connected to the LMS after sign in.
                      </h2>
                      <p className="mt-3 max-w-sm text-sm leading-7 text-rose-50/90">
                        The warmer product palette, calmer panel treatment, and stronger text contrast
                        mirror the direction already used inside the student and teacher routes.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-[1.5rem] border border-[color:var(--landing-border)] bg-white/92 p-5 shadow-[0_18px_40px_-30px_rgba(127,29,29,0.16)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-[color:var(--landing-text-muted)]`}>
                          AI lesson drafting
                        </p>
                        <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--teacher-accent)]">
                          <Bot className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-7 space-y-3">
                        <p className="text-3xl font-semibold tracking-[-0.06em] text-[color:var(--landing-ink)]">
                          Teacher-guided support
                        </p>
                        <p className="text-sm leading-6 text-[color:var(--landing-text-muted)]">
                          Draft outlines, objectives, and classroom prompts stay in one familiar
                          workflow instead of pulling teachers into another interface.
                        </p>
                      </div>

                      <div className="landing-progress mt-6">
                        <div className="landing-progress__bar" style={{ width: '84%' }} />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[color:var(--landing-border)] bg-white/92 p-5 shadow-[0_18px_40px_-30px_rgba(127,29,29,0.16)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.24em] text-[color:var(--landing-text-muted)]`}>
                          workflow routing
                        </p>
                        <Orbit className="h-5 w-5 text-[var(--teacher-accent)]" />
                      </div>

                      <div className="mt-5 space-y-3">
                        {workflowItems.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[1.15rem] border border-[color:rgba(239,68,68,0.12)] bg-[rgba(255,246,246,0.9)] px-4 py-4"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-medium text-[color:var(--landing-ink)]">
                                {item.label}
                              </p>
                              <span className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-[var(--teacher-accent)]`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-[color:var(--landing-text-muted)]">
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
                className="landing-panel absolute -left-4 top-14 hidden w-56 rounded-[1.4rem] p-4 xl:block"
              >
                <p className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-[color:var(--teacher-accent)]`}>
                  secure access
                </p>
                <div className="mt-4 flex items-start gap-3">
                  <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--teacher-accent)]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-6 text-[color:var(--landing-text-muted)]">
                    Role-based entry keeps student, teacher, and admin spaces clearly separated.
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
                  <p className={`${ibmPlexMono.className} text-[0.64rem] uppercase tracking-[0.24em] text-[color:var(--teacher-accent)]`}>
                    mobile ready
                  </p>
                  <Sparkles className="h-4 w-4 text-[var(--teacher-accent)]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--landing-text-muted)]">
                  Buttons, text blocks, and preview panels now wrap more safely on smaller screens.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section
          id="experience"
          className="relative border-t border-[color:rgba(239,68,68,0.08)] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="max-w-2xl">
                <motion.span variants={riseIn} className={`${ibmPlexMono.className} landing-chip-light`}>
                  Experience layer
                </motion.span>
                <motion.h2
                  variants={riseIn}
                  className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-[color:var(--landing-ink)] sm:text-5xl"
                >
                  The public page now introduces the LMS with the same visual language users meet inside it.
                </motion.h2>
                <motion.p
                  variants={riseIn}
                  className="mt-5 text-base leading-8 text-[color:var(--landing-text-muted)]"
                >
                  Instead of a disconnected dark landing page, the experience now leans into the
                  same warm campus palette, readable panels, and role-aware framing already used
                  in the student and teacher spaces.
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
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-rose-300/35 to-amber-200/30 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                      <div className="relative">
                        <div className="inline-flex rounded-[1.1rem] bg-[var(--teacher-accent)] p-3 text-white shadow-[0_20px_40px_-26px_rgba(127,29,29,0.35)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--landing-ink)]">
                          {feature.title}
                        </h3>
                        <p className="mt-4 text-sm leading-7 text-[color:var(--landing-ink-soft)]">
                          {feature.copy}
                        </p>
                        <p className="mt-5 text-sm leading-7 text-[color:var(--landing-text-muted)]">
                          {feature.detail}
                        </p>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="roles" className="relative px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="landing-panel-light relative overflow-hidden rounded-[2rem] p-3"
            >
              <div className="relative min-h-[380px] overflow-hidden rounded-[1.7rem] sm:min-h-[460px]">
                <Image
                  src="/Gatbg.png"
                  alt="GABHS campus gathering"
                  fill
                  sizes="(min-width: 1024px) 40rem, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(80,11,18,0.12),rgba(64,11,17,0.78))]" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <span className={`${ibmPlexMono.className} landing-chip-soft !border-white/20 !bg-white/10 !text-white`}>
                    One control center
                  </span>
                  <h3 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                    Students, teachers, and administrators all enter the same product story.
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-rose-50/90">
                    The landing page now frames Nexora as a connected campus platform instead of a
                    visually separate marketing surface.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {entryHighlights.slice(0, 2).map((highlight) => (
                      <div
                        key={highlight.label}
                        className="rounded-[1.25rem] border border-white/20 bg-white/10 p-4 backdrop-blur-md"
                      >
                        <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.24em] text-rose-100/80`}>
                          {highlight.label}
                        </p>
                        <p className="mt-3 text-lg font-semibold leading-7 tracking-[-0.03em] text-white">
                          {highlight.title}
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
                        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--landing-ink)]">
                          {role.title}
                        </h3>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--landing-ink-soft)]">
                          {role.copy}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] bg-[var(--teacher-accent)] p-3 text-white shadow-[0_20px_40px_-26px_rgba(127,29,29,0.35)]">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[color:var(--landing-ink)]">
                      View the flow
                      <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="relative px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex max-w-7xl flex-col gap-8 overflow-hidden rounded-[2rem] border border-[color:rgba(190,24,93,0.08)] bg-[linear-gradient(135deg,#7f1d1d_0%,#b91c1c_54%,#fb7185_100%)] px-6 py-8 text-white shadow-[0_34px_72px_-40px_rgba(127,29,29,0.44)] sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="max-w-2xl">
              <span className={`${ibmPlexMono.className} landing-chip !border-white/20 !bg-white/10 !text-white`}>
                launch-ready
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Open the LMS with the same theme, clarity, and structure users already trust.
              </h2>
              <p className="mt-4 text-sm leading-7 text-rose-50/90 sm:text-base">
                The page now stays readable, role-aware, and mobile-safe while keeping the same
                Nexora identity seen across the student and teacher side.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-base font-semibold text-[#991b1b] shadow-[0_20px_40px_-26px_rgba(41,10,12,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Sign in now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="/downloads/nexora-student-mobile-release.apk"
                download="nexora-student-mobile.apk"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-white/24 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/14"
              >
                Download Android APK
                <ArrowDown className="h-4 w-4" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-white/24 bg-white/10 px-5 py-3 text-base font-semibold text-white transition-colors duration-200 hover:bg-white/14"
              >
                Reach the school
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.18em] text-rose-100/78`}>
              Android APK is available from this site. A hosted mobile API URL is still required before broad student-device rollout.
            </p>
          </motion.div>
        </section>
      </main>

      <footer
        id="contact"
        className="relative border-t border-[color:var(--landing-border)] bg-[rgba(255,249,248,0.92)] px-4 pb-10 pt-14 text-[color:var(--landing-text-muted)] sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-[color:var(--landing-border)] bg-white p-1">
                <Image
                  src="/taguigpic.png"
                  alt="Gat Andres Bonifacio High School seal"
                  width={52}
                  height={52}
                  className="rounded-[0.9rem]"
                />
              </div>
              <div>
                <p className={`${ibmPlexMono.className} text-[0.65rem] uppercase tracking-[0.28em] text-[color:var(--teacher-accent)]`}>
                  GABHS
                </p>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--landing-ink)]">
                  Nexora Portal
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[color:var(--landing-text-muted)]">
              A campus LMS for Gat Andres Bonifacio High School, shaped around student learning,
              teacher delivery, and day-to-day school operations.
            </p>
          </div>

          <div>
            <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-[color:var(--teacher-accent)]`}>
              System direction
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[color:var(--landing-ink-soft)]">
              <li>Unified access for students, teachers, and administrators.</li>
              <li>Role-aware workflows for lessons, assessments, and reporting.</li>
              <li>One product language from landing page to dashboard.</li>
            </ul>
          </div>

          <div>
            <p className={`${ibmPlexMono.className} text-[0.68rem] uppercase tracking-[0.26em] text-[color:var(--teacher-accent)]`}>
              Reach out
            </p>
            <div className="mt-5 space-y-4 text-sm text-[color:var(--landing-ink-soft)]">
              <a
                href="https://maps.google.com/?q=Bonifacio%2C%20Taguig%20City%2C%20Philippines"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 transition-colors hover:text-[color:var(--teacher-accent)]"
              >
                <MapPin className="mt-0.5 h-4 w-4 text-[var(--teacher-accent)]" />
                <span>Bonifacio, Taguig City, Philippines</span>
              </a>
              <a
                href="tel:+88087543"
                className="flex items-center gap-3 transition-colors hover:text-[color:var(--teacher-accent)]"
              >
                <Phone className="h-4 w-4 text-[var(--teacher-accent)]" />
                <span>+8808-75-43</span>
              </a>
              <a
                href="mailto:sdotapat.gabhs@deped.gov.ph"
                className="flex items-center gap-3 transition-colors hover:text-[color:var(--teacher-accent)]"
              >
                <Mail className="h-4 w-4 text-[var(--teacher-accent)]" />
                <span>sdotapat.gabhs@deped.gov.ph</span>
              </a>
              <div className="flex items-center gap-3 text-[color:var(--landing-text-muted)]">
                <Clock3 className="h-4 w-4 text-[var(--teacher-accent)]" />
                <span>Mon - Fri, 8:00 AM - 5:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-[color:rgba(239,68,68,0.08)] pt-6 text-xs text-[color:var(--landing-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 Gat Andres Bonifacio High School.</p>
          <p className={`${ibmPlexMono.className} uppercase tracking-[0.22em] text-[color:var(--teacher-accent)]`}>
            Nexora / digital campus interface
          </p>
        </div>
      </footer>
    </div>
  );
}
