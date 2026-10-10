/**
 * DevScope Public Landing Page
 * Route: / (public — no auth required)
 *
 * Sections:
 *   1. LandingNavbar (smart auth-aware, defined in LandingNavbar.tsx)
 *   2. Hero
 *   3. Product preview (mock stats cards + heatmap)
 *   4. Features grid
 *   5. How it works
 *   6. Student section
 *   7. Faculty section
 *   8. Final CTA
 *   9. Footer
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LandingNavbar } from './LandingNavbar'
import {
  GitBranch, GitCommit, Flame, BarChart2,
  BookOpen, CheckCircle2, ArrowRight, Activity,
  ClipboardList, TrendingUp, Eye, GitMerge,
} from 'lucide-react'

// ─── Shared primitives ────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary-bright">
      <span className="w-3 h-px bg-primary-bright" />
      {children}
      <span className="w-3 h-px bg-primary-bright" />
    </span>
  )
}

function Divider() {
  return <div className="w-full h-px bg-border" />
}

// ─── Hero ─────────────────────────────────────────────────

const MOCK_COMMITS = [
  { sha: 'a83f9c2', msg: 'Add claim validation and duplicate guard', time: '14:26', branch: 'main' },
  { sha: '2c19a1f', msg: 'Fix document index and improve search',    time: '13:11', branch: 'main' },
  { sha: 'e4d71b9', msg: 'PR #18 merged — claim workflow tests',     time: '12:44', branch: 'feat/claims' },
  { sha: '9a3bc55', msg: 'Issue #24 — document storage policy',     time: '11:42', branch: 'main' },
]

// Mini SVG heatmap for hero decoration
function MiniHeatmap() {
  const levels = [
    [0,0,1,1,2,3,2,1,0,0,1,2,3],
    [0,1,2,3,4,3,2,1,1,2,3,4,3],
    [1,2,3,2,3,4,4,3,2,3,4,4,4],
    [0,1,2,1,2,3,2,2,1,2,3,3,2],
    [0,0,1,2,1,2,1,1,0,1,2,2,1],
    [0,0,0,1,0,1,1,0,0,0,1,1,0],
    [0,0,0,0,0,1,0,0,0,0,1,0,0],
  ]
  const colors = ['#212121', '#0a3d40', '#0D7377', '#10a0a6', '#14FFEC']
  return (
    <div className="flex gap-1">
      {levels[0].map((_, col) => (
        <div key={col} className="flex flex-col gap-1">
          {levels.map((row, r) => (
            <div
              key={r}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: colors[row[col]] }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function HeroActivityCard() {
  return (
    <div
      className="w-full max-w-[420px] rounded-xl border border-border overflow-hidden shadow-2xl"
      style={{ background: '#181818' }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary-dim border border-primary-dim-border flex items-center justify-center">
            <Activity size={13} className="text-primary-bright" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary">Student Activity</p>
            <p className="text-[11px] text-text-muted">Aarav Patel · SE26B001</p>
          </div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-success-bg border border-success-bright/20 text-success-bright">
          On track
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: 'Today', value: '4 commits' },
          { label: 'Streak', value: '24 days' },
          { label: 'PRs open', value: '2 / 3' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3 text-center">
            <p className="text-lg font-semibold text-primary-bright tabular-nums">{s.value}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <p className="text-[11px] text-text-muted">Contribution activity · last 13 weeks</p>
        <MiniHeatmap />
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>Less</span>
          {['#212121','#0a3d40','#0D7377','#10a0a6','#14FFEC'].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recent commits */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-text-muted mb-2">Recent commits</p>
        {MOCK_COMMITS.slice(0, 3).map(c => (
          <div key={c.sha} className="flex gap-2 items-start py-1.5 border-b border-border/50 last:border-0">
            <GitCommit size={12} className="text-text-muted mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary truncate">{c.msg}</p>
              <p className="text-[10px] font-mono text-text-muted">{c.sha} · {c.branch} · {c.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 px-6 overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#14FFEC 1px, transparent 1px), linear-gradient(to right, #14FFEC 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(13,115,119,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left — text */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary-dim text-xs text-primary-bright">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-bright animate-pulse" />
              Now in early access
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-semibold text-text-primary leading-[1.12] tracking-tight">
              Developer progress.<br />
              <span className="text-primary-bright">Measured by evidence.</span>
            </h1>

            <p className="text-base text-text-secondary leading-relaxed max-w-[520px] mx-auto lg:mx-0">
              DevScope connects academic project management with real GitHub development
              activity — giving students visibility into their own progress, and faculty
              the evidence-based insights they need.
            </p>

            <div className="flex items-center gap-3 justify-center lg:justify-start flex-wrap">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
              >
                Get started free
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:border-border-strong hover:text-text-primary transition-colors"
              >
                Sign in
              </Link>
            </div>

            <div className="flex items-center gap-5 text-xs text-text-muted justify-center lg:justify-start flex-wrap pt-2">
              {['No credit card required', 'Free for students', 'Invite faculty anytime'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-primary" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — activity card */}
          <div className="flex-shrink-0 flex justify-center">
            <HeroActivityCard />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Product preview section ──────────────────────────────

const PREVIEW_STATS = [
  { label: 'GitHub Activity',     value: '246',    sub: 'contributions',    color: 'text-primary-bright' },
  { label: 'Dev Streak',          value: '12',     sub: 'consecutive days', color: 'text-warning' },
  { label: 'Active Projects',     value: '4',      sub: 'repositories',     color: 'text-success-bright' },
  { label: 'Assignments',         value: '8 / 10', sub: 'submitted',        color: 'text-indigo' },
]

function ProductPreview() {
  return (
    <section className="py-20 px-6 bg-canvas-subtle border-y border-border">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <SectionLabel>Platform preview</SectionLabel>
          <h2 className="text-2xl font-semibold text-text-primary">Everything in one place</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            A unified view of student development activity, academic evidence, and project health.
          </p>
        </div>

        {/* Mock dashboard */}
        <div className="rounded-xl border border-border overflow-hidden bg-canvas shadow-xl">
          {/* Mock top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-canvas-subtle">
            <div className="flex items-center gap-3">
              <div className="size-6 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-[9px]">DS</span>
              </div>
              <span className="text-xs font-semibold text-text-primary">DevScope</span>
              <span className="text-xs text-text-muted">/</span>
              <span className="text-xs text-text-muted">Student Development Overview</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded bg-surface-raised" />
              <div className="size-6 rounded-full bg-primary/20 border border-primary/30" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border">
            {PREVIEW_STATS.map(s => (
              <div key={s.label} className="px-5 py-4">
                <p className="text-[11px] text-text-muted">{s.label}</p>
                <p className={cn('text-2xl font-semibold tabular-nums mt-1', s.color)}>{s.value}</p>
                <p className="text-[11px] text-text-muted">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Content row */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-border">
            {/* Heatmap panel */}
            <div className="md:col-span-2 p-5 space-y-3 border-b md:border-b-0 border-border">
              <p className="text-xs font-semibold text-text-primary">Contribution activity · last 13 weeks</p>
              <div className="scale-110 origin-left">
                <MiniHeatmap />
              </div>
              <p className="text-[11px] text-text-muted">Based on eligible commits, PRs and issues across connected repositories.</p>
            </div>

            {/* Recent commits */}
            <div className="p-5 space-y-2">
              <p className="text-xs font-semibold text-text-primary">Recent commits</p>
              {MOCK_COMMITS.map(c => (
                <div key={c.sha} className="py-1.5 border-b border-border/50 last:border-0">
                  <p className="text-xs text-text-primary truncate">{c.msg}</p>
                  <p className="text-[10px] font-mono text-text-muted mt-0.5">{c.sha} · {c.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features section ─────────────────────────────────────

const FEATURES = [
  {
    icon: GitBranch,
    title: 'GitHub Activity Tracking',
    desc: 'Track meaningful commits, pull requests, issues and development contributions across approved repositories.',
  },
  {
    icon: BarChart2,
    title: 'Development Analytics',
    desc: 'Convert raw development activity into understandable progress indicators that mean something to both students and faculty.',
  },
  {
    icon: BookOpen,
    title: 'Project Tracking',
    desc: 'Connect GitHub repositories with academic projects and assignments. See which work maps to which deliverable.',
  },
  {
    icon: Flame,
    title: 'Development Streaks',
    desc: 'Encourage consistent development habits with streak tracking. Good code takes time — this rewards sustained effort.',
  },
  {
    icon: Eye,
    title: 'Faculty Review',
    desc: 'Let faculty inspect actual development evidence — not just submission documents — before grading.',
  },
  {
    icon: Activity,
    title: 'Contribution Heatmaps',
    desc: 'Visualize when students are actively developing. Identify patterns, consistency, and bursts of activity.',
  },
  {
    icon: ClipboardList,
    title: 'Academic Evidence',
    desc: 'Structured evidence per rubric criterion. Students attach commits, PRs and issues to specific assignment criteria.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    desc: 'Students see their own trajectory — streaks, milestones, accepted deliverables — in a personal workspace.',
  },
]

function FeaturesSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-2xl font-semibold text-text-primary">Built for the way developers actually work</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            No vanity metrics. No gamification. Just meaningful data about real development activity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-canvas p-5 space-y-3 hover:bg-canvas-subtle transition-colors">
              <div className="size-9 rounded-lg bg-primary-dim border border-primary-dim-border flex items-center justify-center">
                <f.icon size={16} className="text-primary-bright" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{f.title}</p>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Create your DevScope account',     desc: 'Sign up as a student or faculty member. Students get immediate access; faculty accounts are linked to institution batches.' },
  { n: '02', title: 'Connect your GitHub profile',       desc: 'Authorize DevScope to observe activity in your academic repositories. Only approved repos are included.' },
  { n: '03', title: 'Join your institution batch',       desc: 'Your faculty or admin links you to the correct academic year, division and section.' },
  { n: '04', title: 'Add or connect projects',           desc: 'Link your GitHub repositories to academic projects. DevScope begins tracking eligible activity immediately.' },
  { n: '05', title: 'DevScope analyzes your activity',   desc: 'Commits, PRs and issues are classified, deduplicated, and mapped to academic deliverables.' },
  { n: '06', title: 'Track progress or review evidence', desc: 'Students monitor their streak and submissions. Faculty inspect development evidence before grading.' },
]

function HowItWorksSection() {
  return (
    <section className="py-20 px-6 bg-canvas-subtle border-y border-border">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-2xl font-semibold text-text-primary">From zero to evidence in six steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-canvas-subtle p-6 space-y-3">
              <span className="font-mono text-xs font-semibold text-primary-bright">{s.n}</span>
              <p className="text-sm font-semibold text-text-primary">{s.title}</p>
              <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Student section ──────────────────────────────────────

const STUDENT_BENEFITS = [
  'Connect GitHub repositories to academic projects',
  'Monitor commits, PRs, and issues across approved repos',
  'Maintain and visualize your development streak',
  'Track assignment submissions and revision requests',
  'Attach evidence to specific rubric criteria',
  'Understand your own development consistency over time',
  'Build a portfolio of technical work evidence',
  'See exactly what your faculty can see',
]

function StudentSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <SectionLabel>For students</SectionLabel>
            <h2 className="text-3xl font-semibold text-text-primary leading-tight">
              Built for students<br />
              <span className="text-primary-bright">who build.</span>
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              DevScope gives you a clear view of your own development journey. Stop guessing
              whether you're doing enough — see the evidence, track your streak, and understand
              what it means to develop consistently.
            </p>

            <ul className="space-y-2.5">
              {STUDENT_BENEFITS.map(b => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>

            <Link
              to="/signup?role=student"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
            >
              Create student account
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mock student workspace card */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-text-primary">My Workspace</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-success-bg border border-success-bright/20 text-success-bright">On track</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              {[
                { l: 'Current streak', v: '24 days', c: 'text-warning' },
                { l: 'Commits today', v: '4', c: 'text-primary-bright' },
                { l: 'Deliverables', v: '2 / 4', c: 'text-indigo' },
                { l: 'Next milestone', v: '1 day', c: 'text-warning' },
              ].map(s => (
                <div key={s.l} className="px-4 py-4">
                  <p className="text-[11px] text-text-muted">{s.l}</p>
                  <p className={cn('text-xl font-semibold tabular-nums mt-1', s.c)}>{s.v}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border space-y-1.5">
              <p className="text-[11px] text-text-muted mb-2">Active project</p>
              {['Campus Lost & Found — claim workflow', 'Secure Document Vault — final review'].map(p => (
                <div key={p} className="flex items-center gap-2 text-xs text-text-secondary">
                  <GitMerge size={11} className="text-primary shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Faculty section ──────────────────────────────────────

const FACULTY_BENEFITS = [
  'Monitor student development activity across batches',
  'Review GitHub contributions before grading',
  'Manage academic batches, divisions and semesters',
  'Create and track assignments with rubric criteria',
  'Inspect evidence attached to rubric criteria',
  'Detect inactive students with attention queue',
  'Understand development consistency per student',
  'Distinguish academic problems from data problems',
]

function FacultySection() {
  return (
    <section className="py-20 px-6 bg-canvas-subtle border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Mock faculty dashboard card (shown first on mobile, second on desktop) */}
          <div className="order-2 lg:order-1 rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold text-text-primary">Faculty Dashboard · SE-E-B</p>
              <span className="text-[11px] text-text-muted">60 students</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { l: 'Active today',     v: '34', c: 'text-success-bright' },
                { l: 'On streak',        v: '28', c: 'text-primary-bright' },
                { l: 'Need attention',   v: '11', c: 'text-warning' },
              ].map(s => (
                <div key={s.l} className="px-3 py-3 text-center">
                  <p className={cn('text-2xl font-semibold tabular-nums', s.c)}>{s.v}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 space-y-2 border-b border-border">
              <p className="text-[11px] text-text-muted font-medium">Needs attention</p>
              {[
                { label: 'Overdue work',        count: '3', c: 'text-warning' },
                { label: 'Changes requested',   count: '2', c: 'text-warning' },
                { label: 'GitHub not connected',count: '1', c: 'text-danger-soft' },
              ].map(a => (
                <div key={a.label} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{a.label}</span>
                  <span className={cn('font-semibold tabular-nums', a.c)}>{a.count}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] text-text-muted mb-1.5">Review next</p>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-text-primary font-medium">Claim workflow & tests</p>
                  <p className="text-text-muted">Aarav Patel · Due 08 Oct</p>
                </div>
                <span className="text-primary-bright text-[11px]">Inspect →</span>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2 space-y-6">
            <SectionLabel>For faculty</SectionLabel>
            <h2 className="text-3xl font-semibold text-text-primary leading-tight">
              Evidence-based<br />
              <span className="text-primary-bright">academic review.</span>
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Grade with confidence. DevScope shows you what students actually did —
              commit by commit — so your assessment is grounded in real development
              evidence, not just a submitted document.
            </p>

            <ul className="space-y-2.5">
              {FACULTY_BENEFITS.map(b => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <Link
                to="/signup?role=faculty"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
              >
                Request faculty access
                <ArrowRight size={14} />
              </Link>
              <p className="text-xs text-text-muted">
                Faculty accounts are linked to institution batches by an admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-20 px-6 border-t border-border relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(13,115,119,0.08) 0%, transparent 65%)' }}
      />
      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <SectionLabel>Get started</SectionLabel>
        <h2 className="text-3xl sm:text-4xl font-semibold text-text-primary leading-snug">
          Understand development.<br />
          <span className="text-primary-bright">Not just submissions.</span>
        </h2>
        <p className="text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
          Start using DevScope to connect academic progress with real development activity.
          Free for students. Built for the institutions that take engineering seriously.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
          >
            Get Started
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-text-secondary border border-border hover:border-border-strong hover:text-text-primary transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-canvas-subtle px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xs">DS</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary leading-tight">DevScope</p>
                <p className="text-[10px] text-text-muted leading-tight">Student Dev Platform</p>
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Evidence-first academic development tracking for engineering institutions.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">Product</p>
            <ul className="space-y-2 text-xs text-text-muted">
              {['Features', 'How it works', 'For students', 'For faculty'].map(l => (
                <li key={l}><a href="#" className="hover:text-text-secondary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">Account</p>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><Link to="/signup" className="hover:text-text-secondary transition-colors">Get Started</Link></li>
              <li><Link to="/login" className="hover:text-text-secondary transition-colors">Sign in</Link></li>
              <li><Link to="/forgot-password" className="hover:text-text-secondary transition-colors">Reset password</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wide">Legal</p>
            <ul className="space-y-2 text-xs text-text-muted">
              {['Privacy Policy', 'Terms of Service'].map(l => (
                <li key={l}><a href="#" className="hover:text-text-secondary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <Divider />

        <div className="flex items-center justify-between flex-wrap gap-3 mt-6 text-xs text-text-muted">
          <span>© 2026 DevScope. All rights reserved.</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-text-secondary transition-colors"
          >
            <GitBranch size={13} />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

// ─── Main export ──────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-normal">
      <LandingNavbar />
      <HeroSection />
      <ProductPreview />
      <FeaturesSection />
      <HowItWorksSection />
      <StudentSection />
      <FacultySection />
      <CtaSection />
      <Footer />
    </div>
  )
}
