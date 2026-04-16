"use client";

import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import { LoginForm } from '@/components/auth/LoginForm';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

// --- Framer Motion Configs ---
const container: Variants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
  },
};

const card: Variants = {
  hidden: { y: 20, opacity: 0, scale: 0.98 },
  show: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 25 } 
  },
};

const floatingIcon: Variants = {
  initial: { y: 0 },
  animate: { 
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
  }
};

export default function AnimatedLoginWrapper() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50">
      {/* --- BACKGROUND DECOR --- */}
      <div className="absolute inset-0 z-0">
        {/* Modern Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Action Red Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* --- LOGO / TOP BRANDING --- */}
        <motion.div variants={card} className="flex flex-col items-center mb-8">
          <motion.div 
            variants={floatingIcon}
            initial="initial"
            animate="animate"
            className="relative mb-6"
          >
            <div className="absolute -inset-4 bg-red-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative h-20 w-20 rounded-[2rem] bg-white border-[1.5px] border-slate-200 shadow-2xl flex items-center justify-center overflow-hidden">
               <Image src="/taguigpic.png" alt="GABHS" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-red-500 rounded-xl border-4 border-slate-50 flex items-center justify-center shadow-lg">
               <Zap className="h-3 w-3 text-white fill-current" />
            </div>
          </motion.div>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              <Sparkles className="h-3 w-3 text-red-500" /> Nexora Portal
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 pt-2">
              Welcome Back
            </h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">
              Access student & faculty services
            </p>
          </div>
        </motion.div>

        {/* --- LOGIN CARD --- */}
        <motion.div
          variants={card}
          className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-[1.5px] border-slate-200 p-8 md:p-10 relative overflow-hidden"
        >
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
          
          <LoginForm />

          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col items-center gap-4">
             <div className="flex items-center gap-4 text-slate-300">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure AES-256 Encryption</span>
             </div>
          </div>
        </motion.div>


      </motion.div>
    </div>
  );
}
