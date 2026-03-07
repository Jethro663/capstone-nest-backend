'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { GraduationCap, BookOpen, ClipboardCheck, Sparkles, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  StudentStatCard,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { Assessment } from '@/types/assessment';
import { getDescription, getTeacherName } from '@/utils/helpers';

// --- Framer Motion Animation Configs ---
const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  }
};

const fItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  }
};

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const classRes = await classService.getByStudent(user.id);
      const enrolledClasses = classRes.data || [];
      setClasses(enrolledClasses);

      const [lessonResults, assessmentResults] = await Promise.all([
        Promise.all(enrolledClasses.slice(0, 8).map((c) => lessonService.getByClass(c.id).catch(() => ({ data: [] as Lesson[] })))),
        Promise.all(enrolledClasses.slice(0, 8).map((c) => assessmentService.getByClass(c.id).catch(() => ({ data: [] as Assessment[] })))),
      ]);

      setLessons(lessonResults.flatMap((r) => r.data || []));
      setAssessments(assessmentResults.flatMap((r) => r.data || []));
    } catch { /* silent fail */ } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const profileIncomplete = !user?.firstName || !user?.lastName;
  const publishedAssessments = assessments.filter((a) => a.isPublished);
  
  // Progress Logic
  const completionRate = lessons.length > 0 
    ? Math.min(100, Math.round((classes.length / Math.max(1, lessons.length)) * 100)) 
    : 0;

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
              <Sparkles className="h-3 w-3" /> Learning Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Hello, <span className="text-red-500">{user?.firstName || 'Student'}</span>.
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              You have <span className="text-slate-900 font-bold border-b-2 border-red-500">{publishedAssessments.length} pending tasks</span> to finalize.
            </p>
          </div>

          {/* Compact Progress Box */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-3 border border-slate-200 shadow-sm min-w-[220px]">
            <div className="text-center flex-1">
              <p className="text-[9px] uppercase font-black tracking-tighter text-slate-400">Profile</p>
              <p className="text-xl font-black text-slate-900">{profileIncomplete ? '70%' : '100%'}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="text-center flex-1">
              <p className="text-[9px] uppercase font-black tracking-tighter text-slate-400">Progress</p>
              <p className="text-xl font-black text-red-500">{completionRate}%</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* --- STATS GRID --- */}
      <motion.div variants={fContainer} className="grid gap-6 md:grid-cols-3">
        {[
          { label: "My Classes", val: classes.length, icon: <GraduationCap />, color: "bg-slate-900" },
          { label: "Lessons", val: lessons.length, icon: <BookOpen />, color: "bg-red-500" },
          { label: "Assessments", val: publishedAssessments.length, icon: <ClipboardCheck />, color: "bg-slate-900" }
        ].map((stat, i) => (
          <motion.div key={i} variants={fItem} whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
            <StudentStatCard 
              label={stat.label} 
              value={stat.val} 
              accent={stat.color} 
              icon={stat.icon} 
            />
          </motion.div>
        ))}
      </motion.div>

      {/* --- CLASSES SECTION --- */}
      <motion.section variants={fItem} className="space-y-6">
        <div className="flex items-center justify-between border-b-[1.5px] border-slate-200 pb-3">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Enrolled Classes</h2>
          <Button variant="ghost" className="text-red-500 font-bold hover:bg-red-50 text-xs">See All</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <motion.div key={cls.id} variants={fItem} whileHover={{ scale: 1.02 }}>
              <div className="bg-white border-[1.5px] border-slate-200 rounded-[1.5rem] p-6 transition-all duration-200 hover:border-red-500 group shadow-sm">
                <div className="space-y-4">
                  <Badge variant="outline" className="border-red-500 text-red-500 font-black text-[10px]">COURSE</Badge>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {cls.subjectName || cls.className || cls.name}
                  </h3>
                  <p className="text-slate-500 font-bold text-xs">
                    Teacher: {getTeacherName(cls.teacher)}
                  </p>
                  
                  {/* Visual Line (Replaces Separator) */}
                  <div className="h-[1px] w-full bg-slate-100 group-hover:bg-red-100 transition-colors" />

                  <Link href={`/dashboard/student/classes/${cls.id}`} className="block">
                    <Button variant="outline" className="w-full border-slate-200 font-bold group-hover:border-red-500 group-hover:text-red-500 transition-all flex justify-between h-9 text-xs">
                      Enter Class <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* --- TASKS GRID --- */}
      <div className="grid gap-8 lg:grid-cols-2">
         {/* Recent Lessons */}
         <motion.section variants={fItem} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="text-red-500 h-4 w-4" /> Recent Lessons
            </h2>
            <div className="space-y-3">
              {lessons.slice(0, 3).map((l) => (
                <motion.div key={l.id} whileHover={{ x: 5 }}>
                  <div className="bg-white border-[1.5px] border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-red-500 transition-all group shadow-sm">
                    <p className="font-bold text-slate-800 text-sm truncate">{l.title}</p>
                    <Link href={`/dashboard/student/lessons/${l.id}`}>
                      <ArrowRight className="text-slate-300 group-hover:text-red-500 transition-colors cursor-pointer h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
         </motion.section>

         {/* Pending Tasks */}
         <motion.section variants={fItem} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="text-red-500 h-4 w-4" /> Pending Tasks
            </h2>
            <div className="space-y-3">
              {publishedAssessments.slice(0, 3).map((a) => (
                <motion.div key={a.id} whileHover={{ scale: 1.01 }}>
                  <div className="bg-white border-[1.5px] border-slate-200 rounded-2xl p-5 hover:border-red-500 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <StudentStatusChip tone={a.type === 'exam' ? 'danger' : 'warning'}>
                        {a.type.toUpperCase()}
                      </StudentStatusChip>
                      <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'NO DATE'}
                      </span>
                    </div>
                    <p className="font-black text-slate-900 text-base mb-4 truncate">{a.title}</p>
                    <Link href={`/dashboard/student/assessments/${a.id}`}>
                      <Button className="w-full bg-slate-900 hover:bg-red-500 text-white font-black rounded-xl transition-all h-9 text-xs">
                        START
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
         </motion.section>
      </div>
    </motion.div>
  );
}