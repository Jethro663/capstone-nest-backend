"use client";

import { motion } from 'framer-motion';
import { LoginForm } from '@/components/auth/LoginForm';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const card = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 180, damping: 18 } },
};

export default function AnimatedLoginWrapper() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 py-16"
    >
      <motion.div
        variants={card}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/taguigpic.png" alt="GABHS" className="w-16 h-16 rounded-md mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Sign in to Nexora</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">Access student, faculty and staff services</p>
        </div>

        <motion.div variants={card}>
          <LoginForm />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
