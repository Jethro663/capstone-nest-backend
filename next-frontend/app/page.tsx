'use client';

import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  Globe
} from 'lucide-react';

// --- Framer Motion Configs ---
const fContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.15, delayChildren: 0.1 } 
  }
};

const fItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 260, damping: 20 } 
  }
};

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-red-100 selection:text-red-600">
      
      {/* --- STICKY HEADER --- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src="/taguigpic.png"
              alt="School Logo"
              className="w-16 h-16 rounded-2xl shadow-sm"
            />
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 leading-none tracking-tighter uppercase">
                Gat Andres Bonifacio
              </h1>
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">High School</p>
            </div>
          </div>
          <button 
            onClick={handleLogin}
            className="hidden md:flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            Access Portal <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      <motion.main 
        initial="hidden"
        animate="visible"
        variants={fContainer}
        className="flex-grow"
      >
        {/* --- HERO BANNER SECTION --- */}
        <div className="px-6 py-10 md:py-16">
          <motion.div 
            variants={fItem}
            className="max-w-7xl mx-auto relative h-[300 md:h-[400px]] rounded-[2.5rem] overflow-hidden shadow-2xl border-[1.5px] border-slate-200"
          >
            <img
              src="/NexoraHome.png"
              alt="Hero Banner"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 via-red-600/40 to-transparent flex items-center px-12">
              <div className="max-w-lg space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  <Sparkles className="h-3 w-3" /> Now Online
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter">
                  Welcome to <br /> Nexora
                </h2>
                <p className="text-white/90 text-sm md:text-lg font-medium leading-relaxed">
                  The primary gateway for GABHS academic systems and student services.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- INTERACTIVE CARD SECTION --- */}
        <section className="relative w-full h-[500px] flex items-center justify-center">
          {/* Background Layer */}
          <div className="absolute inset-0 z-0">
            <img
              src="/Gatbg.png"
              alt="Campus"
              className="w-full h-full object-cover grayscale brightness-50 opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
          </div>

          {/* Central Nexora Card */}
          <motion.div 
            variants={fItem}
            whileHover={{ y: -10 }}
            className="relative z-10 w-[90%] max-w-sm bg-white/95 backdrop-blur-xl rounded-[3rem] border-[1.5px] border-slate-200 p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] text-center space-y-6"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-200 mb-2">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Nexora</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full">
                Service Portal
              </p>
            </div>
            
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              Login to access your academic profile, view grades, and manage school requirements anytime, anywhere.
            </p>

            <button
              onClick={handleLogin}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:shadow-xl hover:shadow-red-200 transition-all active:scale-95"
            >
              Enter Portal
            </button>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Available for Students & Faculty
            </p>
          </motion.div>
        </section>
      </motion.main>

      {/* --- MODERN FOOTER --- */}
      <footer className="bg-slate-900 text-white pt-20 pb-10 px-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
          {/* Brand Col */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src="/taguigpic.png" alt="Footer Logo" className="w-12 h-12 rounded-xl" />
              <div>
                <h3 className="text-sm font-black tracking-tighter uppercase">Gat Andres Bonifacio</h3>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">High School</p>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-medium max-w-xs">
              Molding the future leaders of Taguig through quality education and technological innovation.
            </p>
          </div>

          {/* About Col */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-red-500">About Nexora</h4>
            <p className="text-slate-300 text-xs leading-loose font-medium opacity-80">
              Nexora is a comprehensive suite of online tools designed to modernize the GABHS experience, providing seamless access to school information.
            </p>
            <div className="flex items-center gap-4">
               <Globe className="h-4 w-4 text-slate-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official School System</span>
            </div>
          </div>

          {/* Contact Col */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Reach Out</h4>
            <ul className="space-y-4 text-xs font-medium text-slate-300">
              <li className="flex items-center gap-3 group">
                <MapPin className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span>Bonifacio, Taguig City, Philippines</span>
              </li>
              <li className="flex items-center gap-3 group">
                <Phone className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span>+8808-75-43</span>
              </li>
              <li className="flex items-center gap-3 group">
                <Mail className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span>sdotapat.gabhs@deped.gov.ph</span>
              </li>
              <li className="flex items-center gap-3 group">
                <Clock className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="uppercase tracking-tighter">Mon - Fri • 8:00 AM - 5:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <p>© 2026 GABHS • All Rights Reserved</p>
          <div className="flex gap-8">
            <span className="hover:text-red-500 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-red-500 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}