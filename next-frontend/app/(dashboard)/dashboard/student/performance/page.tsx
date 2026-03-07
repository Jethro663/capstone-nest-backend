'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, Variants } from 'framer-motion';
import { AlertTriangle, BarChart3, Sparkles, Target, Inbox } from 'lucide-react';
import { performanceService } from '@/services/performance-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentStatCard,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import type { StudentOwnClassPerformance, StudentOwnPerformanceSummary } from '@/types/performance';

// --- Framer Motion Configs ---
const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.08, delayChildren: 0.1 } 
  }
};

const fItem: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  }
};

// --- Helpers ---
function toPercent(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Custom Local Empty State to avoid import errors
 */
function LocalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <motion.div 
      variants={fItem} 
      className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/30 p-16 text-center"
    >
      <div className="rounded-3xl bg-white p-6 shadow-sm mb-6 text-slate-300">
        <Inbox className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

export default function StudentPerformancePage() {
  const [summary, setSummary] = useState<StudentOwnPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await performanceService.getStudentOwnSummary();
      setSummary(response.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <Skeleton className="h-32 w-full rounded-[1.5rem]" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem]" />
      </div>
    );
  }

  const classes = summary?.classes ?? [];
  const threshold = summary?.threshold ?? 74;

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8 p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={fContainer}
    >
      {/* --- COMPACT HERO SECTION --- */}
      <motion.section 
        variants={fItem} 
        className="relative overflow-hidden rounded-[1.5rem] border-[1.5px] border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-32 h-full bg-red-500/5 -skew-x-12 translate-x-8" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
              <Sparkles className="h-3 w-3" /> Performance Insights
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Academic Standing</h1>
            <p className="text-slate-500 text-sm font-medium">
              Maintain a score above <span className="text-red-500 font-bold">{threshold}%</span> to stay on track.
            </p>
          </div>

          {/* Average Box */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-3 border border-slate-200 shadow-sm min-w-[220px]">
            <div className="text-center flex-1">
              <p className="text-[9px] uppercase font-black tracking-tighter text-slate-400">Blended Avg</p>
              <p className="text-xl font-black text-slate-900">
                {toPercent(summary?.overall.averageBlendedScore ?? null)}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="text-center flex-1">
              <p className="text-[9px] uppercase font-black tracking-tighter text-slate-400">Risk Status</p>
              <p className={`text-xl font-black ${(summary?.overall.atRiskClasses ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {summary?.overall.atRiskClasses === 0 ? 'Clear' : `${summary?.overall.atRiskClasses} At Risk`}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* --- STATS GRID --- */}
      <motion.div variants={fContainer} className="grid gap-6 md:grid-cols-3">
        <motion.div variants={fItem} whileHover={{ y: -5 }}>
          <StudentStatCard
            label="Enrolled Classes"
            value={summary?.overall.totalClasses ?? 0}
            accent="bg-slate-900"
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={fItem} whileHover={{ y: -5 }}>
          <StudentStatCard
            label="Graded Courses"
            value={summary?.overall.classesWithData ?? 0}
            accent="bg-red-500"
            icon={<Target className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={fItem} whileHover={{ y: -5 }}>
          <StudentStatCard
            label="Risk Alerts"
            value={summary?.overall.atRiskClasses ?? 0}
            accent={(summary?.overall.atRiskClasses ?? 0) > 0 ? "bg-red-600" : "bg-slate-200"}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </motion.div>
      </motion.div>

      {/* --- PERFORMANCE LIST --- */}
      <motion.section variants={fItem} className="space-y-6">
        <div className="flex items-center justify-between border-b-[1.5px] border-slate-200 pb-3">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Subject Breakdown</h2>
          <Badge variant="outline" className="border-slate-200 text-[10px] font-black uppercase text-slate-400">
            Threshold: {threshold}%
          </Badge>
        </div>

        {classes.length === 0 ? (
          <LocalEmptyState 
            title="No performance data yet"
            description="Your assessments haven't been graded yet. Once your teacher enters scores, your analytics will appear here."
          />
        ) : (
          <motion.div variants={fContainer} className="space-y-4">
            {classes.map((entry) => (
              <motion.div 
                key={entry.classId} 
                variants={fItem}
                whileHover={{ x: 6 }}
                className="bg-white border-[1.5px] border-slate-200 rounded-[1.5rem] p-6 transition-all duration-200 hover:border-red-500 group shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-red-500 transition-colors">
                        {entry.class?.subjectName || entry.classId}
                      </h3>
                      <StudentStatusChip tone={entry.isAtRisk ? 'danger' : 'info'}>
                        {entry.isAtRisk ? 'AT RISK' : 'STABLE'}
                      </StudentStatusChip>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                      {entry.class?.section?.name || 'Academic Section'} • Grade {entry.class?.section?.gradeLevel || '-'}
                    </p>
                  </div>

                  {/* Individual Scores Grid */}
                  <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
                    <div className="text-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Assessment</p>
                      <p className="text-sm font-black text-slate-900">{toPercent(entry.assessmentAverage)}</p>
                    </div>
                    <div className="text-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Record</p>
                      <p className="text-sm font-black text-slate-900">{toPercent(entry.classRecordAverage)}</p>
                    </div>
                    <div className="text-center px-4 py-3 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Blended</p>
                      <p className="text-sm font-black text-red-600">{toPercent(entry.blendedScore)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                     Last Sync: {formatDateTime(entry.lastComputedAt)}
                   </p>
                   {entry.isAtRisk && (
                     <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 rounded-full animate-pulse">
                        <AlertTriangle className="h-3 w-3 text-white" />
                        <span className="text-[9px] font-black text-white uppercase">Urgent Review</span>
                     </div>
                   )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
}