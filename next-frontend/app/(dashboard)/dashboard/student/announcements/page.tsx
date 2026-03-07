'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
  Pin, 
  Sparkles, 
  Inbox, 
  Calendar, 
  User2 
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

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

interface AnnouncementWithClass extends Announcement {
  className: string;
  subjectCode: string;
}

/**
 * Local Empty State to prevent import errors
 */
function LocalEmptyState() {
  return (
    <motion.div 
      variants={fItem} 
      className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/30 p-16 text-center"
    >
      <div className="rounded-3xl bg-white p-6 shadow-sm mb-6 text-slate-300">
        <Inbox className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-black text-slate-900">All caught up!</h3>
      <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm leading-relaxed">
        No announcements have been posted for your classes yet. Check back later for updates.
      </p>
    </motion.div>
  );
}

export default function StudentAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const classesRes = await classService.getByStudent(user.id);
      const classes: ClassItem[] = classesRes.data || [];

      const results = await Promise.all(
        classes.map(async (cls) => {
          try {
            const res = await announcementService.getByClass(cls.id);
            const items: Announcement[] = Array.isArray(res.data) ? res.data : [];
            return items.map((ann) => ({
              ...ann,
              className: `${cls.subjectName}`,
              subjectCode: cls.subjectCode,
            }));
          } catch {
            return [];
          }
        }),
      );

      const all: AnnouncementWithClass[] = results.flat().sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });

      setAnnouncements(all);
    } catch {
      /* fail silently */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-8">
        <Skeleton className="h-32 w-full rounded-[1.5rem]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8 p-6 md:p-10"
      initial="hidden"
      animate="visible"
      variants={fContainer}
    >
      {/* --- HERO SECTION --- */}
      <motion.section 
        variants={fItem} 
        className="relative overflow-hidden rounded-[1.5rem] border-[1.5px] border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-32 h-full bg-red-500/5 -skew-x-12 translate-x-8" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
              <Sparkles className="h-3 w-3" /> Virtual Bulletin
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Announcements</h1>
            <p className="text-slate-500 text-sm font-medium">
              Important updates from all <span className="text-red-500 font-bold">{announcements.length}</span> class feeds.
            </p>
          </div>

          
        </div>
      </motion.section>

      {/* --- CONTENT LIST --- */}
      {announcements.length === 0 ? (
        <LocalEmptyState />
      ) : (
        <motion.div variants={fContainer} className="space-y-4">
          {announcements.map((ann) => (
            <motion.div 
              key={`${ann.classId}-${ann.id}`} 
              variants={fItem}
              whileHover={{ y: -2 }}
              className={`relative bg-white border-[1.5px] rounded-[1.5rem] p-6 transition-all duration-200 shadow-sm group ${
                ann.isPinned 
                  ? 'border-red-200 bg-red-50/10' 
                  : 'border-slate-200 hover:border-red-500'
              }`}
            >
              {ann.isPinned && (
                <div className="absolute top-4 right-6 flex items-center gap-1.5 px-3 py-1 bg-red-500 rounded-full">
                   <Pin className="h-3 w-3 text-white fill-current" />
                   <span className="text-[9px] font-black text-white uppercase tracking-tighter">Pinned</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-red-500 text-red-500 font-black text-[10px] px-2 py-0">
                    {ann.subjectCode}
                  </Badge>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                    {ann.className}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    }) : ''}
                  </span>
                </div>

                {/* Title & Content */}
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-red-500 transition-colors leading-tight">
                    {ann.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                </div>

                {/* Footer / Author */}
                {ann.author && (
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User2 className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                        Prof. {ann.author.firstName} {ann.author.lastName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}