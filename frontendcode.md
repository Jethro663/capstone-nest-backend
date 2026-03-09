# PROJECT EXPORT
Generated: 2026-02-10 14:18:05
Source: C:\Users\Marc\Downloads\Capstone_Nest_Initial\capstone-nest-backend\frontend
Total Files: 84 | Total Lines: 19,596

## DETECTED STACK
- React

## PROJECT STRUCTURE
src/                     [80 files]

## ENTRY POINTS
- src\App.jsx

---
# CODE BEGINS BELOW
---

// ================================================================================
// FILE: package.json
// ================================================================================

{
      "name": "Design Nexora LMS Application (Copy)",
      "version": "0.1.0",
      "private": true,
      "dependencies": {
            "@radix-ui/react-accordion": "^1.2.3",
            "@radix-ui/react-alert-dialog": "^1.1.6",
            "@radix-ui/react-aspect-ratio": "^1.1.2",
            "@radix-ui/react-avatar": "^1.1.3",
            "@radix-ui/react-checkbox": "^1.1.4",
            "@radix-ui/react-collapsible": "^1.1.3",
            "@radix-ui/react-context-menu": "^2.2.6",
            "@radix-ui/react-dialog": "^1.1.15",
            "@radix-ui/react-dropdown-menu": "^2.1.6",
            "@radix-ui/react-hover-card": "^1.1.6",
            "@radix-ui/react-label": "^2.1.2",
            "@radix-ui/react-menubar": "^1.1.6",
            "@radix-ui/react-navigation-menu": "^1.2.5",
            "@radix-ui/react-popover": "^1.1.6",
            "@radix-ui/react-progress": "^1.1.2",
            "@radix-ui/react-radio-group": "^1.2.3",
            "@radix-ui/react-scroll-area": "^1.2.3",
            "@radix-ui/react-select": "^2.1.6",
            "@radix-ui/react-separator": "^1.1.2",
            "@radix-ui/react-slider": "^1.2.3",
            "@radix-ui/react-slot": "^1.1.2",
            "@radix-ui/react-switch": "^1.1.3",
            "@radix-ui/react-tabs": "^1.1.3",
            "@radix-ui/react-toggle": "^1.1.2",
            "@radix-ui/react-toggle-group": "^1.1.2",
            "@radix-ui/react-tooltip": "^1.1.8",
            "axios": "^1.13.4",
            "class-variance-authority": "^0.7.1",
            "clsx": "*",
            "cmdk": "^1.1.1",
            "embla-carousel-react": "^8.6.0",
            "framer-motion": "^12.33.0",
            "input-otp": "^1.4.2",
            "lucide-react": "^0.487.0",
            "next-themes": "^0.4.6",
            "react": "^18.3.1",
            "react-day-picker": "^8.10.1",
            "react-dom": "^18.3.1",
            "react-hook-form": "^7.55.0",
            "react-hot-toast": "^2.6.0",
            "react-resizable-panels": "^2.1.7",
            "react-router-dom": "^7.13.0",
            "recharts": "^2.15.2",
            "sonner": "^2.0.3",
            "tailwind-merge": "*",
            "vaul": "^1.1.2"
      },
      "devDependencies": {
            "@types/node": "^20.10.0",
            "@types/react": "^19.2.10",
            "@types/react-dom": "^19.2.3",
            "@vitejs/plugin-react": "^5.1.2",
            "@vitejs/plugin-react-swc": "^3.10.2",
            "vite": "7.1.11"
      },
      "scripts": {
            "dev": "vite",
            "build": "vite build"
      }
}



// ================================================================================
// FILE: src\App.jsx
// ================================================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from './components/SplashScreen';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { EmailVerificationPage } from './pages/auth/EmailVerificationPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import CoursesPage from './pages/student/CoursesPage';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import ClassesPage from './pages/teacher/ClassesPage';
import ClassDetailsPage from './pages/teacher/ClassDetailsPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import SubjectManagementPage from './pages/admin/SubjectManagementPage';
import SectionManagementPage from './pages/admin/SectionManagementPage';
import SectionRosterPage from './pages/admin/SectionRosterPage';
import TeacherSectionsPage from './pages/teacher/TeacherSectionsPage';
import ClassManagementPage from './pages/admin/ClassManagementPage';
import ProfilePage from './pages/student/ProfilePage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import profilesService from './services/profilesService';
import { Toaster } from './components/ui/sonner';

// ============================================================================
// HELPER: Check if a student profile has all required fields filled
// ============================================================================
function isProfileComplete(user, profile) {
    // Only students need profile completion — admins/teachers skip
    if (!user || user.roles?.includes('admin') || user.roles?.includes('teacher')) {
        return true;
    }

    const hasValue = (v) =>
        v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());

    // User-level required fields
    if (!hasValue(user.firstName) || !hasValue(user.lastName)) return false;

    // Profile-level required fields (fall back to user object for merged data)
    const fields = ['dateOfBirth', 'gender', 'phone', 'address', 'familyName', 'familyRelationship', 'familyContact'];
    for (const f of fields) {
        const v = f === 'dateOfBirth'
            ? (profile?.dateOfBirth ?? profile?.dob ?? user.dateOfBirth ?? user.dob)
            : (profile?.[f] ?? user[f]);
        if (!hasValue(v)) return false;
    }
    return true;
}

// ============================================================================
// PUBLIC (unauthenticated) PAGES
// ============================================================================
const PUBLIC_PAGES = ['splash', 'login', 'signup', 'emailVerification', 'forgotPassword'];

// ============================================================================
// LOADING SCREEN
// ============================================================================
function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#374151] to-[#dc2626]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-4 text-white text-lg">Loading...</p>
            </div>
        </div>
    );
}

// ============================================================================
// APP
// ============================================================================
function App() {
    const { user, logout, loading: authLoading } = useAuth();

    // ── Navigation state ──────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState('splash');
    const [selectedRole, setSelectedRole] = useState('student');
    const [tempEmail, setTempEmail] = useState('');
    const [selectedSection, setSelectedSection] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    // ── Startup readiness ─────────────────────────────────────────────
    // `appReady` stays false until auth is done AND profile check finishes.
    // While false, we show a loading spinner instead of any page.
    const [appReady, setAppReady] = useState(false);

    // Ref: track the identity we last ran the profile check for so we
    // don't re-run on every render but DO re-run when the user changes.
    const checkedIdentity = useRef(null);

    // ── Startup effect ────────────────────────────────────────────────
    // Runs when authLoading flips to false (auth finished) or user changes.
    //
    // Why this works cleanly now:
    //   AuthContext sets `user` exactly ONCE (with profile already merged).
    //   So this effect fires once after login and once after refresh —
    //   never the double-fire that caused the old "profile modal flash".
    useEffect(() => {
        // Still loading auth — wait
        if (authLoading) return;

        // ── Not logged in ──
        if (!user) {
            checkedIdentity.current = null;
            setAppReady(true);
            // Kick to splash only if currently on a protected page
            if (!PUBLIC_PAGES.includes(currentPage)) {
                setCurrentPage('splash');
            }
            return;
        }

        // ── Logged in — determine identity key ──
        const identity = user.userId || user.id || user.email;

        // Already checked this exact user — nothing to do
        if (checkedIdentity.current === identity) return;
        checkedIdentity.current = identity;

        // ── Run profile-completion check (async) ──
        let cancelled = false;

        (async () => {
            try {
                // AuthContext already merged the profile into `user`, but we
                // fetch again to be safe (catches edge cases where AuthContext
                // profile fetch failed silently).
                let profile = null;
                try {
                    const res = await profilesService.getMyProfile();
                    profile = res?.data !== undefined ? res.data : res;
                } catch {
                    // No profile exists yet — will be treated as incomplete for students
                }

                if (cancelled) return;

                if (!isProfileComplete(user, profile)) {
                    setCurrentPage('completeProfile');
                } else if (PUBLIC_PAGES.includes(currentPage)) {
                    // User is on a public page (splash/login/signup) — send to dashboard
                    setCurrentPage('dashboard');
                }
                // Otherwise keep them on whatever protected page they were on (e.g. courses after refresh)
            } catch (err) {
                console.error('[App] Profile check error:', err);
                // On error, just proceed to dashboard
                if (!cancelled && PUBLIC_PAGES.includes(currentPage)) {
                    setCurrentPage('dashboard');
                }
            } finally {
                if (!cancelled) setAppReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigation handlers ───────────────────────────────────────────
    const handleRoleSelection = (_role, action) => setCurrentPage(action);
    const handleNavigation = (page) => setCurrentPage(page);
    const handleProfileClick = () => setCurrentPage('profile');

    const handleViewSectionRoster = (section) => {
        setSelectedSection(section);
        setCurrentPage('section-roster');
    };

    const handleViewClassDetails = (classItem) => {
        setSelectedClass(classItem);
        setCurrentPage('class-details');
    };

    const handleSignUp = (data) => {
        setTempEmail(data.email || data.data?.user?.email);
        setCurrentPage('emailVerification');
    };

    const handleEmailVerification = () => {
        setTempEmail('');
        setCurrentPage('login');
    };

    const handlePasswordReset = () => setCurrentPage('login');

    const handleLogout = async () => {
        await logout();
        checkedIdentity.current = null;
        setAppReady(true);
        setCurrentPage('splash');
    };

    // ── Dashboard content by role & page ──────────────────────────────
    const renderDashboardContent = () => {
        if (!user) return null;
        const role = user.roles?.[0];

        switch (currentPage) {
            case 'dashboard':
                if (role === 'teacher') return <TeacherDashboard />;
                if (role === 'admin') return <AdminDashboard />;
                return <StudentDashboard />;

            case 'classes':
                if (role === 'admin') return <ClassManagementPage />;
                return <ClassesPage onViewClassDetails={handleViewClassDetails} />;

            case 'class-details':
                if (!selectedClass) { setCurrentPage('classes'); return null; }
                return <ClassDetailsPage classItem={selectedClass} onBack={() => setCurrentPage('classes')} />;

            case 'courses':
                return <CoursesPage />;

            case 'notifications':
                return <NotificationsPage />;

            case 'messages':
                return <MessagesPage />;

            case 'users':
                return <UserManagementPage />;

            case 'subjects':
                return <SubjectManagementPage />;

            case 'sections':
                if (role === 'admin') return <SectionManagementPage onViewRoster={handleViewSectionRoster} />;
                if (role === 'teacher') return <TeacherSectionsPage onViewRoster={handleViewSectionRoster} />;
                return <SectionManagementPage onViewRoster={handleViewSectionRoster} />;

            case 'section-roster':
                if (!selectedSection) { setCurrentPage('sections'); return null; }
                return <SectionRosterPage section={selectedSection} onBack={() => setCurrentPage('sections')} />;

            default:
                return (
                    <div className="p-6">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="mb-4 capitalize">{currentPage.replace('-', ' ')}</h1>
                            <div className="bg-white rounded-lg border p-8 text-center">
                                <p className="text-muted-foreground">
                                    This page is under development. Content for "{currentPage}" will be added here.
                                </p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    // ── Reusable layout wrapper for any protected page ────────────────
    const renderProtected = (page, children) => {
        if (!user) { setCurrentPage('splash'); return null; }
        return (
            <DashboardLayout
                role={user.roles?.[0] || 'student'}
                userName={`${user.firstName || ''} ${user.lastName || user.email}`}
                currentPage={page}
                onNavigate={handleNavigation}
                onProfile={handleProfileClick}
                onNotifications={() => setCurrentPage('notifications')}
                onMessages={() => setCurrentPage('messages')}
            >
                {children}
            </DashboardLayout>
        );
    };

    // ── Page router ───────────────────────────────────────────────────
    const renderPage = () => {
        // Show loading spinner until auth + profile check complete
        if (authLoading || !appReady) return <LoadingScreen />;

        switch (currentPage) {
            // ── Public pages ──
            case 'splash':
                return <SplashScreen onSelectRole={handleRoleSelection} />;

            case 'login':
                return (
                    <LoginPage
                        role={selectedRole}
                        onBack={() => setCurrentPage('splash')}
                        onForgotPassword={() => setCurrentPage('forgotPassword')}
                        onSignUp={() => setCurrentPage('signup')}
                        onUnverified={(email) => { setTempEmail(email); setCurrentPage('emailVerification'); }}
                    />
                );

            case 'signup':
                return (
                    <SignUpPage
                        role={selectedRole}
                        onBack={() => setCurrentPage('splash')}
                        onLogin={() => setCurrentPage('login')}
                        onSignupSuccess={handleSignUp}
                    />
                );

            case 'emailVerification':
                return (
                    <EmailVerificationPage
                        email={tempEmail}
                        onBack={() => setCurrentPage('login')}
                        onVerify={handleEmailVerification}
                    />
                );

            case 'forgotPassword':
                return (
                    <ForgotPasswordPage
                        onBack={() => setCurrentPage('login')}
                        onReset={handlePasswordReset}
                    />
                );

            // ── Protected pages ──
            case 'profile':
                return renderProtected('profile', <ProfilePage />);

            case 'completeProfile':
                return renderProtected('complete-profile',
                    <CompleteProfilePage onComplete={() => setCurrentPage('dashboard')} />
                );

            default:
                return renderProtected(currentPage, renderDashboardContent());
        }
    };

    return (
        <>
            {renderPage()}
            <Toaster position="top-right" richColors />
        </>
    );
}

export default App;


// ================================================================================
// FILE: src\components\SplashScreen.jsx
// ================================================================================

import React from "react";
import schoolLogo from "../assets/taguigpic.png"; // school logo
import heroBannerImage from "../assets/NexoraHome.png"; // hero banner image
import gatBgImage from "../assets/Gatbg.png"; // imported correctly

export default function SplashScreen({ onSelectRole }) {
  const handleLogin = () => {
    if (onSelectRole) {
      onSelectRole(null, "login");
    } else {
      console.log("Login clicked");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={schoolLogo}
              alt="School Logo"
              style={{ width: 80, height: 80, borderRadius: 12 }}
            />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
                GAT ANDRES BONIFACIO
              </h1>
              <p style={{ fontSize: 14, color: "#4b5563", margin: 0 }}>HIGH SCHOOL</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
<div style={{ padding: "48px 32px" }}> {/* removed the red gradient here */}
  <div style={{ maxWidth: 1280, margin: "0 auto" }}>
    <div
      style={{
        backgroundColor: "#fff", // keep the white card
        borderRadius: 12,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        overflow: "hidden",
        position: "relative",
        height: 256,
      }}
    >
      <img
        src={heroBannerImage}
        alt="Hero Banner"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(239,68,68,0.8), transparent)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 48,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#fff",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Welcome to Nexora 
          </h2>
          <p style={{ fontSize: 16, color: "#fff", margin: 0 }}>
            Your one-stop portal for all GABHS Applications
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* White Section with Full Cover Background */}
<div
  style={{
    position: "relative",
    width: "100%",
    height: 400,       // you can adjust height as needed
    overflow: "hidden",
    margin: 0,         // remove any outside margin
    padding: 0,        // remove padding so bg fully extends
  }}
>
  {/* Background Image covers entire container */}
  <img
    src={gatBgImage}
    alt="Background"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />

  {/* Nexora Card Overlapping */}
  <div
    style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#fff",
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      border: "1px solid #e5e7eb",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      width: "90%",
      maxWidth: 360,
      alignItems: "center",
      gap: 16,
    }}
  >
    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Nexora</h3>
    <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 4, textAlign: "center" }}>
      Your Access to Services
    </p>
    <p style={{ fontSize: 14, color: "#374151", marginBottom: 16, textAlign: "center" }}>
      Login or re-enroll enables for academic services accessible anytime, anywhere.
    </p>
    <button
      onClick={handleLogin}
      style={{
        padding: "8px 16px",
        backgroundColor: "#dc2626",
        color: "#fff",
        borderRadius: 8,
        border: "none",
        fontWeight: 600,
        cursor: "pointer",
        width: "100%",
      }}
    >
      LOGIN
    </button>
    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12, textAlign: "center" }}>
      For students, faculty and staff.
    </p>
  </div>
</div>
      {/* Footer */}
      <footer
        style={{
          background: "linear-gradient(to right, #dc2626, #b91c1c)",
          color: "#fff",
          padding: "48px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <img src={schoolLogo} alt="Footer Icon" style={{ width: 48, height: 48, borderRadius: 8 }} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>GAT ANDRES BONIFACIO</h3>
                <p style={{ fontSize: 12, margin: 0 }}>HIGH SCHOOL</p>
              </div>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ABOUT NEXORA </h4>
            <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
              Nexora is a suite of online services and tools designed to provide students, faculty, and staff convenient access to school services and information.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>CONTACT US</h4>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
              <p>📍 Bonifacio, Taguig, Philippines</p>
              <p>📞 +8808-75-43</p>
              <p>✉️ sdotapat.gabhs@deped.gov.ph</p>
              <p>🕐 MONDAY - FRIDAY • 8:AM - 5:PM • CLOSED</p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            textAlign: "center",
            fontSize: 12,
            opacity: 0.75,
          }}
        >
          All Rights Reserved. Gat Andres Bonifacio High School
        </div>
      </footer>
    </div>
  );
}



// ================================================================================
// FILE: src\components\modals\AddStudentsModal.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Search, Check } from 'lucide-react';
import adminService from '@/services/adminService';

const AddStudentsModal = ({ section, onClose, onSuccess }) => {
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  // Extract short grade like '7' from section.gradeLevel which might be 'Grade 7' or '7'
  const sectionGradeShort = (s) => {
    if (!s) return null;
    const m = String(s).match(/(\d{1,2})/);
    return m ? m[1] : null;
  };

  // On mount / when section changes, lock gradeFilter to section's grade
  useEffect(() => {
    const g = sectionGradeShort(section?.gradeLevel || section?.grade);
    if (g) setGradeFilter(g);
  }, [section]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (gradeFilter !== 'all') params.gradeLevel = gradeFilter;
      if (search) params.search = search;
      const res = await adminService.getSectionCandidates(section._id || section.id, params);
      if (res?.success) setCandidates(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, [section, gradeFilter]);

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const handleAdd = async () => {
    if (selected.size === 0) return toast.error('No students selected');
    try {
      const studentIds = Array.from(selected);
      const res = await adminService.addStudentsToSection(section._id || section.id, studentIds);
      if (res?.success) {
        onSuccess(res.data?.createdCount || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add students');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: '90%', maxWidth: 900, background: '#fff', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Add Students to {section.sectionName || section.name}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
          {(() => {
            const fixed = sectionGradeShort(section?.gradeLevel || section?.grade);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} disabled={!!fixed} style={{ padding: 8, borderRadius: 8 }}>
                  {fixed ? (
                    <option value={fixed}>{`Grade ${fixed}`}</option>
                  ) : (
                    <>
                      <option value="all">All Grades</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                    </>
                  )}
                </select>
                {fixed && <small style={{ color: '#6b7280', fontSize: 12 }}>Restricted to this section's grade</small>}
              </div>
            );
          })()}
          <button onClick={fetchCandidates} style={{ padding: 8, borderRadius: 8, border: 'none', background: '#111827', color: '#fff' }}><Search /></button>
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No students found.</div>
          ) : (
            <div>
              {candidates.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #f1f1f1', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.email} • {c.gradeLevel || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>Cancel</button>
          <button onClick={handleAdd} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff' }}>Add Selected</button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;



// ================================================================================
// FILE: src\components\modals\ApiErrorModal.jsx
// ================================================================================

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ApiErrorModal = ({ isOpen, error, onClose }) => {
  if (!isOpen || !error) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X />
        </Button>

        <h2 className="text-xl font-bold text-red-600">
          {error.title || "API Error"}
        </h2>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p><strong>Message:</strong> {error.message}</p>
          <p><strong>Source:</strong> {error.source}</p>

          {error.field && (
            <p><strong>Field:</strong> {error.field}</p>
          )}

          {error.code && (
            <p><strong>Status Code:</strong> {error.code}</p>
          )}

          {error.requestId && (
            <p className="text-xs text-gray-500">
              Request ID: {error.requestId}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="destructive" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiErrorModal;



// ================================================================================
// FILE: src\components\modals\ChangePasswordModal.jsx
// ================================================================================

import React, { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";

/**
 * ChangePasswordModal
 * Appears after OTP verification to let users change their temporary password
 * Users can skip this and change password later
 * 
 * Two modes:
 * 1. isInitialPassword=true: Set password after email verification (no old password needed)
 * 2. isInitialPassword=false: Change password for authenticated user (old password required)
 */
const ChangePasswordModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  isInitialPassword = false,
  email = null,
  otpCode = null
}) => {
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Password strength checks
  const passwordChecks = useMemo(() => {
    const val = formData.newPassword;
    return {
      hasNumber: /\d/.test(val),
      hasLower: /[a-z]/.test(val),
      hasUpper: /[A-Z]/.test(val),
      hasSpecial: /[@$!%*?&#]/.test(val),
    };
  }, [formData.newPassword]);

  // Validate individual field
  const validateField = (name, value) => {
    switch (name) {
      case "oldPassword":
        if (!isInitialPassword && !value.trim()) return "Current password is required";
        return "";
      case "newPassword":
        if (!value.trim()) return "New password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
        if (!/\d/.test(value)) return "Password must contain at least one number";
        if (!/[@$!%*?&#]/.test(value)) return "Password must contain at least one special character";
        return "";
      case "confirmPassword":
        if (!value.trim()) return "Please confirm your password";
        if (value !== formData.newPassword) return "Passwords do not match";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const isFormValid = useMemo(() => {
    const hasOldPassword = isInitialPassword || formData.oldPassword.trim();
    return (
      hasOldPassword &&
      formData.newPassword.trim() &&
      formData.confirmPassword.trim() &&
      !Object.values(errors).some((e) => e) &&
      Object.values(passwordChecks).every(Boolean)
    );
  }, [formData, errors, passwordChecks, isInitialPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      if (isInitialPassword) {
        // Set initial password with OTP verification
        await api.post("/auth/set-initial-password", {
          email: email,
          code: otpCode,
          newPassword: formData.newPassword,
        });
        toast.success("Password set successfully! You can now log in.");
      } else {
        // Change password for authenticated user
        await api.post("/auth/change-password", {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        });
        toast.success("Password changed successfully!");
      }

      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onSuccess?.();
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Failed to change password";
      
      if (message.includes('Invalid verification code')) {
        toast.error('Invalid OTP code. Please check the code from your verification email and try again.');
        setErrors({ form: 'Invalid OTP code. Please verify the 6-digit code is correct.' });
      } else if (message.includes('No pending verification')) {
        toast.error('Verification code expired or not found. Please request a new one.');
        setErrors({ form: 'Verification code expired or not found.' });
      } else if (message.includes('Email already verified')) {
        toast.error('This email has already been verified. You can now log in.');
        setErrors({ form: 'Email already verified. Use normal login.' });
      } else if (message.includes('Old password')) {
        setErrors({ oldPassword: message });
        toast.error('Current password is incorrect.');
      } else {
        toast.error(message);
        setErrors({ form: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", margin: 0, marginBottom: "4px" }}>
                {isInitialPassword ? "Set Your Password" : "Change Your Password"}
              </h2>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                {isInitialPassword 
                  ? "Create a new password to activate your account and start learning"
                  : "Update your password to secure your account"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Current Password - Only for password change, not initial setup */}
              {!isInitialPassword && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showOldPassword ? "text" : "password"}
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Enter your current password"
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        borderRadius: "12px",
                        border: errors.oldPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.oldPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.oldPassword}</p>}
                </div>
              )}

              {/* New Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter new password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      borderRadius: "12px",
                      border: errors.newPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.newPassword}</p>}

                {/* Password requirements */}
                {formData.newPassword && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                    <PasswordCheckItem label="At least 8 characters" valid={formData.newPassword.length >= 8} />
                    <PasswordCheckItem label="At least 1 uppercase letter" valid={passwordChecks.hasUpper} />
                    <PasswordCheckItem label="At least 1 lowercase letter" valid={passwordChecks.hasLower} />
                    <PasswordCheckItem label="At least 1 number" valid={passwordChecks.hasNumber} />
                    <PasswordCheckItem label="At least 1 special character (@$!%*?&#)" valid={passwordChecks.hasSpecial} />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Confirm your new password"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: errors.confirmPassword ? "1px solid #ef4444" : "1px solid #d1d5db",
                    outline: "none",
                  }}
                />
                {errors.confirmPassword && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{errors.confirmPassword}</p>}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1, background: "#f3f4f6", color: "#111827" }}
                >
                  {isInitialPassword ? "Skip for Now" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  style={{ flex: 1, background: "#10b981", color: "white" }}
                >
                  {loading ? (isInitialPassword ? "Setting..." : "Updating...") : (isInitialPassword ? "Set Password" : "Update Password")}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Small password check component
const PasswordCheckItem = ({ label, valid }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
    <span style={{ color: valid ? "#10b981" : "#d1d5db", fontWeight: "bold" }}>
      {valid ? "✓" : "○"}
    </span>
    <span style={{ color: valid ? "#10b981" : "#9ca3af" }}>{label}</span>
  </div>
);

export default ChangePasswordModal;



// ================================================================================
// FILE: src\components\modals\CreateAssessmentModal.jsx
// ================================================================================

import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CreateAssessmentModal = ({ isOpen, onClose, classes, onAssessmentCreated }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    type: "quiz",
    totalPoints: 100,
    dueDate: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value.trim()) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const isFormValid = useMemo(() => {
    return (
      formData.title.trim() &&
      formData.classId &&
      formData.type &&
      formData.totalPoints &&
      formData.dueDate
    );
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setLoading(true);
      await teacherService.createAssessment(formData);
      toast.success("Assessment created successfully");
      onAssessmentCreated();
      onClose();
      setFormData({
        title: "",
        description: "",
        classId: "",
        type: "quiz",
        totalPoints: 100,
        dueDate: ""
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast.error(error.message || "Failed to create assessment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null; // don’t render if not open

  return (
    <div style={{ width: "100%", height: "100%", padding: 32, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Create New Assessment</h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Fill out the form below to add a new assessment
          </p>
        </div>
        <Button onClick={onClose} disabled={loading} style={{ padding: 8, borderRadius: "50%" }}>
          <X size={28} />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <InputField
          label="Assessment Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="Enter assessment title"
          disabled={loading}
        />

        <InputField
          label="Description / Instructions"
          name="description"
          value={formData.description}
          onChange={handleChange}
          as="textarea"
          error={errors.description}
          placeholder="Enter instructions"
          disabled={loading}
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <SelectField
            label="Class"
            value={formData.classId}
            onChange={(v) => handleSelectChange("classId", v)}
            options={classes.map((c) => ({ value: c.id, label: `${c.subjectCode} - ${c.sectionName}` }))}
            error={errors.classId}
            disabled={loading}
          />

          <SelectField
            label="Type"
            value={formData.type}
            onChange={(v) => handleSelectChange("type", v)}
            options={[
              { value: "quiz", label: "Quiz" },
              { value: "exam", label: "Exam" },
              { value: "assignment", label: "Assignment" }
            ]}
            error={errors.type}
            disabled={loading}
          />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <InputField
            label="Total Points"
            name="totalPoints"
            type="number"
            value={formData.totalPoints}
            onChange={handleChange}
            error={errors.totalPoints}
            disabled={loading}
          />

          <InputField
            label="Due Date"
            name="dueDate"
            type="datetime-local"
            value={formData.dueDate}
            onChange={handleChange}
            error={errors.dueDate}
            disabled={loading}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
          <Button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
            {loading ? "Creating..." : "Create Assessment"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// InputField Component
const InputField = ({ label, error, as = "input", style = {}, ...props }) => {
  const Tag = as;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
      <Tag
        {...props}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          borderRadius: 12,
          border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
          outline: "none",
          resize: as === "textarea" ? "vertical" : "none",
          minHeight: as === "textarea" ? 80 : "auto",
          ...style
        }}
      />
      {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
    </div>
  );
};

// SelectField Component
const SelectField = ({ label, value, onChange, options = [], error, disabled }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 12,
        fontSize: 14,
        borderRadius: 12,
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        appearance: "none",
        background: "white"
      }}
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
  </div>
);

export default CreateAssessmentModal;



// ================================================================================
// FILE: src\components\modals\CreateClassModal.jsx
// ================================================================================

import React, { useState, useEffect, useMemo } from "react";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

const CreateClassModal = ({ classItem, onClose, onAddClass }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    subjectCode: "",
    subjectName: "",
    subjectGradeLevel: "",
    sectionId: "",
    teacherId: "",
    schoolYear: "",
    schedule: { days: [], startTime: "", endTime: "" },
    room: "",
  });

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [subjectsRes, sectionsRes, usersRes] = await Promise.all([
        api.get("/subjects/all"),
        api.get("/sections/all"),
        api.get("/users/all"),
      ]);

      if (subjectsRes.data.success) setSubjects(subjectsRes.data.data || []);
      if (sectionsRes.data.success) setSections(sectionsRes.data.data || []);
      if (usersRes.data.success) {
        const teachersList = usersRes.data.users.filter(u => u.roles?.some(r => r?.name === "teacher"));
        setTeachers(teachersList);
      }
    } catch (err) { toast.error("Failed to load form options"); }
    finally { setLoadingOptions(false); }
  };

  useEffect(() => {
    if (classItem) {
      const scheduleData = classItem.schedule ? parseSchedule(classItem.schedule) : { days: [], startTime: "", endTime: "" };
      setFormData({
        subjectCode: classItem.subjectCode || classItem.subjectId || "",
        subjectName: classItem.subjectName || "",
        subjectGradeLevel: classItem.subjectGradeLevel || "",
        sectionId: classItem.sectionId || "",
        teacherId: classItem.teacherId || "",
        schoolYear: classItem.schoolYear || "",
        schedule: scheduleData,
        room: classItem.room || "",
      });
    }
  }, [classItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // If subjectCode selected, also populate subjectName/grade from options
    if (name === 'subjectCode') {
      const subj = subjects.find(s => s.code === value || s.code === value.toUpperCase());
      setFormData(prev => ({ ...prev, subjectCode: value, subjectName: subj?.name || '', subjectGradeLevel: subj?.gradeLevel || '' }));
      if (value) setErrors(prev => ({ ...prev, subjectCode: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (value) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const parseSchedule = (scheduleStr) => {
    if (!scheduleStr) return { days: [], startTime: "", endTime: "" };
    const match = scheduleStr.match(/([A-Z,]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!match) return { days: [], startTime: "", endTime: "" };
    const daysStr = match[1].split(",").map(d => d.trim());
    return { days: daysStr, startTime: match[2], endTime: match[3] };
  };

  const formatSchedule = (schedule) =>
    schedule.days.length && schedule.startTime && schedule.endTime
      ? `${schedule.days.join(",").toUpperCase()} ${schedule.startTime} - ${schedule.endTime}`
      : null;

  const generateAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);
  };

  const daysOfWeek = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  const daysOfWeekFull = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const toggleDay = day => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day) ? prev.schedule.days.filter(d => d !== day) : [...prev.schedule.days, day]
      }
    }));
  };

  const updateScheduleTime = (field, value) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }));
  };

  const isFormValid = useMemo(() =>
    formData.subjectCode && formData.subjectName && formData.sectionId && formData.teacherId && formData.schoolYear && !Object.values(errors).some(Boolean),
    [formData, errors]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.subjectName) newErrors.subjectName = "Subject name required";
    if (!formData.subjectCode) newErrors.subjectCode = "Subject code required";
    if (!formData.sectionId) newErrors.sectionId = "Section required";
    if (!formData.teacherId) newErrors.teacherId = "Teacher required";
    if (!formData.schoolYear) newErrors.schoolYear = "School year required";
    if (Object.keys(newErrors).length) return setErrors(newErrors);

    setLoading(true);
    try {
      // Build payload expected by backend (denormalized subject fields)
      const payload = {
        subjectName: formData.subjectName,
        subjectCode: formData.subjectCode.toUpperCase(),
        subjectGradeLevel: formData.subjectGradeLevel || undefined,
        sectionId: formData.sectionId,
        teacherId: formData.teacherId,
        schoolYear: formData.schoolYear,
        schedule: formatSchedule(formData.schedule),
        room: formData.room || null,
      };

      await onAddClass(payload);
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to save class");
      setShowApiError(true);
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", height: "100%", background: "white", padding: "32px", overflowY: "auto", position: "relative" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {classItem ? "Edit Class" : "Add New Class"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Update or create a new class in the system</p>
          </div>
          <Button onClick={onClose} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <InputField label="Subject Name" name="subjectName" value={formData.subjectName} onChange={handleChange} error={errors.subjectName} disabled={loading || loadingOptions} />
            <InputField label="Subject Code" name="subjectCode" value={formData.subjectCode} onChange={handleChange} error={errors.subjectCode} disabled={loading || loadingOptions} />
            <SelectField label="Section" name="sectionId" value={formData.sectionId} onChange={handleChange} options={sections.map(s => ({ value: s.id, label: `${s.name} - ${s.gradeLevel}` }))} error={errors.sectionId} disabled={loading || loadingOptions} />
            <SelectField label="Teacher" name="teacherId" value={formData.teacherId} onChange={handleChange} options={teachers.map(t => ({ value: t.id || t._id, label: `${t.firstName || t.fullName} ${t.lastName || ""}` }))} error={errors.teacherId} disabled={loading || loadingOptions} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px" }}>
            <SelectField label="Grade Level" name="subjectGradeLevel" value={formData.subjectGradeLevel} onChange={handleChange} options={[{value:'7',label:'7'},{value:'8',label:'8'},{value:'9',label:'9'},{value:'10',label:'10'}]} error={errors.subjectGradeLevel} disabled={loading} />
            <div />
          </div>

          <SelectField label="School Year" name="schoolYear" value={formData.schoolYear} onChange={handleChange} options={generateAvailableYears().map(y => ({ value: y, label: y }))} error={errors.schoolYear} disabled={loading} />

          {/* Schedule */}
          <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "#374151" }}><Clock size={16}/> Schedule (Optional)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {daysOfWeek.map((d, i) => {
                const selected = formData.schedule.days.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)} title={daysOfWeekFull[i]} style={{
                    padding: "6px 12px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "14px",
                    border: selected ? "1px solid #b91c1c" : "1px solid #d1d5db",
                    background: selected ? "#ef4444" : "#fff",
                    color: selected ? "#111827" : "#374151",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}>{d}</button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
              <InputField label="Start Time" type="time" value={formData.schedule.startTime} onChange={(e) => updateScheduleTime("startTime", e.target.value)} disabled={loading} />
              <InputField label="End Time" type="time" value={formData.schedule.endTime} onChange={(e) => updateScheduleTime("endTime", e.target.value)} disabled={loading} />
            </div>
          </div>

          <InputField label="Room" name="room" value={formData.room} onChange={handleChange} disabled={loading} />

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <Button type="button" onClick={onClose} disabled={loading}>Go Back</Button>
            <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : classItem ? "Save Changes" : "Add Class"}
            </Button>
          </div>
        </form>

        <ApiErrorModal isOpen={showApiError} onClose={() => setShowApiError(false)} error={apiError} />
      </motion.div>
    </AnimatePresence>
  );
};

/* ----------------- Inputs ----------------- */
const InputField = ({ label, error, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <input {...props} style={{
      width: "100%",
      padding: "12px",
      fontSize: "14px",
      borderRadius: "12px",
      border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
      outline: "none",
    }}/>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const SelectField = ({ label, options, error, disabled, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <select {...props} disabled={disabled} style={{
      width: "100%",
      padding: "12px",
      fontSize: "14px",
      borderRadius: "12px",
      border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
      outline: "none",
      background: "#fff",
    }}>
      <option value="">Select {label}</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

export default CreateClassModal;



// ================================================================================
// FILE: src\components\modals\CreateLessonModal.jsx
// ================================================================================

import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import teacherService from "@/services/teacherService";

const CreateLessonModal = ({ isOpen, onClose, classes, onLessonCreated }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    contentType: "video"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value.trim()) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (!value) setErrors((prev) => ({ ...prev, [name]: "This field is required" }));
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const isFormValid = useMemo(() => {
    return formData.title.trim() && formData.classId && formData.contentType;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setLoading(true);
      await teacherService.createLesson(formData);
      toast.success("Lesson created successfully");
      onLessonCreated();
      onClose();
      setFormData({
        title: "",
        description: "",
        classId: "",
        contentType: "video"
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error(error.message || "Failed to create lesson");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null; // do not render if closed

  return (
    <div style={{ width: "100%", height: "100%", padding: 32, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Create New Lesson</h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Fill out the form below to add a new lesson</p>
        </div>
        <Button onClick={onClose} disabled={loading} style={{ padding: 8, borderRadius: "50%" }}>
          <X size={28} />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <InputField
          label="Lesson Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          placeholder="Enter lesson title"
          disabled={loading}
        />

        <InputField
          label="Description / Instructions"
          name="description"
          value={formData.description}
          onChange={handleChange}
          as="textarea"
          error={errors.description}
          placeholder="Enter instructions"
          disabled={loading}
        />

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <SelectField
            label="Class"
            value={formData.classId}
            onChange={(v) => handleSelectChange("classId", v)}
            options={classes.map((c) => ({ value: c.id, label: `${c.subjectCode} - ${c.sectionName}` }))}
            error={errors.classId}
            disabled={loading}
          />

          <SelectField
            label="Content Type"
            value={formData.contentType}
            onChange={(v) => handleSelectChange("contentType", v)}
            options={[
              { value: "video", label: "Video" },
              { value: "document", label: "Document" },
              { value: "quiz", label: "Quiz Reference" },
              { value: "link", label: "External Link" }
            ]}
            error={errors.contentType}
            disabled={loading}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
          <Button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            style={{ background: "#dc2626", color: "white", padding: "12px 24px" }}
            disabled={loading || !isFormValid}
          >
            {loading ? "Creating..." : "Create Lesson"}
          </Button>
        </div>
      </form>
    </div>
  );
};

// InputField Component
const InputField = ({ label, error, as = "input", style = {}, ...props }) => {
  const Tag = as;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
      <Tag
        {...props}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          borderRadius: 12,
          border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
          outline: "none",
          resize: as === "textarea" ? "vertical" : "none",
          minHeight: as === "textarea" ? 80 : "auto",
          ...style
        }}
      />
      {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
    </div>
  );
};

// SelectField Component
const SelectField = ({ label, value, onChange, options = [], error, disabled }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 12,
        fontSize: 14,
        borderRadius: 12,
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        appearance: "none",
        background: "white"
      }}
    >
      <option value="">Select {label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: 12 }}>{error}</p>}
  </div>
);

export default CreateLessonModal;



// ================================================================================
// FILE: src\components\modals\CreateSectionModal.jsx
// ================================================================================

import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import { motion, AnimatePresence } from "framer-motion";
import api from '@/services/api';


const CreateSectionModal = ({ section, onClose, onAddSection }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  const [formData, setFormData] = useState({
    sectionName: "",
    gradeLevel: "",
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    adviserId: "",
    assignedTeacher: "",
    studentCapacity: "",
    roomNumber: "",
  });

  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);


  const [schoolYearRange, setSchoolYearRange] = useState({
    startYear: new Date().getFullYear().toString(),
    endYear: (new Date().getFullYear() + 1).toString(),
  });

  // Fetch teachers list (for assigned teacher dropdown)
  useEffect(() => {
    let mounted = true;
    const fetchTeachers = async () => {
      setTeachersLoading(true);
      try {
        const res = await api.get('/users/all', { params: { role: 'teacher', limit: 500 } });
        if (!mounted) return;
        if (res?.data?.users) setTeachers(res.data.users);
      } catch (err) {
        console.error('Failed to load teachers', err);
      } finally {
        if (mounted) setTeachersLoading(false);
      }
    };

    fetchTeachers();

    return () => { mounted = false; };
  }, []);

  // Populate form for editing
  useEffect(() => {
    if (section) {
      const [startYear, endYear] = section.schoolYear?.split("-") || ["", ""];
      setSchoolYearRange({
        startYear: startYear || new Date().getFullYear().toString(),
        endYear: endYear || (new Date().getFullYear() + 1).toString(),
      });
      setFormData({
        sectionName: section.sectionName || "",
        gradeLevel: section.gradeLevel || "",
        schoolYear: section.schoolYear || "",
        adviserId: section.adviserId || section.adviserId || "",
        assignedTeacher: section.assignedTeacher || "",
        studentCapacity: String(section.studentCapacity || ""),
        roomNumber: section.roomNumber || "",
      });
    }
  }, [section]);

  const handleSchoolYearChange = (field, value) => {
    const newRange = { ...schoolYearRange, [field]: value };
    setSchoolYearRange(newRange);
    const formattedYear = `${newRange.startYear}-${newRange.endYear}`;
    setFormData((prev) => ({ ...prev, schoolYear: formattedYear }));
    setErrors((errs) => ({
      ...errs,
      schoolYear: formattedYear.length > 0 ? "" : "School year is required",
    }));
  };

  const getFieldError = (name, value) => {
    if (!value.trim()) return `${FIELD_LABELS[name]} is required`;

    if (name === "studentCapacity") {
      if (!/^\d+$/.test(value) || Number(value) <= 0)
        return "Student Capacity must be a positive number";
    }

    if (name === "assignedTeacher" && /\d/.test(value))
      return "Teacher name cannot contain numbers";

    return "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;

    if (name !== "gradeLevel") sanitized = value.replace(/[^a-zA-Z0-9\s.,-]/g, "");
    if (name === "assignedTeacher") sanitized = sanitized.replace(/[^a-zA-Z\s.]/g, "");
    if (name === "studentCapacity") sanitized = sanitized.replace(/\D/g, "");
    if (FIELD_MAX_LENGTHS[name]) sanitized = sanitized.slice(0, FIELD_MAX_LENGTHS[name]);

    setFormData((prev) => {
      const next = { ...prev, [name]: sanitized };
      setErrors((errs) => ({ ...errs, [name]: getFieldError(name, sanitized) }));
      return next;
    });
  };

  const isFormValid = useMemo(() => {
    return Object.values(formData).every((v) => v.trim()) && !Object.values(errors).some(Boolean);
  }, [formData, errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const payload = {
        id: section?.id || crypto.randomUUID(),
        sectionName: formData.sectionName.trim(),
        gradeLevel: formData.gradeLevel,
        schoolYear: formData.schoolYear.trim(),
        adviserId: formData.adviserId || null,
        assignedTeacher: teachers.find(t => t.id === formData.adviserId)
          ? `${teachers.find(t => t.id === formData.adviserId).firstName} ${teachers.find(t => t.id === formData.adviserId).lastName}`
          : formData.assignedTeacher.trim(),
        studentCapacity: Number(formData.studentCapacity),
        roomNumber: formData.roomNumber.trim(),
      };

      await onAddSection(payload);

      toast.success(section ? "Section updated successfully" : "Section added successfully");
      onClose();
    } catch (err) {
      const backendError = err?.response?.data?.error;
      setApiError({
        title: section ? "Update Section Failed" : "Create Section Failed",
        message: backendError?.message || "Unexpected server error",
        source: backendError?.source || "Unknown backend source",
        field: backendError?.field || null,
        code: backendError?.code || null,
        requestId: backendError?.requestId || null,
      });
      setShowApiError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          height: "100%",
          background: "white",
          padding: "32px",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {section ? "Edit Section" : "Add New Section"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Manage section information</p>
          </div>
          <Button onClick={onClose} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <YearRangePicker
            label="School Year"
            startYear={schoolYearRange.startYear}
            endYear={schoolYearRange.endYear}
            onStartYearChange={(value) => handleSchoolYearChange("startYear", value)}
            onEndYearChange={(value) => handleSchoolYearChange("endYear", value)}
            error={errors.schoolYear}
            disabled={loading}
          />

          <InputField label="Section Name" name="sectionName" value={formData.sectionName} onChange={handleChange} error={errors.sectionName} disabled={loading} placeholder="Section A" />

          <SelectField
            label="Grade Level"
            name="gradeLevel"
            value={formData.gradeLevel}
            onChange={handleChange}
            error={errors.gradeLevel}
            disabled={loading}
            options={["Grade 7", "Grade 8", "Grade 9", "Grade 10"]}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Assigned Teacher</label>
            <select
              name="adviserId"
              value={formData.adviserId}
              onChange={(e) => setFormData(prev => ({ ...prev, adviserId: e.target.value }))}
              disabled={loading || teachersLoading}
              style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.assignedTeacher ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}
            >
              <option value="">(Optional) Select a teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName} {t.email ? `(${t.email})` : ''}</option>
              ))}
            </select>
            {teachersLoading && <p style={{ fontSize: 12, color: '#6b7280' }}>Loading teachers...</p>}
          </div>

          <InputField label="Student Capacity" name="studentCapacity" value={formData.studentCapacity} onChange={handleChange} error={errors.studentCapacity} disabled={loading} placeholder="30" />

          <InputField label="Room Number" name="roomNumber" value={formData.roomNumber} onChange={handleChange} error={errors.roomNumber} disabled={loading} placeholder="Room 101" />

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <Button type="button" onClick={onClose} disabled={loading}>Go Back</Button>
            <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
              {loading ? "Saving..." : section ? "Save Changes" : "Add Section"}
            </Button>
          </div>
        </form>

        {/* API Error Modal */}
        <ApiErrorModal isOpen={showApiError} error={apiError} onClose={() => setShowApiError(false)} />
      </motion.div>
    </AnimatePresence>
  );
};

/* ------------------------- */
/* Constants                 */
/* ------------------------- */
const FIELD_LABELS = {
  sectionName: "Section Name",
  gradeLevel: "Grade Level",
  schoolYear: "School Year",
  assignedTeacher: "Assigned Teacher",
  studentCapacity: "Student Capacity",
  roomNumber: "Room Number",
};

const FIELD_MAX_LENGTHS = {
  sectionName: 30,
  schoolYear: 10,
  assignedTeacher: 50,
  studentCapacity: 3,
  roomNumber: 15,
};

/* ------------------------- */
/* Reusable Inputs           */
/* ------------------------- */
const InputField = ({ label, error, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "14px",
        borderRadius: "12px",
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        outline: "none",
        ...style,
      }}
    />
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const SelectField = ({ label, error, options, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <select
      {...props}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "14px",
        borderRadius: "12px",
        border: error ? "1px solid #ef4444" : "1px solid #d1d5db",
        outline: "none",
        background: "white",
        ...style,
      }}
    >
      <option value="" disabled>Select grade level</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

const YearRangePicker = ({ label, startYear, endYear, onStartYearChange, onEndYearChange, error, disabled }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 5 + i).map(String);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <select value={startYear} onChange={(e) => onStartYearChange(e.target.value)} disabled={disabled} style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <span style={{ fontWeight: "600", color: "#4b5563" }}>-</span>
        <select value={endYear} onChange={(e) => onEndYearChange(e.target.value)} disabled={disabled} style={{ flex: 1, padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", background: "white" }}>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
    </div>
  );
};

export default CreateSectionModal;



// ================================================================================
// FILE: src\components\modals\CreateSubjectModal.jsx
// ================================================================================

import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ApiErrorModal from "@/components/modals/ApiErrorModal";

const CreateSubjectModal = ({ subject, onClose, onAddSubject }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // API ERROR STATE (GENERIC)
  const [apiError, setApiError] = useState(null);
  const [showApiError, setShowApiError] = useState(false);

  const [formData, setFormData] = useState({
    gradeLevel: "",
    subjectName: "",
    subjectCode: "",
  });

  /* ------------------------- */
  /* 1. POPULATE FORM (EDIT)   */
  /* ------------------------- */
  useEffect(() => {
    if (subject) {
      setFormData({
        gradeLevel: subject.gradeLevel || "",
        subjectName: subject.subjectName || "",
        subjectCode: subject.subjectCode || "",
      });
    }
  }, [subject]);

  /* ------------------------- */
  /* 2. HANDLE CHANGES         */
  /* ------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let next = { ...prev, [name]: value };

      if (name === "gradeLevel") {
        next.subjectName = "";
        next.subjectCode = "";
      }

      if (name === "subjectName") {
        next.subjectCode = SUBJECT_MAP[prev.gradeLevel]?.[value] || "";
      }

      setErrors((errs) => ({
        ...errs,
        [name]: value ? "" : `${FIELD_LABELS[name]} is required`,
      }));

      return next;
    });
  };

  /* ------------------------- */
  /* 3. FORM VALIDITY          */
  /* ------------------------- */
  const isFormValid = useMemo(() => {
    return (
      formData.gradeLevel &&
      formData.subjectName &&
      formData.subjectCode &&
      !Object.values(errors).some(Boolean)
    );
  }, [formData, errors]);

  /* ------------------------- */
  /* 4. SUBMIT                 */
  /* ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);

    try {
      const payload = {
        id: subject?.id || crypto.randomUUID(),
        gradeLevel: formData.gradeLevel,
        subjectName: formData.subjectName,
        subjectCode: formData.subjectCode,
      };

      /**
       * BACKEND INTEGRATION (FUTURE)
       * await fetch("/api/subjects", {
       *   method: subject ? "PUT" : "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify(payload),
       * });
       */

      await onAddSubject(payload);

      toast.success(
        subject ? "Subject updated successfully" : "Subject added successfully"
      );
      onClose();
    } catch (err) {
      /**
       * EXPECTED BACKEND ERROR FORMAT:
       * {
       *   error: {
       *     message: "Subject code already exists",
       *     source: "SubjectController.create",
       *     field: "subjectCode",
       *     code: 409,
       *     requestId: "REQ-20260204-01"
       *   }
       * }
       */

      const backendError = err?.response?.data?.error;

      setApiError({
        title: subject ? "Update Subject Failed" : "Create Subject Failed",
        message: backendError?.message || "Unexpected server error",
        source: backendError?.source || "Unknown backend source",
        field: backendError?.field || null,
        code: backendError?.code || null,
        requestId: backendError?.requestId || null,
      });

      setShowApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const availableSubjects = SUBJECT_MAP[formData.gradeLevel] || {};

  return (
    <>
      <div className="w-full h-full bg-white p-8 lg:p-12 overflow-y-auto animate-in fade-in slide-in-from-right-5 duration-300">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {subject ? "Edit Subject" : "Add New Subject"}
            </h2>
            <p className="text-gray-500 mt-1">Manage subject information</p>
          </div>
          <Button onClick={onClose} variant="ghost" className="p-2" disabled={loading}>
            <X size={28} />
          </Button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <SelectField
            label="Grade Level"
            name="gradeLevel"
            value={formData.gradeLevel}
            onChange={handleChange}
            error={errors.gradeLevel}
            disabled={loading}
            options={["Grade 7", "Grade 8", "Grade 9", "Grade 10"]}
          />

          <SelectField
            label="Subject Name"
            name="subjectName"
            value={formData.subjectName}
            onChange={handleChange}
            error={errors.subjectName}
            disabled={!formData.gradeLevel || loading}
            options={Object.keys(availableSubjects)}
          />

          <InputField
            label="Subject Code"
            name="subjectCode"
            value={formData.subjectCode}
            disabled
            placeholder="Subject Code"
          />

          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
            <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
              Go Back
            </Button>

            <Button
              type="submit"
              variant="destructive"
              className="text-white px-6 py-3 min-w-[160px] text-center"
              disabled={loading || !isFormValid}
            >
              {loading ? "Saving..." : subject ? "Save Changes" : "Add Subject"}
            </Button>
          </div>
        </form>
      </div>

      {/* GENERIC API ERROR MODAL */}
      <ApiErrorModal
        isOpen={showApiError}
        error={apiError}
        onClose={() => setShowApiError(false)}
      />
    </>
  );
};

export default CreateSubjectModal;

/* ------------------------- */
/* Subject Mapping (TEMP)    */
/* ------------------------- */

const SUBJECT_MAP = {
  "Grade 7": {
    Mathematics: "MATH7",
    English: "ENG7",
    Science: "SCI7",
    Filipino: "FLP7",
    Mapeh: "MPH7",
    Music: "MSC7",
  },
  "Grade 8": {
    Mathematics: "MATH8",
    English: "ENG8",
    Science: "SCI8",
    Filipino: "FLP8",
    PhysicalEducation: "PHY8",
  },
  "Grade 9": {
    Mathematics: "MATH9",
    English: "ENG9",
    Science: "SCI9",
    Algebra: "ALG9",
  },
  "Grade 10": {
    Mathematics: "MATH10",
    English: "ENG10",
    Science: "SCI10",
    Calculus: "CAC10",
  },
};

/* ------------------------- */
/* Constants                 */
/* ------------------------- */

const FIELD_LABELS = {
  gradeLevel: "Grade Level",
  subjectName: "Subject Name",
  subjectCode: "Subject Code",
};

/* ------------------------- */
/* Reusable Inputs           */
/* ------------------------- */

const InputField = ({ label, className = "", ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed ${className}`}
    />
  </div>
);

const SelectField = ({ label, error, options, hint, className = "", ...props }) => {
  const isDisabled = props.disabled;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
        {label}
      </label>

      <select
        {...props}
        className={`w-full px-4 py-3 rounded-xl border ${
          error ? "border-red-500" : "border-gray-200"
        } ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white"
        } focus:ring-2 focus:ring-red-500 outline-none transition-all ${className}`}
      >
        <option value="" disabled>
          {isDisabled ? "Select grade level first" : "Select option"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {hint && !error && (
        <p className="text-xs text-gray-400 font-medium">{hint}</p>
      )}
      {error && (
        <p className="text-red-500 text-xs font-medium">{error}</p>
      )}
    </div>
  );
};



// ================================================================================
// FILE: src\components\modals\CreateUserModal.jsx
// ================================================================================

import React, { useState, useEffect, useMemo } from "react";
import { X, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ApiErrorModal from "@/components/modals/ApiErrorModal";
import api from "@/services/api";

const CreateUserModal = ({ user, onClose, onAddUser }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    userRole: "student",
    studentId: "",
    gradeLevel: "",
    password: "",
    resetPassword: false,
  });

  // Populate form for editing
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        userRole: user.role || "student",
        studentId: user.studentId || "",
        gradeLevel: (user.profile && user.profile.gradeLevel) || user.gradeLevel || "",
        password: "",
        resetPassword: false,
      });
    }
  }, [user]);

  // Validation functions
  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return `${name === "firstName" ? "First" : "Last"} name is required`;
        if (/[0-9]/.test(value)) return "Numbers are not allowed";
        if (/[^a-zA-Z\s]/.test(value)) return "Special characters are not allowed";
        return "";
      case "middleName":
        if (value) {
          if (/[0-9]/.test(value)) return "Numbers are not allowed";
          if (/[^a-zA-Z\s]/.test(value)) return "Special characters are not allowed";
        }
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^\S+@\S+\.\S+$/.test(value)) return "Invalid email format";
        return "";
      case "studentId":
        if (formData.userRole === "student" && !value.trim()) return "Student ID is required";
        return "";
      case "gradeLevel":
        if (formData.userRole === "student" && !value) return "Grade level is required";
        return "";
      case "password":
        // Password only required for existing users when resetting password
        if (user && formData.resetPassword && !value) return "Password is required";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      let nextData = { ...prev };
      if (name === "userRole") {
        nextData.userRole = newValue;
        if (newValue !== "student") {
          nextData.studentId = "";
          nextData.gradeLevel = "";
        }
      } else {
        nextData[name] = newValue;
      }

      setErrors((prevErrs) => ({
        ...prevErrs,
        [name]: validateField(name, newValue),
      }));
      return nextData;
    });
  };

  // Password strength checks
  const passwordChecks = useMemo(() => {
    const val = formData.password;
    return {
      hasNumber: /\d/.test(val),
      hasLower: /[a-z]/.test(val),
      hasUpper: /[A-Z]/.test(val),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(val),
    };
  }, [formData.password]);

  const isFormValid = useMemo(() => {
    const requiredFields = ["firstName", "lastName", "email"];
    // Password only required for editing when resetting
    if (user && formData.resetPassword) requiredFields.push("password");
    if (formData.userRole === "student") requiredFields.push("studentId", "gradeLevel");

    return requiredFields.every((f) => formData[f]?.trim()) &&
      !Object.values(errors).some((e) => e) &&
      (!(user && formData.resetPassword) || Object.values(passwordChecks).every(Boolean));
  }, [formData, errors, user, passwordChecks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setApiError(null);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.userRole,
        studentId: formData.userRole === "student" ? formData.studentId : "",
      };
      // Only include password for existing users when resetting
      if (user && formData.resetPassword) {
        payload.password = formData.password;
      }

      const savedUser = await onAddUser(payload);

      // If new user, show the generated password and set it to state for display
      if (!user && savedUser?.temporaryPassword) {
        setGeneratedPassword(savedUser.temporaryPassword);
      }

      if (formData.userRole === "student") {
        if (savedUser?.id) {
          try {
            const profilePayload = {
              userId: savedUser.id,
              gradeLevel: formData.gradeLevel || undefined,
            };
            if (!user) {
              await api.post("/profiles/create", profilePayload);
            } else {
              await api.put(`/profiles/update/${savedUser.id}`, profilePayload);
            }
          } catch (profileErr) {
            console.error("Profile creation/update failed", profileErr);
            toast.error("User created but failed to create student profile");
            setApiError({ title: "Profile Error", message: profileErr.message, source: "profiles" });
          }
        }
      }

      toast.success(user ? "User updated successfully" : "User registered successfully");
      setApiError(null);
      // Don't close immediately if new user - let them see the password
      if (!user) {
        // Just reset errors, keep modal open to show password
        return savedUser;
      } else {
        onClose();
        return savedUser;
      }
    } catch (error) {
      if (error?.fieldErrors) setErrors((prev) => ({ ...prev, ...error.fieldErrors }));
      else setApiError({ title: "Error", message: error.message || "Unexpected error", source: "client" });
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = formData.userRole === "teacher";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", height: "100%", background: "white", padding: "32px", overflowY: "auto", position: "relative" }}
      >
        <ApiErrorModal isOpen={!!apiError} error={apiError} onClose={() => setApiError(null)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
              {user ? "Edit User" : "Add New User"}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Update or create a new system account</p>
          </div>
          <Button onClick={() => { setApiError(null); setErrors({}); setLoading(false); onClose(); }} disabled={loading} style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={28} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Names Row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} disabled={loading} placeholder="John" />
            <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} error={errors.middleName} disabled={loading} placeholder="Quincy" />
            <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} disabled={loading} placeholder="Doe" />
          </div>

          {/* Email */}
          <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} disabled={loading} placeholder="john.doe@example.com" />

          {/* Role & ID */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>User Role</label>
              <select name="userRole" value={formData.userRole} onChange={handleChange} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: "1px solid #d1d5db", appearance: "none", background: "white" }}>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
              </select>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
              <InputField label="Student ID Number" name="studentId" value={isTeacher ? "" : formData.studentId} onChange={handleChange} error={!isTeacher ? errors.studentId : ""} disabled={isTeacher || loading} placeholder={isTeacher ? "N/A (Teacher Selected)" : "ID Number"} style={isTeacher ? { background: "#f3f4f6", opacity: 0.6, borderColor: "#d1d5db", cursor: "not-allowed" } : {}} />
              {isTeacher && <Lock size={16} style={{ position: "absolute", right: "16px", top: "42px", color: "#9ca3af" }} />}
            </div>

            {/* Grade Level */}
            {formData.userRole === "student" && (
              <div style={{ width: "180px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Grade Level</label>
                <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.gradeLevel ? "1px solid #ef4444" : "1px solid #d1d5db", appearance: "none", background: "white" }}>
                  <option value="">Select grade</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
                {errors.gradeLevel && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.gradeLevel}</p>}
              </div>
            )}
          </div>

          {/* Password - Different UI for new vs editing users */}
          {!user ? (
            // New user - auto-generated password
            generatedPassword ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Temporary Password</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedPassword}
                    style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: "1px solid #d1d5db", background: "#f9fafb", fontFamily: "monospace", fontWeight: "500" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      setPasswordCopied(true);
                      setTimeout(() => setPasswordCopied(false), 2000);
                      toast.success("Password copied to clipboard!");
                    }}
                    style={{ padding: "12px 20px", background: "#3b82f6", color: "white", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: "600" }}
                  >
                    {passwordCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Password sent to email</p>
                  <p style={{ margin: "0", fontSize: "12px", color: "#b45309" }}>Student will receive temporary password via email and set a new password after OTP verification.</p>
                </div>
              </div>
            ) : null
          ) : (
            // Editing user - show reset password checkbox and input if selected
            <>
              {formData.resetPassword && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} disabled={loading} placeholder="Enter new password" style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: errors.password ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Password rules */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <PasswordRule label="Contains at least 1 number" valid={passwordChecks.hasNumber} />
                    <PasswordRule label="Contains at least 1 lowercase letter" valid={passwordChecks.hasLower} />
                    <PasswordRule label="Contains at least 1 uppercase letter" valid={passwordChecks.hasUpper} />
                    <PasswordRule label="Contains a special character (e.g. @ !)" valid={passwordChecks.hasSpecial} />
                  </div>
                  {errors.password && <p style={{ color: "#ef4444", fontSize: "12px" }}>{errors.password}</p>}
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
            {!user && generatedPassword ? (
              <>
                <Button type="button" onClick={() => { setApiError(null); setGeneratedPassword(""); setFormData({ firstName: "", middleName: "", lastName: "", email: "", userRole: "student", studentId: "", gradeLevel: "", password: "", resetPassword: false }); setErrors({}); }} disabled={loading}>Create Another</Button>
                <Button type="button" onClick={() => { setApiError(null); setErrors({}); setLoading(false); onClose(); }} style={{ background: "#10b981", color: "white", padding: "12px 24px" }}>Done</Button>
              </>
            ) : (
              <>
                <Button type="button" onClick={() => { setApiError(null); setErrors({}); setLoading(false); onClose(); }} disabled={loading}>Go Back</Button>
                <Button type="submit" style={{ background: "#dc2626", color: "white", padding: "12px 24px" }} disabled={loading || !isFormValid}>
                  {loading ? "Saving..." : (user ? "Save Changes" : "Register User")}
                </Button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

// InputField Component
const InputField = ({ label, error, style = {}, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
    <label style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>{label}</label>
    <input {...props} maxLength={props.name === "studentId" ? 12 : 30} style={{ width: "100%", padding: "12px", fontSize: "14px", borderRadius: "12px", border: error ? "1px solid #ef4444" : "1px solid #d1d5db", outline: "none", ...style }} />
    {error && <p style={{ color: "#ef4444", fontSize: "12px" }}>{error}</p>}
  </div>
);

// Password rule component
const PasswordRule = ({ label, valid }) => (
  <p style={{ fontSize: 12, color: valid ? "green" : "#ef4444", margin: 0 }}>{label}</p>
);

export default CreateUserModal;



// ================================================================================
// FILE: src\components\modals\DeleteModal.jsx
// ================================================================================

import React, { useEffect, useRef } from "react";

const DeleteModal = ({
  isOpen,
  onClose,
  onDelete,
  itemName = "item",
  loading = false,
  title = "Confirm Deletion",
  message,
  Icon: IconComponent = () => <span>🗑️</span>,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div ref={modalRef} tabIndex={-1} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <IconComponent style={{ marginRight: 8 }} /> {title}
          </h2>
          <button style={styles.closeButton} onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {/* Message */}
        <p style={styles.message}>
          {message || (
            <>
              Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
            </>
          )}
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelButton} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button style={styles.deleteButton} onClick={onDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // semi-transparent overlay
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#1f2937", // dark gray, not pure black
    color: "#f9fafb", // light gray text
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "#f9fafb",
    fontSize: 18,
    cursor: "pointer",
  },
  message: {
    marginBottom: 24,
    lineHeight: 1.5,
    color: "#e5e7eb", // slightly lighter gray for readability
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    padding: "8px 16px",
    backgroundColor: "#374151", // dark gray button
    color: "#f9fafb",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  deleteButton: {
    padding: "8px 16px",
    backgroundColor: "#ef4444", // brighter red
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};

export default DeleteModal;



// ================================================================================
// FILE: src\components\ui\button.jsx
// ================================================================================

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground hover:bg-primary/90',
          destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          ghost: 'hover:bg-accent hover:text-accent-foreground',
          link: 'text-primary underline-offset-4 hover:underline',
        },
        size: {
          default: 'h-10 px-4 py-2',
          sm: 'h-9 rounded-md px-3',
          lg: 'h-11 rounded-md px-8',
          icon: 'h-10 w-10',
        },
      },
      defaultVariants: {
        variant: 'default',
        size: 'default',
      },
    }
)

const Button = React.forwardRef(
    ({ className, variant, size, ...props }, ref) => {
      const Comp = 'button'
      return (
          <Comp
              className={cn(buttonVariants({ variant, size, className }))}
              ref={ref}
              {...props}
          />
      )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }



// ================================================================================
// FILE: src\components\ui\card.jsx
// ================================================================================

import * as React from 'react'
import { cn } from './utils'

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
        {...props}
    />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }



// ================================================================================
// FILE: src\components\ui\dialog.jsx
// ================================================================================

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
    <div
        className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
        {...props}
    />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
    <div
        className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
        {...props}
    />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};



// ================================================================================
// FILE: src\components\ui\input-otp.jsx
// ================================================================================

import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { Minus } from "lucide-react"
import { cn } from "./utils"

const InputOTP = React.forwardRef(
    ({ className, containerClassName, ...props }, ref) => (
        <OTPInput
            ref={ref}
            containerClassName={cn(
                "flex items-center gap-2 has-[:disabled]:opacity-50",
                containerClassName
            )}
            className={cn("disabled:cursor-not-allowed", className)}
            {...props}
        />
    )
)
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const slot = inputOTPContext.slots[index]

  return (
      <div
          ref={ref}
          className={cn(
              "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
              slot?.isActive && "z-10 ring-2 ring-ring ring-offset-background",
              className
          )}
          {...props}
      >
        {slot?.char}
        {slot?.hasFakeCaret && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
            </div>
        )}
      </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
      <Minus />
    </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }



// ================================================================================
// FILE: src\components\ui\input.jsx
// ================================================================================

import * as React from 'react'
import { cn } from './utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Input.displayName = 'Input'

export { Input }



// ================================================================================
// FILE: src\components\ui\label.jsx
// ================================================================================

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './utils'

const labelVariants = cva(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(labelVariants(), className)}
        {...props}
    />
))
Label.displayName = 'Label'

export { Label }



// ================================================================================
// FILE: src\components\ui\navigation-menu.jsx
// ================================================================================

import * as React from "react";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "./utils";

const NavigationMenuContext = React.createContext(null);

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}) {
  const [openItem, setOpenItem] = React.useState(null);

  return (
    <NavigationMenuContext.Provider value={{ openItem, setOpenItem }}>
      <nav
        data-slot="navigation-menu"
        className={cn(
          "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </NavigationMenuContext.Provider>
  );
}

function NavigationMenuList({
  className,
  ...props
}) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  value,
  ...props
}) {
  return (
    <li
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1",
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}) {
  return (
    <button
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  );
}

function NavigationMenuContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="navigation-menu-content"
      className={cn(
        "top-full left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
        "bg-popover text-popover-foreground overflow-hidden rounded-md border shadow duration-200",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuLink({
  className,
  ...props
}) {
  return (
    <a
      data-slot="navigation-menu-link"
      className={cn(
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1",
        className,
      )}
      {...props}
    />
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
};



// ================================================================================
// FILE: src\components\ui\popover.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

const PopoverContext = React.createContext(null);

function Popover({ children, open, onOpenChange, ...props }) {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (val) => {
    if (open === undefined) {
      setIsOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <PopoverContext.Provider value={{ isOpen, handleOpenChange }}>
      <div className="relative inline-block" data-slot="popover">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({ children, ...props }) {
  const { isOpen, handleOpenChange } = React.useContext(PopoverContext);
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(!isOpen);
    },
    ...props
  });
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  const { isOpen, handleOpenChange } = React.useContext(PopoverContext);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        handleOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      data-slot="popover-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 w-72 rounded-md border p-4 shadow-md outline-none",
        "top-full mt-2", // Simple positioning
        className,
      )}
      {...props}
    />
  );
}

function PopoverAnchor({ children, ...props }) {
  return <div data-slot="popover-anchor" {...props}>{children}</div>;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };



// ================================================================================
// FILE: src\components\ui\progress.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

function Progress({
  className,
  value,
  ...props
}) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={value}
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
}

export { Progress };



// ================================================================================
// FILE: src\components\ui\select.jsx
// ================================================================================

import * as React from "react";
import {
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { cn } from "./utils";

const SelectContext = React.createContext(null);

function Select({
  children,
  value,
  onValueChange,
  defaultValue,
  ...props
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (val) => {
    if (value === undefined) {
      setSelectedValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ open, setOpen, selectedValue, handleValueChange }}>
      <div className="relative w-full" data-slot="select">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ ...props }) {
  return <div data-slot="select-group" {...props} />;
}

function SelectValue({ placeholder, ...props }) {
  const { selectedValue } = React.useContext(SelectContext);
  return (
    <span data-slot="select-value" {...props}>
      {selectedValue || placeholder}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input bg-input-background flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-4 opacity-50" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  ...props
}) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;

  return (
    <div
      data-slot="select-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-hidden rounded-md border shadow-md",
        className,
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}) {
  const { selectedValue, handleValueChange } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      data-slot="select-item"
      onClick={() => handleValueChange(value)}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <CheckIcon className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
};



// ================================================================================
// FILE: src\components\ui\separator.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return (
    <div
      data-slot="separator-root"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };



// ================================================================================
// FILE: src\components\ui\sheet.jsx
// ================================================================================

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "./utils";

const SheetContext = React.createContext(null);

function Sheet({ children, open, onOpenChange, ...props }) {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (val) => {
    if (open === undefined) {
      setIsOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <SheetContext.Provider value={{ isOpen, handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({ children, ...props }) {
  const { handleOpenChange } = React.useContext(SheetContext);
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(true);
    },
    ...props
  });
}

function SheetClose({ children, ...props }) {
  const { handleOpenChange } = React.useContext(SheetContext);
  if (!children) return null;
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(false);
    },
    ...props
  });
}

function SheetPortal({ children }) {
  return <div data-slot="sheet-portal">{children}</div>;
}

function SheetOverlay({ className, ...props }) {
  const { isOpen, handleOpenChange } = React.useContext(SheetContext);
  if (!isOpen) return null;
  return (
    <div
      onClick={() => handleOpenChange(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}) {
  const { isOpen, handleOpenChange } = React.useContext(SheetContext);
  if (!isOpen) return null;

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        data-slot="sheet-content"
        className={cn(
          "bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out duration-300",
          side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => handleOpenChange(false)}
          className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 outline-none"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};



// ================================================================================
// FILE: src\components\ui\sidebar.jsx
// ================================================================================

import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "./utils";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { Skeleton } from "./skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = React.createContext(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            }
          }
          className={cn(
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            }
          }
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-none transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  ...props
}) {
  return (
    <button
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-none transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton({
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  children,
  ...props
}) {
  const { isMobile, state } = useSidebar();

  const button = (
    <button
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  showOnHover = false,
  ...props
}) {
  return (
    <button
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-none transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}) {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          }
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  size = "md",
  isActive = false,
  className,
  children,
  ...props
}) {
  return (
    <a
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};



// ================================================================================
// FILE: src\components\ui\skeleton.jsx
// ================================================================================

import { cn } from "./utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };



// ================================================================================
// FILE: src\components\ui\sonner.jsx
// ================================================================================

import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }



// ================================================================================
// FILE: src\components\ui\table.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};



// ================================================================================
// FILE: src\components\ui\tabs.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

const TabsContext = React.createContext(null);

function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleValueChange = React.useCallback((val) => {
    if (value === undefined) {
      setActiveTab(val);
    }
    onValueChange?.(val);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ activeTab, handleValueChange }}>
      <div
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  value,
  ...props
}) {
  const context = React.useContext(TabsContext);
  const isActive = context?.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      data-slot="tabs-trigger"
      onClick={() => context?.handleValueChange(value)}
      className={cn(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  value,
  ...props
}) {
  const context = React.useContext(TabsContext);
  const isActive = context?.activeTab === value;

  if (!isActive) return null;

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };



// ================================================================================
// FILE: src\components\ui\textarea.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };



// ================================================================================
// FILE: src\components\ui\tooltip.jsx
// ================================================================================

import * as React from "react";
import { cn } from "./utils";

function TooltipProvider({ children }) {
  return <>{children}</>;
}

function Tooltip({ children, ...props }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      data-slot="tooltip"
    >
      {React.Children.map(children, child => {
        if (child.type === TooltipTrigger) {
          return child;
        }
        if (child.type === TooltipContent && isOpen) {
          return child;
        }
        return null;
      })}
    </div>
  );
}

function TooltipTrigger({ children, asChild, ...props }) {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <span data-slot="tooltip-trigger" {...props}>{children}</span>;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}) {
  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        "bg-primary text-primary-foreground absolute z-50 w-fit rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
        "bottom-full left-1/2 -translate-x-1/2 mb-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };



// ================================================================================
// FILE: src\components\ui\utils.js
// ================================================================================

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}



// ================================================================================
// FILE: index.html
// ================================================================================

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexora</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>



// ================================================================================
// FILE: jsconfig.json
// ================================================================================

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}



// ================================================================================
// FILE: src\contexts\AuthContext.jsx
// ================================================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import profilesService from '../services/profilesService';
import { toast } from 'sonner';


// Auth context: holds current user, loading state, and auth helpers
const AuthContext = createContext(null);
// AuthProvider: provides authentication state and functions to the app
export function AuthProvider({ children }) {

    // ============================================================================
    // STATE
    // ============================================================================

    // Current user object (null if not authenticated)
    const [user, setUser] = useState(null);

    // Loading flag used while checking authentication status
    const [loading, setLoading] = useState(true);
    /**
     * Check authentication status on app load
     *
     * CALLED ONCE when app first mounts
     *
     * WHY:
     * - User may still be logged in from previous session
     * - Refresh token cookie persists across browser restarts
     * - Access token in memory is lost on page refresh
     * - This restores the session
     *
     * FLOW:
     * 1. App loads
     * 2. Call getCurrentUser()
     * 3. Backend validates access token (from previous session if any)
     * 4. If token valid: returns user data
     * 5. If token expired: interceptor calls /auth/refresh automatically
     * 6. If refresh succeeds: get new token, fetch user
     * 7. If refresh fails: user must login
     */
    const checkAuth = useCallback(async () => {
        try {
            console.log('[AUTH] Checking authentication status...');

            // Try to get current user with existing token/cookie
            const response = await authService.getCurrentUser();

            // Success - user is authenticated
            // The /auth/me endpoint returns JWT payload: { userId, email, roles, type }
            const userData = response.data.user;
            console.log('[AUTH] User authenticated:', userData.email);

            // Try to fetch and merge user profile (if any) so UI has complete info
            let profileData = null;
            try {
                const profileRes = await profilesService.getMyProfile();
                profileData = profileRes?.data || profileRes || null;
                console.log('[AUTH] Fetched profile:', profileData);
            } catch (err) {
                // Ignore profile fetch errors; treat as no profile
                console.warn('[AUTH] Failed to fetch profile:', err?.message || err);
            }

            // Normalize: ensure both `id` and `userId` exist for compatibility
            const normalizedUser = {
                ...userData,
                id: userData.id || userData.userId,
                userId: userData.userId || userData.id,
            };

            // Merge profile fields into user state in a SINGLE setUser call
            // This prevents double-render issues
            if (profileData) {
                setUser({ ...normalizedUser, ...profileData });
            } else {
                setUser(normalizedUser);
            }

        } catch (error) {
            // Not authenticated or token expired
            console.log('[AUTH] Not authenticated');
            setUser(null);

        } finally {
            // Done checking authentication
            setLoading(false);
        }
    }, []);

    /**
     * Run auth check when component mounts
     */
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // ============================================================================
    // AUTHENTICATION FUNCTIONS
    // ============================================================================

    /**
     * REGISTER NEW USER
     *
     * @param {Object} userData - Registration data
     * @param {string} userData.email - User's email
     * @param {string} userData.password - User's password
     * @param {string} userData.confirmPassword - Password confirmation
     * @param {string} userData.role - User role (student/teacher)
     *
     * @returns {Promise<Object>} Registration response
     *
     * FLOW:
     * 1. Call backend registration API
     * 2. Backend creates account with PENDING status
     * 3. Backend sends OTP email
     * 4. Return response (includes user email for verification page)
     * 5. Frontend redirects to email verification page
     *
     * NOTE: User is NOT logged in after registration
     * They must verify email first, then login
     */
    const register = async (userData) => {
        try {
            const response = await authService.register(userData);

            toast.success('Registration successful! Check your email for verification code.');

            return response;

        } catch (error) {
            // Handle specific errors
            if (error.code === 'EMAIL_EXISTS') {
                toast.error('Email already registered. Please login instead.');
            } else if (error.errors) {
                // Validation errors from backend
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Registration failed');
            } else {
                toast.error(error.message || 'Registration failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * VERIFY EMAIL
     *
     * @param {string} email - User's email
     * @param {string} code - 6-digit OTP code
     *
     * @returns {Promise<Object>} Verification response
     *
     * FLOW:
     * 1. Call backend verification API
     * 2. Backend verifies code matches and not expired
     * 3. Backend updates user: isEmailVerified = true, status = ACTIVE
     * 4. User can now login
     * 5. Frontend redirects to login page
     */
    const verifyEmail = async (email, code) => {
        try {
            const response = await authService.verifyEmail(email, code);

            toast.success('Email verified! You can now login.');

            return response;

        } catch (error) {
            // Handle specific verification errors
            if (error.code === 'OTP_INVALID') {
                toast.error('Invalid verification code. Please try again.');
            } else if (error.code === 'OTP_EXPIRED') {
                toast.error('Verification code expired. Please request a new one.');
            } else if (error.code === 'OTP_MAX_ATTEMPTS') {
                toast.error('Too many failed attempts. Please request a new code.');
            } else {
                toast.error(error.message || 'Verification failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * RESEND OTP CODE
     *
     * @param {string} email - User's email
     *
     * @returns {Promise<Object>} Response with new expiration time
     */
    const resendOTP = async (email) => {
        try {
            const response = await authService.resendOTP(email);

            toast.success('New verification code sent! Check your email.');

            return response;

        } catch (error) {
            toast.error(error.message || 'Failed to resend code. Please try again.');
            throw error;
        }
    };

    /**
     * LOGIN USER
     *
     * @param {string} email - User's email
     * @param {string} password - User's password
     *
     * @returns {Promise<Object>} Login response with user data
     *
     * FLOW:
     * 1. Call backend login API
     * 2. Backend verifies credentials
     * 3. Backend returns access token + user data
     * 4. authService.login() saves token to memory
     * 5. Set user in context state
     * 6. App.jsx detects user logged in → redirects to dashboard
     *
     * WHAT GETS STORED:
     * - Access token: In memory (via authService)
     * - Refresh token: In httpOnly cookie (via backend)
     * - User data: In context state (this component)
     */
    const login = async (email, password) => {
        try {
            const response = await authService.login(email, password);

            // Login returns user from database (has `id`, not `userId`)
            const userData = response.data.user;

            // Normalize: ensure both `id` and `userId` exist
            const normalizedUser = {
                ...userData,
                id: userData.id || userData.userId,
                userId: userData.userId || userData.id,
            };

            // Fetch and merge profile in one go (same as checkAuth)
            let profileData = null;
            try {
                const profileRes = await profilesService.getMyProfile();
                profileData = profileRes?.data || profileRes || null;
            } catch (err) {
                console.warn('[AUTH] Failed to fetch profile on login:', err?.message || err);
            }

            // Set user with profile merged in a SINGLE call
            if (profileData) {
                setUser({ ...normalizedUser, ...profileData });
            } else {
                setUser(normalizedUser);
            }

            toast.success('Login successful!');

            return response;

        } catch (error) {
            // Handle specific login errors
            if (error.code === 'EMAIL_NOT_VERIFIED' || error.message?.includes('Email not verified')) {
                toast.error('Please verify your email before logging in.');
            } else if (error.code === 'INVALID_CREDENTIALS' || error.message?.includes('Invalid credentials')) {
                toast.error('Invalid email or password.');
            } else if (error.code === 'ACCOUNT_INACTIVE' || error.message?.includes('not active')) {
                toast.error('Account is suspended. Contact support.');
            } else {
                toast.error(error.message || 'Login failed. Please try again.');
            }

            throw error;
        }
    };

    /**
     * LOGOUT USER
     *
     * FLOW:
     * 1. Call backend logout API
     * 2. Backend clears refresh token cookie
     * 3. authService.logout() clears access token from memory
     * 4. Clear user from context state
     * 5. App.jsx detects user logged out → redirects to login
     */
    const logout = async () => {
        try {
            await authService.logout();

            // Clear user from context
            setUser(null);

            toast.info('Logged out successfully');

        } catch (error) {
            // Even if backend call fails, still logout locally
            setUser(null);
            console.error('Logout error:', error);
        }
    };

    /**
     * UPDATE PROFILE
     */
    const updateProfile = async (profileData) => {
        try {
            const result = await authService.updateProfile(profileData);
            // API returns: { success: true, message, data: { user } }
            setUser(result.data.user);
            return result;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    };

    /**
     * UPDATE USER DATA IN CONTEXT
     *
     * Used for updating user profile without re-fetching from backend
     *
     * @param {Object} updates - Fields to update
     *
     * EXAMPLE:
     * updateUser({ firstName: "Jane", lastName: "Doe" })
     *
     * NOTE: This only updates local state
     * To persist changes, you must also call the backend API
     */
    const updateUser = useCallback((updates) => {
        setUser(prev => ({
            ...prev,
            ...updates
        }));
    }, []);

    /**
     * FORGOT PASSWORD
     *
     * @param {string} email - User's email
     *
     * @returns {Promise<Object>} Response
     */
    const forgotPassword = async (email) => {
        try {
            const response = await authService.forgotPassword(email);

            toast.success('Password reset code sent to your email.');

            return response;

        } catch (error) {
            toast.error(error.message || 'Failed to send reset code.');
            throw error;
        }
    };

    // Reset password using OTP (calls authService.resetPassword)
    const resetPassword = async (email, code, newPassword) => {
        try {
            const response = await authService.resetPassword(email, code, newPassword);

            toast.success('Password reset successful! You can now login.');

            return response;

        } catch (error) {
            if (error.code === 'OTP_INVALID') {
                toast.error('Invalid reset code.');
            } else if (error.code === 'OTP_EXPIRED') {
                toast.error('Reset code expired. Request a new one.');
            } else if (error.errors) {
                // Password validation errors
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Password reset failed');
            } else {
                toast.error(error.message || 'Password reset failed.');
            }

            throw error;
        }
    };

    /**
     * CHANGE PASSWORD FOR AUTHENTICATED USER
     *
     * @param {string} oldPassword - Current password for verification
     * @param {string} newPassword - New password
     *
     * @returns {Promise<Object>} Response
     *
     * FLOW:
     * 1. User is already authenticated
     * 2. Verify old password
     * 3. Update to new password
     * 4. Show success message
     */
    const changePassword = async (oldPassword, newPassword) => {
        try {
            const response = await authService.changePassword(oldPassword, newPassword);

            toast.success('Password changed successfully!');

            return response;

        } catch (error) {
            if (error.message?.includes('Old password')) {
                toast.error('Current password is incorrect.');
            } else if (error.errors) {
                // Password validation errors
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Password change failed');
            } else {
                toast.error(error.message || 'Failed to change password.');
            }

            throw error;
        }
    };

    /**
     * Set initial password with OTP verification
     * 
     * USED AFTER EMAIL VERIFICATION during account creation
     * 
     * USER FLOW:
     * 1. Admin creates student account
     * 2. Student receives email with temporary password and OTP
     * 3. Student verifies email with OTP code
     * 4. Student sets their preferred password
     * 5. Password is saved, account is activated, student can login
     * 
     * DIFFERENCE FROM changePassword:
     * - changePassword requires JWT authentication and current password
     * - setInitialPassword requires email, OTP code, and new password (no authentication)
     * 
     * PARAMS:
     * - email: Student's email address
     * - code: 6-digit OTP code from email verification
     * - newPassword: Password student wants to use
     * 
     * FLOW:
     * 1. Verify OTP against email
     * 2. Update user's password
     * 3. Mark email as verified and activate account
     * 4. Show success message
     */
    const setInitialPassword = async (email, code, newPassword) => {
        try {
            const response = await authService.setInitialPassword(email, code, newPassword);

            toast.success('Password set successfully! You can now log in.');

            return response;

        } catch (error) {
            if (error.message?.includes('Invalid or expired')) {
                toast.error('Your verification code has expired. Please request a new one.');
            } else if (error.errors) {
                // Password validation errors
                const firstError = Object.values(error.errors)[0];
                const errorMessage = typeof firstError === 'object' ? (firstError.message || firstError.msg) : firstError;
                toast.error(errorMessage || 'Failed to set password');
            } else {
                toast.error(error.message || 'Failed to set password.');
            }

            throw error;
        }
    };

    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================

    /**
     * Value provided to all components
     *
     * ACCESSIBLE VIA:
     * const { user, login, logout } = useAuth();
     */
    const value = {
        // State
        user,                           // Current user object or null
        loading,                        // True while checking auth
        isAuthenticated: !!user,        // Boolean: is user logged in?

        // Functions
        register,                       // Register new user
        verifyEmail,                    // Verify email with OTP
        resendOTP,                      // Resend verification code
        login,                          // Login user
        logout,                         // Logout user
        updateProfile,                  // Update user profile
        forgotPassword,                 // Request password reset
        resetPassword,                  // Reset password with code
        changePassword,                 // Change password (authenticated user)
        setInitialPassword,             // Set initial password after OTP verification
        updateUser,                     // Update user in context
        checkAuth,                      // Re-check authentication
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    /**
     * Show loading screen while checking authentication
     * Prevents flash of login page
     */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#374151] to-[#dc2626]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    /**
     * Provide authentication context to app
     */
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ================================================================================
// CUSTOM HOOK
// ================================================================================

/**
 * useAuth Hook
 *
 * Provides access to authentication context
 *
 * USAGE:
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *
 *   if (!user) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.email}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}

export default AuthContext;




// ================================================================================
// FILE: src\hooks\use-mobile.js
// ================================================================================

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}



// ================================================================================
// FILE: src\index.css
// ================================================================================

/*! tailwindcss v4.1.3 | MIT License | https://tailwindcss.com */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer properties {
  @supports (((-webkit-hyphens: none)) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color: rgb(from red r g b)))) {
    *, :before, :after, ::backdrop {
      --tw-translate-x: 0;
      --tw-translate-y: 0;
      --tw-translate-z: 0;
      --tw-rotate-x: rotateX(0);
      --tw-rotate-y: rotateY(0);
      --tw-rotate-z: rotateZ(0);
      --tw-skew-x: skewX(0);
      --tw-skew-y: skewY(0);
      --tw-space-y-reverse: 0;
      --tw-space-x-reverse: 0;
      --tw-divide-y-reverse: 0;
      --tw-border-style: solid;
      --tw-gradient-position: initial;
      --tw-gradient-from: #0000;
      --tw-gradient-via: #0000;
      --tw-gradient-to: #0000;
      --tw-gradient-stops: initial;
      --tw-gradient-via-stops: initial;
      --tw-gradient-from-position: 0%;
      --tw-gradient-via-position: 50%;
      --tw-gradient-to-position: 100%;
      --tw-leading: initial;
      --tw-font-weight: initial;
      --tw-tracking: initial;
      --tw-shadow: 0 0 #0000;
      --tw-shadow-color: initial;
      --tw-shadow-alpha: 100%;
      --tw-inset-shadow: 0 0 #0000;
      --tw-inset-shadow-color: initial;
      --tw-inset-shadow-alpha: 100%;
      --tw-ring-color: initial;
      --tw-ring-shadow: 0 0 #0000;
      --tw-inset-ring-color: initial;
      --tw-inset-ring-shadow: 0 0 #0000;
      --tw-ring-inset: initial;
      --tw-ring-offset-width: 0px;
      --tw-ring-offset-color: #fff;
      --tw-ring-offset-shadow: 0 0 #0000;
      --tw-outline-style: solid;
      --tw-blur: initial;
      --tw-brightness: initial;
      --tw-contrast: initial;
      --tw-grayscale: initial;
      --tw-hue-rotate: initial;
      --tw-invert: initial;
      --tw-opacity: initial;
      --tw-saturate: initial;
      --tw-sepia: initial;
      --tw-drop-shadow: initial;
      --tw-drop-shadow-color: initial;
      --tw-drop-shadow-alpha: 100%;
      --tw-drop-shadow-size: initial;
      --tw-duration: initial;
      --tw-scale-x: 1;
      --tw-scale-y: 1;
      --tw-scale-z: 1;
    }
  }
}

@layer theme {
  :root, :host {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    --color-red-50: oklch(.971 .013 17.38);
    --color-red-100: oklch(.936 .032 17.717);
    --color-red-200: oklch(.885 .062 18.334);
    --color-red-300: oklch(.808 .114 19.571);
    --color-red-500: oklch(.637 .237 25.331);
    --color-red-600: oklch(.577 .245 27.325);
    --color-red-800: oklch(.444 .177 26.899);
    --color-red-900: oklch(.396 .141 25.723);
    --color-orange-50: oklch(.98 .016 73.684);
    --color-orange-100: oklch(.954 .038 75.164);
    --color-orange-500: oklch(.705 .213 47.604);
    --color-orange-600: oklch(.646 .222 41.116);
    --color-orange-700: oklch(.553 .195 38.402);
    --color-yellow-50: oklch(.987 .026 102.212);
    --color-yellow-100: oklch(.973 .071 103.193);
    --color-yellow-200: oklch(.945 .129 101.54);
    --color-yellow-300: oklch(.905 .182 98.111);
    --color-yellow-600: oklch(.681 .162 75.834);
    --color-yellow-800: oklch(.476 .114 61.907);
    --color-yellow-900: oklch(.421 .095 57.708);
    --color-green-100: oklch(.962 .044 156.743);
    --color-green-300: oklch(.871 .15 154.449);
    --color-green-500: oklch(.723 .219 149.579);
    --color-green-600: oklch(.627 .194 149.214);
    --color-green-700: oklch(.527 .154 150.069);
    --color-green-800: oklch(.448 .119 151.328);
    --color-blue-50: oklch(.97 .014 254.604);
    --color-blue-100: oklch(.932 .032 255.585);
    --color-blue-500: oklch(.623 .214 259.815);
    --color-blue-600: oklch(.546 .245 262.881);
    --color-blue-700: oklch(.488 .243 264.376);
    --color-purple-100: oklch(.946 .033 307.174);
    --color-purple-600: oklch(.558 .288 302.321);
    --color-gray-50: oklch(.985 .002 247.839);
    --color-gray-100: oklch(.967 .003 264.542);
    --color-gray-200: oklch(.928 .006 264.531);
    --color-gray-300: oklch(.872 .01 258.338);
    --color-gray-400: oklch(.707 .022 261.325);
    --color-gray-500: oklch(.551 .027 264.364);
    --color-gray-600: oklch(.446 .03 256.802);
    --color-gray-700: oklch(.373 .034 259.733);
    --color-gray-800: oklch(.278 .033 256.848);
    --color-gray-900: oklch(.21 .034 264.665);
    --color-black: #000;
    --color-white: #fff;
    --spacing: .25rem;
    --container-md: 28rem;
    --container-lg: 32rem;
    --container-4xl: 56rem;
    --container-5xl: 64rem;
    --text-xs: .75rem;
    --text-xs--line-height: calc(1 / .75);
    --text-sm: .875rem;
    --text-sm--line-height: calc(1.25 / .875);
    --text-base: 1rem;
    --text-base--line-height: calc(1.5 / 1);
    --text-lg: 1.125rem;
    --text-lg--line-height: calc(1.75 / 1.125);
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --text-3xl: 1.875rem;
    --text-3xl--line-height: calc(2.25 / 1.875);
    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;
    --tracking-tight: -.025em;
    --default-transition-duration: .15s;
    --default-transition-timing-function: cubic-bezier(.4, 0, .2, 1);
    --default-font-family: var(--font-sans);
    --default-font-feature-settings: var(--font-sans--font-feature-settings);
    --default-font-variation-settings: var(--font-sans--font-variation-settings);
    --default-mono-font-family: var(--font-mono);
    --default-mono-font-feature-settings: var(--font-mono--font-feature-settings);
    --default-mono-font-variation-settings: var(--font-mono--font-variation-settings);
  }
}

@layer base {
  *, :after, :before, ::backdrop {
    box-sizing: border-box;
    border: 0 solid;
    margin: 0;
    padding: 0;
  }

  ::file-selector-button {
    box-sizing: border-box;
    border: 0 solid;
    margin: 0;
    padding: 0;
  }

  html, :host {
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
    line-height: 1.5;
    font-family: var(--default-font-family, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    font-feature-settings: var(--default-font-feature-settings, normal);
    font-variation-settings: var(--default-font-variation-settings, normal);
    -webkit-tap-highlight-color: transparent;
  }

  body {
    line-height: inherit;
  }

  hr {
    height: 0;
    color: inherit;
    border-top-width: 1px;
  }

  abbr:where([title]) {
    -webkit-text-decoration: underline dotted;
    text-decoration: underline dotted;
  }

  h1, h2, h3, h4, h5, h6 {
    font-size: inherit;
    font-weight: inherit;
  }

  a {
    color: inherit;
    -webkit-text-decoration: inherit;
    -webkit-text-decoration: inherit;
    text-decoration: inherit;
  }

  b, strong {
    font-weight: bolder;
  }

  code, kbd, samp, pre {
    font-family: var(--default-mono-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
    font-feature-settings: var(--default-mono-font-feature-settings, normal);
    font-variation-settings: var(--default-mono-font-variation-settings, normal);
    font-size: 1em;
  }

  small {
    font-size: 80%;
  }

  sub, sup {
    vertical-align: baseline;
    font-size: 75%;
    line-height: 0;
    position: relative;
  }

  sub {
    bottom: -.25em;
  }

  sup {
    top: -.5em;
  }

  table {
    text-indent: 0;
    border-color: inherit;
    border-collapse: collapse;
  }

  :-moz-focusring {
    outline: auto;
  }

  progress {
    vertical-align: baseline;
  }

  summary {
    display: list-item;
  }

  ol, ul, menu {
    list-style: none;
  }

  img, svg, video, canvas, audio, iframe, embed, object {
    vertical-align: middle;
    display: block;
  }

  img, video {
    max-width: 100%;
    height: auto;
  }

  button, input, select, optgroup, textarea {
    font: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    letter-spacing: inherit;
    color: inherit;
    opacity: 1;
    --lightningcss-light: initial;
    --lightningcss-dark: ;
    color-scheme: light;
    background-color: #0000;
    border-radius: 0;
  }

  ::file-selector-button {
    font: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    letter-spacing: inherit;
    color: inherit;
    opacity: 1;
    --lightningcss-light: initial;
    --lightningcss-dark: ;
    color-scheme: light;
    background-color: #0000;
    border-radius: 0;
  }

  :where(select:is([multiple], [size])) optgroup {
    font-weight: bolder;
  }

  :where(select:is([multiple], [size])) optgroup option {
    padding-inline-start: 20px;
  }

  ::file-selector-button {
    margin-inline-end: 4px;
  }

  ::placeholder {
    opacity: 1;
    color: currentColor;
  }

  @supports (color: color-mix(in lab, red, red)) {
    ::placeholder {
      color: color-mix(in oklab, currentColor 50%, transparent);
    }
  }

  textarea {
    resize: vertical;
  }

  ::-webkit-search-decoration {
    -webkit-appearance: none;
  }

  ::-webkit-date-and-time-value {
    min-height: 1lh;
    text-align: inherit;
  }

  ::-webkit-datetime-edit {
    display: inline-flex;
  }

  ::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }

  ::-webkit-datetime-edit {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-year-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-month-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-day-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-hour-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-minute-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-second-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-millisecond-field {
    padding-block: 0;
  }

  ::-webkit-datetime-edit-meridiem-field {
    padding-block: 0;
  }

  :-moz-ui-invalid {
    box-shadow: none;
  }

  button, input:where([type="button"], [type="reset"], [type="submit"]) {
    appearance: button;
  }

  ::file-selector-button {
    appearance: button;
  }

  ::-webkit-inner-spin-button {
    height: auto;
  }

  ::-webkit-outer-spin-button {
    height: auto;
  }

  [hidden]:where(:not([hidden="until-found"])) {
    display: none !important;
  }

  * {
    border-color: var(--border);
    outline-color: var(--ring);
  }

  @supports (color: color-mix(in lab, red, red)) {
    * {
      outline-color: color-mix(in oklab, var(--ring) 50%, transparent);
    }
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
  }

  * {
    border-color: var(--border);
    outline-color: var(--ring);
  }

  @supports (color: color-mix(in lab, red, red)) {
    * {
      outline-color: color-mix(in oklab, var(--ring) 50%, transparent);
    }
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) h1 {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
  }

  :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
  }

  :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) h3 {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
  }

  :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) h4, :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) label, :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) button {
    font-size: var(--text-base);
    font-weight: var(--font-weight-medium);
    line-height: 1.5;
  }

  :where(:not(:has([class*=" text-"]), :not(:has([class^="text-"])))) input {
    font-size: var(--text-base);
    font-weight: var(--font-weight-normal);
    line-height: 1.5;
  }
}

@layer utilities {
  .\@container\/card-header {
    container: card-header / inline-size;
  }

  .invisible {
    visibility: hidden;
  }

  .absolute {
    position: absolute;
  }

  .fixed {
    position: fixed;
  }

  .relative {
    position: relative;
  }

  .sticky {
    position: sticky;
  }

  .inset-0 {
    inset: calc(var(--spacing) * 0);
  }

  .-top-1 {
    top: calc(var(--spacing) * -1);
  }

  .top-0 {
    top: calc(var(--spacing) * 0);
  }

  .top-1\/2 {
    top: 50%;
  }

  .top-4 {
    top: calc(var(--spacing) * 4);
  }

  .top-8 {
    top: calc(var(--spacing) * 8);
  }

  .top-\[50\%\] {
    top: 50%;
  }

  .-right-1 {
    right: calc(var(--spacing) * -1);
  }

  .right-0 {
    right: calc(var(--spacing) * 0);
  }

  .right-1 {
    right: calc(var(--spacing) * 1);
  }

  .right-2 {
    right: calc(var(--spacing) * 2);
  }

  .right-3 {
    right: calc(var(--spacing) * 3);
  }

  .bottom-0 {
    bottom: calc(var(--spacing) * 0);
  }

  .bottom-2 {
    bottom: calc(var(--spacing) * 2);
  }

  .left-0 {
    left: calc(var(--spacing) * 0);
  }

  .left-1 {
    left: calc(var(--spacing) * 1);
  }

  .left-3 {
    left: calc(var(--spacing) * 3);
  }

  .left-4 {
    left: calc(var(--spacing) * 4);
  }

  .left-8 {
    left: calc(var(--spacing) * 8);
  }

  .left-\[50\%\] {
    left: 50%;
  }

  .z-40 {
    z-index: 40;
  }

  .z-50 {
    z-index: 50;
  }

  .order-1 {
    order: 1;
  }

  .order-2 {
    order: 2;
  }

  .col-span-2 {
    grid-column: span 2 / span 2;
  }

  .col-span-4 {
    grid-column: span 4 / span 4;
  }

  .col-start-2 {
    grid-column-start: 2;
  }

  .row-span-2 {
    grid-row: span 2 / span 2;
  }

  .row-start-1 {
    grid-row-start: 1;
  }

  .mx-auto {
    margin-inline: auto;
  }

  .my-8 {
    margin-block: calc(var(--spacing) * 8);
  }

  .mt-1 {
    margin-top: calc(var(--spacing) * 1);
  }

  .mt-2 {
    margin-top: calc(var(--spacing) * 2);
  }

  .mt-4 {
    margin-top: calc(var(--spacing) * 4);
  }

  .mr-2 {
    margin-right: calc(var(--spacing) * 2);
  }

  .mb-1 {
    margin-bottom: calc(var(--spacing) * 1);
  }

  .mb-2 {
    margin-bottom: calc(var(--spacing) * 2);
  }

  .mb-4 {
    margin-bottom: calc(var(--spacing) * 4);
  }

  .mb-6 {
    margin-bottom: calc(var(--spacing) * 6);
  }

  .ml-1 {
    margin-left: calc(var(--spacing) * 1);
  }

  .ml-2 {
    margin-left: calc(var(--spacing) * 2);
  }

  .block {
    display: block;
  }

  .flex {
    display: flex;
  }

  .grid {
    display: grid;
  }

  .hidden {
    display: none;
  }

  .inline-flex {
    display: inline-flex;
  }

  .table {
    display: table;
  }

  .field-sizing-content {
    field-sizing: content;
  }

  .size-4 {
    width: calc(var(--spacing) * 4);
    height: calc(var(--spacing) * 4);
  }

  .size-7 {
    width: calc(var(--spacing) * 7);
    height: calc(var(--spacing) * 7);
  }

  .size-8 {
    width: calc(var(--spacing) * 8);
    height: calc(var(--spacing) * 8);
  }

  .size-9 {
    width: calc(var(--spacing) * 9);
    height: calc(var(--spacing) * 9);
  }

  .size-full {
    width: 100%;
    height: 100%;
  }

  .h-2 {
    height: calc(var(--spacing) * 2);
  }

  .h-2\.5 {
    height: calc(var(--spacing) * 2.5);
  }

  .h-3 {
    height: calc(var(--spacing) * 3);
  }

  .h-4 {
    height: calc(var(--spacing) * 4);
  }

  .h-5 {
    height: calc(var(--spacing) * 5);
  }

  .h-6 {
    height: calc(var(--spacing) * 6);
  }

  .h-8 {
    height: calc(var(--spacing) * 8);
  }

  .h-9 {
    height: calc(var(--spacing) * 9);
  }

  .h-10 {
    height: calc(var(--spacing) * 10);
  }

  .h-12 {
    height: calc(var(--spacing) * 12);
  }

  .h-16 {
    height: calc(var(--spacing) * 16);
  }

  .h-24 {
    height: calc(var(--spacing) * 24);
  }

  .h-\[calc\(100\%-1px\)\] {
    height: calc(100% - 1px);
  }

  .h-\[calc\(100vh-4rem\)\] {
    height: calc(100vh - 4rem);
  }

  .h-full {
    height: 100%;
  }

  .h-screen {
    height: 100vh;
  }

  .max-h-32 {
    max-height: calc(var(--spacing) * 32);
  }

  .max-h-\[500px\] {
    max-height: 500px;
  }

  .min-h-16 {
    min-height: calc(var(--spacing) * 16);
  }

  .min-h-\[44px\] {
    min-height: 44px;
  }

  .min-h-screen {
    min-height: 100vh;
  }

  .w-2 {
    width: calc(var(--spacing) * 2);
  }

  .w-2\.5 {
    width: calc(var(--spacing) * 2.5);
  }

  .w-3 {
    width: calc(var(--spacing) * 3);
  }

  .w-4 {
    width: calc(var(--spacing) * 4);
  }

  .w-5 {
    width: calc(var(--spacing) * 5);
  }

  .w-6 {
    width: calc(var(--spacing) * 6);
  }

  .w-8 {
    width: calc(var(--spacing) * 8);
  }

  .w-9 {
    width: calc(var(--spacing) * 9);
  }

  .w-10 {
    width: calc(var(--spacing) * 10);
  }

  .w-12 {
    width: calc(var(--spacing) * 12);
  }

  .w-16 {
    width: calc(var(--spacing) * 16);
  }

  .w-24 {
    width: calc(var(--spacing) * 24);
  }

  .w-64 {
    width: calc(var(--spacing) * 64);
  }

  .w-80 {
    width: calc(var(--spacing) * 80);
  }

  .w-fit {
    width: fit-content;
  }

  .w-full {
    width: 100%;
  }

  .max-w-4xl {
    max-width: var(--container-4xl);
  }

  .max-w-5xl {
    max-width: var(--container-5xl);
  }

  .max-w-\[70\%\] {
    max-width: 70%;
  }

  .max-w-\[calc\(100\%-2rem\)\] {
    max-width: calc(100% - 2rem);
  }

  .max-w-md {
    max-width: var(--container-md);
  }

  .min-w-0 {
    min-width: calc(var(--spacing) * 0);
  }

  .min-w-\[20px\] {
    min-width: 20px;
  }

  .flex-1 {
    flex: 1;
  }

  .flex-shrink-0, .shrink-0 {
    flex-shrink: 0;
  }

  .border-collapse {
    border-collapse: collapse;
  }

  .-translate-x-full {
    --tw-translate-x: -100%;
    translate: var(--tw-translate-x) var(--tw-translate-y);
  }

  .translate-x-0 {
    --tw-translate-x: calc(var(--spacing) * 0);
    translate: var(--tw-translate-x) var(--tw-translate-y);
  }

  .translate-x-\[-50\%\] {
    --tw-translate-x: -50%;
    translate: var(--tw-translate-x) var(--tw-translate-y);
  }

  .-translate-y-1\/2 {
    --tw-translate-y: calc(calc(1 / 2 * 100%) * -1);
    translate: var(--tw-translate-x) var(--tw-translate-y);
  }

  .translate-y-\[-50\%\] {
    --tw-translate-y: -50%;
    translate: var(--tw-translate-x) var(--tw-translate-y);
  }

  .transform {
    transform: var(--tw-rotate-x) var(--tw-rotate-y) var(--tw-rotate-z) var(--tw-skew-x) var(--tw-skew-y);
  }

  .cursor-not-allowed {
    cursor: not-allowed;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .touch-none {
    touch-action: none;
  }

  .resize-none {
    resize: none;
  }

  .auto-rows-min {
    grid-auto-rows: min-content;
  }

  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .grid-cols-12 {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .grid-rows-\[auto_auto\] {
    grid-template-rows: auto auto;
  }

  .flex-col {
    flex-direction: column;
  }

  .flex-col-reverse {
    flex-direction: column-reverse;
  }

  .flex-row {
    flex-direction: row;
  }

  .items-center {
    align-items: center;
  }

  .items-end {
    align-items: flex-end;
  }

  .items-start {
    align-items: flex-start;
  }

  .justify-between {
    justify-content: space-between;
  }

  .justify-center {
    justify-content: center;
  }

  .justify-end {
    justify-content: flex-end;
  }

  .justify-start {
    justify-content: flex-start;
  }

  .gap-1 {
    gap: calc(var(--spacing) * 1);
  }

  .gap-1\.5 {
    gap: calc(var(--spacing) * 1.5);
  }

  .gap-2 {
    gap: calc(var(--spacing) * 2);
  }

  .gap-3 {
    gap: calc(var(--spacing) * 3);
  }

  .gap-4 {
    gap: calc(var(--spacing) * 4);
  }

  .gap-6 {
    gap: calc(var(--spacing) * 6);
  }

  .gap-8 {
    gap: calc(var(--spacing) * 8);
  }

  :where(.space-y-0 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 0) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 0) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-y-1 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 1) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-y-2 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 2) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-y-3 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 3) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 3) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-y-4 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 4) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 4) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-y-6 > :not(:last-child)) {
    --tw-space-y-reverse: 0;
    margin-block-start: calc(calc(var(--spacing) * 6) * var(--tw-space-y-reverse));
    margin-block-end: calc(calc(var(--spacing) * 6) * calc(1 - var(--tw-space-y-reverse)));
  }

  :where(.space-x-1 > :not(:last-child)) {
    --tw-space-x-reverse: 0;
    margin-inline-start: calc(calc(var(--spacing) * 1) * var(--tw-space-x-reverse));
    margin-inline-end: calc(calc(var(--spacing) * 1) * calc(1 - var(--tw-space-x-reverse)));
  }

  :where(.divide-y > :not(:last-child)) {
    --tw-divide-y-reverse: 0;
    border-bottom-style: var(--tw-border-style);
    border-top-style: var(--tw-border-style);
    border-top-width: calc(1px * var(--tw-divide-y-reverse));
    border-bottom-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
  }

  .self-start {
    align-self: flex-start;
  }

  .justify-self-end {
    justify-self: flex-end;
  }

  .truncate {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .overflow-auto {
    overflow: auto;
  }

  .overflow-hidden {
    overflow: hidden;
  }

  .overflow-y-auto {
    overflow-y: auto;
  }

  .rounded-\[inherit\] {
    border-radius: inherit;
  }

  .rounded-full {
    border-radius: 3.40282e38px;
  }

  .rounded-lg {
    border-radius: var(--radius);
  }

  .rounded-md {
    border-radius: calc(var(--radius)  - 2px);
  }

  .rounded-none {
    border-radius: 0;
  }

  .rounded-xl {
    border-radius: calc(var(--radius)  + 4px);
  }

  .border {
    border-style: var(--tw-border-style);
    border-width: 1px;
  }

  .border-t {
    border-top-style: var(--tw-border-style);
    border-top-width: 1px;
  }

  .border-r {
    border-right-style: var(--tw-border-style);
    border-right-width: 1px;
  }

  .border-b {
    border-bottom-style: var(--tw-border-style);
    border-bottom-width: 1px;
  }

  .border-l {
    border-left-style: var(--tw-border-style);
    border-left-width: 1px;
  }

  .border-l-4 {
    border-left-style: var(--tw-border-style);
    border-left-width: 4px;
  }

  .border-\[\#4b5563\] {
    border-color: #4b5563;
  }

  .border-\[\#374151\] {
    border-color: #374151;
  }

  .border-\[\#dc2626\] {
    border-color: #dc2626;
  }

  .border-blue-500 {
    border-color: var(--color-blue-500);
  }

  .border-gray-200 {
    border-color: var(--color-gray-200);
  }

  .border-gray-300 {
    border-color: var(--color-gray-300);
  }

  .border-green-300 {
    border-color: var(--color-green-300);
  }

  .border-input {
    border-color: var(--input);
  }

  .border-orange-500 {
    border-color: var(--color-orange-500);
  }

  .border-red-200 {
    border-color: var(--color-red-200);
  }

  .border-red-300 {
    border-color: var(--color-red-300);
  }

  .border-transparent {
    border-color: #0000;
  }

  .border-white {
    border-color: var(--color-white);
  }

  .border-yellow-200 {
    border-color: var(--color-yellow-200);
  }

  .border-yellow-300 {
    border-color: var(--color-yellow-300);
  }

  .border-t-transparent {
    border-top-color: #0000;
  }

  .border-l-\[\#dc2626\] {
    border-left-color: #dc2626;
  }

  .border-l-transparent {
    border-left-color: #0000;
  }

  .bg-\[\#1f2937\] {
    background-color: #1f2937;
  }

  .bg-\[\#374151\] {
    background-color: #374151;
  }

  .bg-\[\#dc2626\] {
    background-color: #dc2626;
  }

  .bg-accent {
    background-color: var(--accent);
  }

  .bg-background {
    background-color: var(--background);
  }

  .bg-black\/50 {
    background-color: #00000080;
  }

  @supports (color: color-mix(in lab, red, red)) {
    .bg-black\/50 {
      background-color: color-mix(in oklab, var(--color-black) 50%, transparent);
    }
  }

  .bg-blue-50 {
    background-color: var(--color-blue-50);
  }

  .bg-blue-100 {
    background-color: var(--color-blue-100);
  }

  .bg-border {
    background-color: var(--border);
  }

  .bg-card {
    background-color: var(--card);
  }

  .bg-destructive {
    background-color: var(--destructive);
  }

  .bg-gray-50 {
    background-color: var(--color-gray-50);
  }

  .bg-gray-100 {
    background-color: var(--color-gray-100);
  }

  .bg-gray-200 {
    background-color: var(--color-gray-200);
  }

  .bg-green-100 {
    background-color: var(--color-green-100);
  }

  .bg-input-background {
    background-color: var(--input-background);
  }

  .bg-muted {
    background-color: var(--muted);
  }

  .bg-orange-50 {
    background-color: var(--color-orange-50);
  }

  .bg-orange-100 {
    background-color: var(--color-orange-100);
  }

  .bg-primary {
    background-color: var(--primary);
  }

  .bg-primary\/20 {
    background-color: var(--primary);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .bg-primary\/20 {
      background-color: color-mix(in oklab, var(--primary) 20%, transparent);
    }
  }

  .bg-purple-100 {
    background-color: var(--color-purple-100);
  }

  .bg-red-50 {
    background-color: var(--color-red-50);
  }

  .bg-red-50\/30 {
    background-color: color-mix(in srgb, oklch(.971 .013 17.38) 30%, transparent);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .bg-red-50\/30 {
      background-color: color-mix(in oklab, var(--color-red-50) 30%, transparent);
    }
  }

  .bg-red-100 {
    background-color: var(--color-red-100);
  }

  .bg-secondary {
    background-color: var(--secondary);
  }

  .bg-transparent {
    background-color: #0000;
  }

  .bg-white {
    background-color: var(--color-white);
  }

  .bg-yellow-50 {
    background-color: var(--color-yellow-50);
  }

  .bg-yellow-100 {
    background-color: var(--color-yellow-100);
  }

  .bg-gradient-to-br {
    --tw-gradient-position: to bottom right in oklab;
    background-image: linear-gradient(var(--tw-gradient-stops));
  }

  .from-\[\#374151\] {
    --tw-gradient-from: #374151;
    --tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position));
  }

  .from-\[\#dc2626\] {
    --tw-gradient-from: #dc2626;
    --tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position));
  }

  .via-\[\#991b1b\] {
    --tw-gradient-via: #991b1b;
    --tw-gradient-via-stops: var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-via) var(--tw-gradient-via-position), var(--tw-gradient-to) var(--tw-gradient-to-position);
    --tw-gradient-stops: var(--tw-gradient-via-stops);
  }

  .to-\[\#374151\] {
    --tw-gradient-to: #374151;
    --tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position));
  }

  .to-\[\#b91c1c\] {
    --tw-gradient-to: #b91c1c;
    --tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position));
  }

  .to-\[\#dc2626\] {
    --tw-gradient-to: #dc2626;
    --tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position));
  }

  .object-contain {
    object-fit: contain;
  }

  .object-cover {
    object-fit: cover;
  }

  .p-0 {
    padding: calc(var(--spacing) * 0);
  }

  .p-2 {
    padding: calc(var(--spacing) * 2);
  }

  .p-3 {
    padding: calc(var(--spacing) * 3);
  }

  .p-4 {
    padding: calc(var(--spacing) * 4);
  }

  .p-6 {
    padding: calc(var(--spacing) * 6);
  }

  .p-8 {
    padding: calc(var(--spacing) * 8);
  }

  .p-\[3px\] {
    padding: 3px;
  }

  .p-px {
    padding: 1px;
  }

  .px-1\.5 {
    padding-inline: calc(var(--spacing) * 1.5);
  }

  .px-2 {
    padding-inline: calc(var(--spacing) * 2);
  }

  .px-3 {
    padding-inline: calc(var(--spacing) * 3);
  }

  .px-4 {
    padding-inline: calc(var(--spacing) * 4);
  }

  .px-6 {
    padding-inline: calc(var(--spacing) * 6);
  }

  .py-0\.5 {
    padding-block: calc(var(--spacing) * .5);
  }

  .py-1 {
    padding-block: calc(var(--spacing) * 1);
  }

  .py-2 {
    padding-block: calc(var(--spacing) * 2);
  }

  .py-3 {
    padding-block: calc(var(--spacing) * 3);
  }

  .py-4 {
    padding-block: calc(var(--spacing) * 4);
  }

  .py-12 {
    padding-block: calc(var(--spacing) * 12);
  }

  .pt-1 {
    padding-top: calc(var(--spacing) * 1);
  }

  .pt-4 {
    padding-top: calc(var(--spacing) * 4);
  }

  .pt-6 {
    padding-top: calc(var(--spacing) * 6);
  }

  .pr-10 {
    padding-right: calc(var(--spacing) * 10);
  }

  .pb-2 {
    padding-bottom: calc(var(--spacing) * 2);
  }

  .pb-6 {
    padding-bottom: calc(var(--spacing) * 6);
  }

  .pl-10 {
    padding-left: calc(var(--spacing) * 10);
  }

  .text-center {
    text-align: center;
  }

  .text-left {
    text-align: left;
  }

  .text-right {
    text-align: right;
  }

  .text-2xl {
    font-size: var(--text-2xl);
    line-height: var(--tw-leading, var(--text-2xl--line-height));
  }

  .text-3xl {
    font-size: var(--text-3xl);
    line-height: var(--tw-leading, var(--text-3xl--line-height));
  }

  .text-base {
    font-size: var(--text-base);
    line-height: var(--tw-leading, var(--text-base--line-height));
  }

  .text-lg {
    font-size: var(--text-lg);
    line-height: var(--tw-leading, var(--text-lg--line-height));
  }

  .text-sm {
    font-size: var(--text-sm);
    line-height: var(--tw-leading, var(--text-sm--line-height));
  }

  .text-xl {
    font-size: var(--text-xl);
    line-height: var(--tw-leading, var(--text-xl--line-height));
  }

  .text-xs {
    font-size: var(--text-xs);
    line-height: var(--tw-leading, var(--text-xs--line-height));
  }

  .text-\[0\.8rem\] {
    font-size: .8rem;
  }

  .leading-none {
    --tw-leading: 1;
    line-height: 1;
  }

  .font-bold {
    --tw-font-weight: var(--font-weight-bold);
    font-weight: var(--font-weight-bold);
  }

  .font-medium {
    --tw-font-weight: var(--font-weight-medium);
    font-weight: var(--font-weight-medium);
  }

  .font-normal {
    --tw-font-weight: var(--font-weight-normal);
    font-weight: var(--font-weight-normal);
  }

  .font-semibold {
    --tw-font-weight: var(--font-weight-semibold);
    font-weight: var(--font-weight-semibold);
  }

  .tracking-tight {
    --tw-tracking: var(--tracking-tight);
    letter-spacing: var(--tracking-tight);
  }

  .whitespace-nowrap {
    white-space: nowrap;
  }

  .text-\[\#374151\] {
    color: #374151;
  }

  .text-\[\#dc2626\] {
    color: #dc2626;
  }

  .text-accent-foreground {
    color: var(--accent-foreground);
  }

  .text-blue-600 {
    color: var(--color-blue-600);
  }

  .text-blue-700 {
    color: var(--color-blue-700);
  }

  .text-card-foreground {
    color: var(--card-foreground);
  }

  .text-foreground {
    color: var(--foreground);
  }

  .text-gray-300 {
    color: var(--color-gray-300);
  }

  .text-gray-400 {
    color: var(--color-gray-400);
  }

  .text-gray-500 {
    color: var(--color-gray-500);
  }

  .text-gray-600 {
    color: var(--color-gray-600);
  }

  .text-gray-800 {
    color: var(--color-gray-800);
  }

  .text-gray-900 {
    color: var(--color-gray-900);
  }

  .text-green-500 {
    color: var(--color-green-500);
  }

  .text-green-600 {
    color: var(--color-green-600);
  }

  .text-green-700 {
    color: var(--color-green-700);
  }

  .text-green-800 {
    color: var(--color-green-800);
  }

  .text-muted-foreground {
    color: var(--muted-foreground);
  }

  .text-orange-500 {
    color: var(--color-orange-500);
  }

  .text-orange-600 {
    color: var(--color-orange-600);
  }

  .text-orange-700 {
    color: var(--color-orange-700);
  }

  .text-primary {
    color: var(--primary);
  }

  .text-primary-foreground {
    color: var(--primary-foreground);
  }

  .text-purple-600 {
    color: var(--color-purple-600);
  }

  .text-red-500 {
    color: var(--color-red-500);
  }

  .text-red-600 {
    color: var(--color-red-600);
  }

  .text-red-800 {
    color: var(--color-red-800);
  }

  .text-red-900 {
    color: var(--color-red-900);
  }

  .text-secondary-foreground {
    color: var(--secondary-foreground);
  }

  .text-white {
    color: var(--color-white);
  }

  .text-yellow-600 {
    color: var(--color-yellow-600);
  }

  .text-yellow-800 {
    color: var(--color-yellow-800);
  }

  .text-yellow-900 {
    color: var(--color-yellow-900);
  }

  .capitalize {
    text-transform: capitalize;
  }

  .lowercase {
    text-transform: lowercase;
  }

  .uppercase {
    text-transform: uppercase;
  }

  .underline-offset-4 {
    text-underline-offset: 4px;
  }

  .opacity-50 {
    opacity: .5;
  }

  .shadow-2xl {
    --tw-shadow: 0 25px 50px -12px var(--tw-shadow-color, #00000040);
    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }

  .shadow-lg {
    --tw-shadow: 0 10px 15px -3px var(--tw-shadow-color, #0000001a), 0 4px 6px -4px var(--tw-shadow-color, #0000001a);
    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }

  .outline {
    outline-style: var(--tw-outline-style);
    outline-width: 1px;
  }

  .filter {
    filter: var(--tw-blur, ) var(--tw-brightness, ) var(--tw-contrast, ) var(--tw-grayscale, ) var(--tw-hue-rotate, ) var(--tw-invert, ) var(--tw-saturate, ) var(--tw-sepia, ) var(--tw-drop-shadow, );
  }

  .transition-\[color\,box-shadow\] {
    transition-property: color, box-shadow;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }

  .transition-all {
    transition-property: all;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }

  .transition-colors {
    transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }

  .transition-transform {
    transition-property: transform, translate, scale, rotate;
    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
    transition-duration: var(--tw-duration, var(--default-transition-duration));
  }

  .duration-200 {
    --tw-duration: .2s;
    transition-duration: .2s;
  }

  .duration-300 {
    --tw-duration: .3s;
    transition-duration: .3s;
  }

  .outline-none {
    --tw-outline-style: none;
    outline-style: none;
  }

  .select-none {
    -webkit-user-select: none;
    user-select: none;
  }

  .group-data-\[disabled\=true\]\:pointer-events-none:is(:where(.group)[data-disabled="true"] *) {
    pointer-events: none;
  }

  .group-data-\[disabled\=true\]\:opacity-50:is(:where(.group)[data-disabled="true"] *) {
    opacity: .5;
  }

  .peer-disabled\:cursor-not-allowed:is(:where(.peer):disabled ~ *) {
    cursor: not-allowed;
  }

  .peer-disabled\:opacity-50:is(:where(.peer):disabled ~ *) {
    opacity: .5;
  }

  .selection\:bg-primary ::selection, .selection\:bg-primary::selection {
    background-color: var(--primary);
  }

  .selection\:text-primary-foreground ::selection, .selection\:text-primary-foreground::selection {
    color: var(--primary-foreground);
  }

  .file\:inline-flex::file-selector-button {
    display: inline-flex;
  }

  .file\:h-7::file-selector-button {
    height: calc(var(--spacing) * 7);
  }

  .file\:border-0::file-selector-button {
    border-style: var(--tw-border-style);
    border-width: 0;
  }

  .file\:bg-transparent::file-selector-button {
    background-color: #0000;
  }

  .file\:text-sm::file-selector-button {
    font-size: var(--text-sm);
    line-height: var(--tw-leading, var(--text-sm--line-height));
  }

  .file\:font-medium::file-selector-button {
    --tw-font-weight: var(--font-weight-medium);
    font-weight: var(--font-weight-medium);
  }

  .file\:text-foreground::file-selector-button {
    color: var(--foreground);
  }

  .placeholder\:text-gray-400::placeholder {
    color: var(--color-gray-400);
  }

  .placeholder\:text-muted-foreground::placeholder {
    color: var(--muted-foreground);
  }

  .focus-within\:relative:focus-within {
    position: relative;
  }

  .focus-within\:z-20:focus-within {
    z-index: 20;
  }

  @media (hover: hover) {
    .hover\:scale-105:hover {
      --tw-scale-x: 105%;
      --tw-scale-y: 105%;
      --tw-scale-z: 105%;
      scale: var(--tw-scale-x) var(--tw-scale-y);
    }
  }

  @media (hover: hover) {
    .hover\:bg-\[\#374151\]:hover {
      background-color: #374151;
    }
  }

  @media (hover: hover) {
    .hover\:bg-\[\#b91c1c\]:hover {
      background-color: #b91c1c;
    }
  }

  @media (hover: hover) {
    .hover\:bg-\[\#dc2626\]:hover {
      background-color: #dc2626;
    }
  }

  @media (hover: hover) {
    .hover\:bg-accent:hover {
      background-color: var(--accent);
    }
  }

  @media (hover: hover) {
    .hover\:bg-destructive\/90:hover {
      background-color: var(--destructive);
    }

    @supports (color: color-mix(in lab, red, red)) {
      .hover\:bg-destructive\/90:hover {
        background-color: color-mix(in oklab, var(--destructive) 90%, transparent);
      }
    }
  }

  @media (hover: hover) {
    .hover\:bg-gray-50:hover {
      background-color: var(--color-gray-50);
    }
  }

  @media (hover: hover) {
    .hover\:bg-primary:hover {
      background-color: var(--primary);
    }
  }

  @media (hover: hover) {
    .hover\:bg-primary\/90:hover {
      background-color: var(--primary);
    }

    @supports (color: color-mix(in lab, red, red)) {
      .hover\:bg-primary\/90:hover {
        background-color: color-mix(in oklab, var(--primary) 90%, transparent);
      }
    }
  }

  @media (hover: hover) {
    .hover\:bg-red-50:hover {
      background-color: var(--color-red-50);
    }
  }

  @media (hover: hover) {
    .hover\:bg-secondary\/80:hover {
      background-color: var(--secondary);
    }

    @supports (color: color-mix(in lab, red, red)) {
      .hover\:bg-secondary\/80:hover {
        background-color: color-mix(in oklab, var(--secondary) 80%, transparent);
      }
    }
  }

  @media (hover: hover) {
    .hover\:bg-white:hover {
      background-color: var(--color-white);
    }
  }

  @media (hover: hover) {
    .hover\:bg-white\/10:hover {
      background-color: #ffffff1a;
    }

    @supports (color: color-mix(in lab, red, red)) {
      .hover\:bg-white\/10:hover {
        background-color: color-mix(in oklab, var(--color-white) 10%, transparent);
      }
    }
  }

  @media (hover: hover) {
    .hover\:text-\[\#374151\]:hover {
      color: #374151;
    }
  }

  @media (hover: hover) {
    .hover\:text-\[\#b91c1c\]:hover {
      color: #b91c1c;
    }
  }

  @media (hover: hover) {
    .hover\:text-\[\#dc2626\]:hover {
      color: #dc2626;
    }
  }

  @media (hover: hover) {
    .hover\:text-accent-foreground:hover {
      color: var(--accent-foreground);
    }
  }

  @media (hover: hover) {
    .hover\:text-gray-700:hover {
      color: var(--color-gray-700);
    }
  }

  @media (hover: hover) {
    .hover\:text-primary-foreground:hover {
      color: var(--primary-foreground);
    }
  }

  @media (hover: hover) {
    .hover\:text-white:hover {
      color: var(--color-white);
    }
  }

  @media (hover: hover) {
    .hover\:underline:hover {
      text-decoration-line: underline;
    }
  }

  @media (hover: hover) {
    .hover\:opacity-100:hover {
      opacity: 1;
    }
  }

  @media (hover: hover) {
    .hover\:shadow-md:hover {
      --tw-shadow: 0 4px 6px -1px var(--tw-shadow-color, #0000001a), 0 2px 4px -2px var(--tw-shadow-color, #0000001a);
      box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
    }
  }

  .focus\:bg-primary:focus {
    background-color: var(--primary);
  }

  .focus\:text-primary-foreground:focus {
    color: var(--primary-foreground);
  }

  .focus-visible\:border-ring:focus-visible {
    border-color: var(--ring);
  }

  .focus-visible\:ring-\[3px\]:focus-visible {
    --tw-ring-shadow: var(--tw-ring-inset, ) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor);
    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);
  }

  .focus-visible\:ring-\[\#dc2626\]:focus-visible {
    --tw-ring-color: #dc2626;
  }

  .focus-visible\:ring-destructive\/20:focus-visible {
    --tw-ring-color: var(--destructive);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .focus-visible\:ring-destructive\/20:focus-visible {
      --tw-ring-color: color-mix(in oklab, var(--destructive) 20%, transparent);
    }
  }

  .focus-visible\:ring-ring\/50:focus-visible {
    --tw-ring-color: var(--ring);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .focus-visible\:ring-ring\/50:focus-visible {
      --tw-ring-color: color-mix(in oklab, var(--ring) 50%, transparent);
    }
  }

  .focus-visible\:outline-1:focus-visible {
    outline-style: var(--tw-outline-style);
    outline-width: 1px;
  }

  .focus-visible\:outline-ring:focus-visible {
    outline-color: var(--ring);
  }

  .disabled\:pointer-events-none:disabled {
    pointer-events: none;
  }

  .disabled\:cursor-not-allowed:disabled {
    cursor: not-allowed;
  }

  .disabled\:opacity-50:disabled {
    opacity: .5;
  }

  .has-data-\[slot\=card-action\]\:grid-cols-\[1fr_auto\]:has([data-slot="card-action"]) {
    grid-template-columns: 1fr auto;
  }

  .has-\[\>svg\]\:px-2\.5:has( > svg) {
    padding-inline: calc(var(--spacing) * 2.5);
  }

  .has-\[\>svg\]\:px-3:has( > svg) {
    padding-inline: calc(var(--spacing) * 3);
  }

  .has-\[\>svg\]\:px-4:has( > svg) {
    padding-inline: calc(var(--spacing) * 4);
  }

  .aria-invalid\:border-destructive[aria-invalid="true"] {
    border-color: var(--destructive);
  }

  .aria-invalid\:ring-destructive\/20[aria-invalid="true"] {
    --tw-ring-color: var(--destructive);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .aria-invalid\:ring-destructive\/20[aria-invalid="true"] {
      --tw-ring-color: color-mix(in oklab, var(--destructive) 20%, transparent);
    }
  }

  .aria-selected\:bg-accent[aria-selected="true"] {
    background-color: var(--accent);
  }

  .aria-selected\:bg-primary[aria-selected="true"] {
    background-color: var(--primary);
  }

  .aria-selected\:text-accent-foreground[aria-selected="true"] {
    color: var(--accent-foreground);
  }

  .aria-selected\:text-muted-foreground[aria-selected="true"] {
    color: var(--muted-foreground);
  }

  .aria-selected\:text-primary-foreground[aria-selected="true"] {
    color: var(--primary-foreground);
  }

  .aria-selected\:opacity-100[aria-selected="true"] {
    opacity: 1;
  }

  .data-\[state\=active\]\:bg-card[data-state="active"] {
    background-color: var(--card);
  }

  .data-\[state\=closed\]\:animate-out[data-state="closed"] {
    animation: exit var(--tw-duration, .15s) var(--tw-ease, ease);
  }

  .data-\[state\=closed\]\:fade-out-0[data-state="closed"] {
    --tw-exit-opacity: 0;
  }

  .data-\[state\=closed\]\:zoom-out-95[data-state="closed"] {
    --tw-exit-scale: .95;
  }

  .data-\[state\=open\]\:animate-in[data-state="open"] {
    animation: enter var(--tw-duration, .15s) var(--tw-ease, ease);
  }

  .data-\[state\=open\]\:fade-in-0[data-state="open"] {
    --tw-enter-opacity: 0;
  }

  .data-\[state\=open\]\:zoom-in-95[data-state="open"] {
    --tw-enter-scale: .95;
  }

  @media (width >= 40rem) {
    .sm\:max-w-lg {
      max-width: var(--container-lg);
    }
  }

  @media (width >= 40rem) {
    .sm\:flex-row {
      flex-direction: row;
    }
  }

  @media (width >= 40rem) {
    .sm\:justify-end {
      justify-content: flex-end;
    }
  }

  @media (width >= 40rem) {
    .sm\:text-left {
      text-align: left;
    }
  }

  @media (width >= 48rem) {
    .md\:block {
      display: block;
    }
  }

  @media (width >= 48rem) {
    .md\:hidden {
      display: none;
    }
  }

  @media (width >= 48rem) {
    .md\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width >= 48rem) {
    .md\:text-sm {
      font-size: var(--text-sm);
      line-height: var(--tw-leading, var(--text-sm--line-height));
    }
  }

  @media (width >= 64rem) {
    .lg\:col-span-2 {
      grid-column: span 2 / span 2;
    }
  }

  @media (width >= 64rem) {
    .lg\:w-96 {
      width: calc(var(--spacing) * 96);
    }
  }

  @media (width >= 64rem) {
    .lg\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width >= 64rem) {
    .lg\:grid-cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .dark\:border-input:is(.dark *) {
    border-color: var(--input);
  }

  .dark\:bg-destructive\/60:is(.dark *) {
    background-color: var(--destructive);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .dark\:bg-destructive\/60:is(.dark *) {
      background-color: color-mix(in oklab, var(--destructive) 60%, transparent);
    }
  }

  .dark\:bg-input\/30:is(.dark *) {
    background-color: var(--input);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .dark\:bg-input\/30:is(.dark *) {
      background-color: color-mix(in oklab, var(--input) 30%, transparent);
    }
  }

  .dark\:text-muted-foreground:is(.dark *) {
    color: var(--muted-foreground);
  }

  @media (hover: hover) {
    .dark\:hover\:bg-accent\/50:is(.dark *):hover {
      background-color: var(--accent);
    }

    @supports (color: color-mix(in lab, red, red)) {
      .dark\:hover\:bg-accent\/50:is(.dark *):hover {
        background-color: color-mix(in oklab, var(--accent) 50%, transparent);
      }
    }
  }

  @media (hover: hover) {
    .dark\:hover\:bg-input\/50:is(.dark *):hover {
      background-color: var(--input);
    }

    @supports (color: color-mix(in lab, red, red)) {
      .dark\:hover\:bg-input\/50:is(.dark *):hover {
        background-color: color-mix(in oklab, var(--input) 50%, transparent);
      }
    }
  }

  .dark\:focus-visible\:ring-destructive\/40:is(.dark *):focus-visible {
    --tw-ring-color: var(--destructive);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .dark\:focus-visible\:ring-destructive\/40:is(.dark *):focus-visible {
      --tw-ring-color: color-mix(in oklab, var(--destructive) 40%, transparent);
    }
  }

  .dark\:aria-invalid\:ring-destructive\/40:is(.dark *)[aria-invalid="true"] {
    --tw-ring-color: var(--destructive);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .dark\:aria-invalid\:ring-destructive\/40:is(.dark *)[aria-invalid="true"] {
      --tw-ring-color: color-mix(in oklab, var(--destructive) 40%, transparent);
    }
  }

  .dark\:data-\[state\=active\]\:border-input:is(.dark *)[data-state="active"] {
    border-color: var(--input);
  }

  .dark\:data-\[state\=active\]\:bg-input\/30:is(.dark *)[data-state="active"] {
    background-color: var(--input);
  }

  @supports (color: color-mix(in lab, red, red)) {
    .dark\:data-\[state\=active\]\:bg-input\/30:is(.dark *)[data-state="active"] {
      background-color: color-mix(in oklab, var(--input) 30%, transparent);
    }
  }

  .dark\:data-\[state\=active\]\:text-foreground:is(.dark *)[data-state="active"] {
    color: var(--foreground);
  }

  .\[\&_svg\]\:pointer-events-none svg {
    pointer-events: none;
  }

  .\[\&_svg\]\:shrink-0 svg {
    flex-shrink: 0;
  }

  .\[\&_svg\:not\(\[class\*\=\'size-\'\]\)\]\:size-4 svg:not([class*="size-"]) {
    width: calc(var(--spacing) * 4);
    height: calc(var(--spacing) * 4);
  }

  .\[\&\:has\(\>\.day-range-end\)\]\:rounded-r-md:has( > .day-range-end) {
    border-top-right-radius: calc(var(--radius)  - 2px);
    border-bottom-right-radius: calc(var(--radius)  - 2px);
  }

  .\[\&\:has\(\>\.day-range-start\)\]\:rounded-l-md:has( > .day-range-start) {
    border-top-left-radius: calc(var(--radius)  - 2px);
    border-bottom-left-radius: calc(var(--radius)  - 2px);
  }

  .\[\&\:has\(\[aria-selected\]\)\]\:rounded-md:has([aria-selected]) {
    border-radius: calc(var(--radius)  - 2px);
  }

  .\[\&\:has\(\[aria-selected\]\)\]\:bg-accent:has([aria-selected]) {
    background-color: var(--accent);
  }

  .first\:\[\&\:has\(\[aria-selected\]\)\]\:rounded-l-md:first-child:has([aria-selected]) {
    border-top-left-radius: calc(var(--radius)  - 2px);
    border-bottom-left-radius: calc(var(--radius)  - 2px);
  }

  .last\:\[\&\:has\(\[aria-selected\]\)\]\:rounded-r-md:last-child:has([aria-selected]) {
    border-top-right-radius: calc(var(--radius)  - 2px);
    border-bottom-right-radius: calc(var(--radius)  - 2px);
  }

  .\[\&\:has\(\[aria-selected\]\.day-range-end\)\]\:rounded-r-md:has([aria-selected].day-range-end) {
    border-top-right-radius: calc(var(--radius)  - 2px);
    border-bottom-right-radius: calc(var(--radius)  - 2px);
  }

  .\[\.border-b\]\:pb-6.border-b {
    padding-bottom: calc(var(--spacing) * 6);
  }

  .\[\.border-t\]\:pt-6.border-t {
    padding-top: calc(var(--spacing) * 6);
  }

  .\[\&\:last-child\]\:pb-6:last-child {
    padding-bottom: calc(var(--spacing) * 6);
  }

  .\[\&\>svg\]\:pointer-events-none > svg {
    pointer-events: none;
  }

  .\[\&\>svg\]\:size-3 > svg {
    width: calc(var(--spacing) * 3);
    height: calc(var(--spacing) * 3);
  }

  @media (hover: hover) {
    a.\[a\&\]\:hover\:bg-accent:hover {
      background-color: var(--accent);
    }
  }

  @media (hover: hover) {
    a.\[a\&\]\:hover\:bg-destructive\/90:hover {
      background-color: var(--destructive);
    }

    @supports (color: color-mix(in lab, red, red)) {
      a.\[a\&\]\:hover\:bg-destructive\/90:hover {
        background-color: color-mix(in oklab, var(--destructive) 90%, transparent);
      }
    }
  }

  @media (hover: hover) {
    a.\[a\&\]\:hover\:bg-primary\/90:hover {
      background-color: var(--primary);
    }

    @supports (color: color-mix(in lab, red, red)) {
      a.\[a\&\]\:hover\:bg-primary\/90:hover {
        background-color: color-mix(in oklab, var(--primary) 90%, transparent);
      }
    }
  }

  @media (hover: hover) {
    a.\[a\&\]\:hover\:bg-secondary\/90:hover {
      background-color: var(--secondary);
    }

    @supports (color: color-mix(in lab, red, red)) {
      a.\[a\&\]\:hover\:bg-secondary\/90:hover {
        background-color: color-mix(in oklab, var(--secondary) 90%, transparent);
      }
    }
  }

  @media (hover: hover) {
    a.\[a\&\]\:hover\:text-accent-foreground:hover {
      color: var(--accent-foreground);
    }
  }
}

:root {
  --font-size: 16px;
  --background: #fff;
  --foreground: oklch(.145 0 0);
  --card: #fff;
  --card-foreground: oklch(.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(.145 0 0);
  --primary: #dc2626;
  --primary-foreground: #fff;
  --secondary: #374151;
  --secondary-foreground: #fff;
  --muted: #ececf0;
  --muted-foreground: #717182;
  --accent: #e9ebef;
  --accent-foreground: #030213;
  --destructive: #dc2626;
  --destructive-foreground: #fff;
  --border: #0000001a;
  --input: transparent;
  --input-background: #f3f3f5;
  --switch-background: #cbced4;
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --ring: #dc2626;
  --chart-1: oklch(.646 .222 41.116);
  --chart-2: oklch(.6 .118 184.704);
  --chart-3: oklch(.398 .07 227.392);
  --chart-4: oklch(.828 .189 84.429);
  --chart-5: oklch(.769 .188 70.08);
  --radius: .625rem;
  --sidebar: #1f2937;
  --sidebar-foreground: #fff;
  --sidebar-primary: #dc2626;
  --sidebar-primary-foreground: #fff;
  --sidebar-accent: #374151;
  --sidebar-accent-foreground: #fff;
  --sidebar-border: #374151;
  --sidebar-ring: #dc2626;
}

.dark {
  --background: oklch(.145 0 0);
  --foreground: oklch(.985 0 0);
  --card: oklch(.145 0 0);
  --card-foreground: oklch(.985 0 0);
  --popover: oklch(.145 0 0);
  --popover-foreground: oklch(.985 0 0);
  --primary: oklch(.985 0 0);
  --primary-foreground: oklch(.205 0 0);
  --secondary: oklch(.269 0 0);
  --secondary-foreground: oklch(.985 0 0);
  --muted: oklch(.269 0 0);
  --muted-foreground: oklch(.708 0 0);
  --accent: oklch(.269 0 0);
  --accent-foreground: oklch(.985 0 0);
  --destructive: oklch(.396 .141 25.723);
  --destructive-foreground: oklch(.637 .237 25.331);
  --border: oklch(.269 0 0);
  --input: oklch(.269 0 0);
  --ring: oklch(.439 0 0);
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --chart-1: oklch(.488 .243 264.376);
  --chart-2: oklch(.696 .17 162.48);
  --chart-3: oklch(.769 .188 70.08);
  --chart-4: oklch(.627 .265 303.9);
  --chart-5: oklch(.645 .246 16.439);
  --sidebar: oklch(.205 0 0);
  --sidebar-foreground: oklch(.985 0 0);
  --sidebar-primary: oklch(.488 .243 264.376);
  --sidebar-primary-foreground: oklch(.985 0 0);
  --sidebar-accent: oklch(.269 0 0);
  --sidebar-accent-foreground: oklch(.985 0 0);
  --sidebar-border: oklch(.269 0 0);
  --sidebar-ring: oklch(.439 0 0);
}

html {
  font-size: var(--font-size);
}

@property --tw-translate-x {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-translate-y {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-translate-z {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-rotate-x {
  syntax: "*";
  inherits: false;
  initial-value: rotateX(0);
}

@property --tw-rotate-y {
  syntax: "*";
  inherits: false;
  initial-value: rotateY(0);
}

@property --tw-rotate-z {
  syntax: "*";
  inherits: false;
  initial-value: rotateZ(0);
}

@property --tw-skew-x {
  syntax: "*";
  inherits: false;
  initial-value: skewX(0);
}

@property --tw-skew-y {
  syntax: "*";
  inherits: false;
  initial-value: skewY(0);
}

@property --tw-space-y-reverse {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-space-x-reverse {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-divide-y-reverse {
  syntax: "*";
  inherits: false;
  initial-value: 0;
}

@property --tw-border-style {
  syntax: "*";
  inherits: false;
  initial-value: solid;
}

@property --tw-gradient-position {
  syntax: "*";
  inherits: false
}

@property --tw-gradient-from {
  syntax: "<color>";
  inherits: false;
  initial-value: #0000;
}

@property --tw-gradient-via {
  syntax: "<color>";
  inherits: false;
  initial-value: #0000;
}

@property --tw-gradient-to {
  syntax: "<color>";
  inherits: false;
  initial-value: #0000;
}

@property --tw-gradient-stops {
  syntax: "*";
  inherits: false
}

@property --tw-gradient-via-stops {
  syntax: "*";
  inherits: false
}

@property --tw-gradient-from-position {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0%;
}

@property --tw-gradient-via-position {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 50%;
}

@property --tw-gradient-to-position {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 100%;
}

@property --tw-leading {
  syntax: "*";
  inherits: false
}

@property --tw-font-weight {
  syntax: "*";
  inherits: false
}

@property --tw-tracking {
  syntax: "*";
  inherits: false
}

@property --tw-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

@property --tw-shadow-color {
  syntax: "*";
  inherits: false
}

@property --tw-shadow-alpha {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 100%;
}

@property --tw-inset-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

@property --tw-inset-shadow-color {
  syntax: "*";
  inherits: false
}

@property --tw-inset-shadow-alpha {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 100%;
}

@property --tw-ring-color {
  syntax: "*";
  inherits: false
}

@property --tw-ring-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

@property --tw-inset-ring-color {
  syntax: "*";
  inherits: false
}

@property --tw-inset-ring-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

@property --tw-ring-inset {
  syntax: "*";
  inherits: false
}

@property --tw-ring-offset-width {
  syntax: "<length>";
  inherits: false;
  initial-value: 0;
}

@property --tw-ring-offset-color {
  syntax: "*";
  inherits: false;
  initial-value: #fff;
}

@property --tw-ring-offset-shadow {
  syntax: "*";
  inherits: false;
  initial-value: 0 0 #0000;
}

@property --tw-outline-style {
  syntax: "*";
  inherits: false;
  initial-value: solid;
}

@property --tw-blur {
  syntax: "*";
  inherits: false
}

@property --tw-brightness {
  syntax: "*";
  inherits: false
}

@property --tw-contrast {
  syntax: "*";
  inherits: false
}

@property --tw-grayscale {
  syntax: "*";
  inherits: false
}

@property --tw-hue-rotate {
  syntax: "*";
  inherits: false
}

@property --tw-invert {
  syntax: "*";
  inherits: false
}

@property --tw-opacity {
  syntax: "*";
  inherits: false
}

@property --tw-saturate {
  syntax: "*";
  inherits: false
}

@property --tw-sepia {
  syntax: "*";
  inherits: false
}

@property --tw-drop-shadow {
  syntax: "*";
  inherits: false
}

@property --tw-drop-shadow-color {
  syntax: "*";
  inherits: false
}

@property --tw-drop-shadow-alpha {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 100%;
}

@property --tw-drop-shadow-size {
  syntax: "*";
  inherits: false
}

@property --tw-duration {
  syntax: "*";
  inherits: false
}

@property --tw-scale-x {
  syntax: "*";
  inherits: false;
  initial-value: 1;
}

@property --tw-scale-y {
  syntax: "*";
  inherits: false;
  initial-value: 1;
}

@property --tw-scale-z {
  syntax: "*";
  inherits: false;
  initial-value: 1;
}

@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0));
  }
}

@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0));
  }
}



// ================================================================================
// FILE: src\layouts\DashboardLayout.jsx
// ================================================================================

import Sidebar from './Sidebar'
import TopBar from './TopBar'

const DashboardLayout = ({ 
  children, 
  role, 
  userName, 
  currentPage, 
  onNavigate, 
  onProfile,
  onNotifications,
  onMessages
}) => {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar 
              role={role} 
              currentPage={currentPage} 
              onNavigate={onNavigate} 
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <TopBar 
                  userName={userName} 
                  onProfile={onProfile}
                  onNotifications={onNotifications}
                  onMessages={onMessages}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout



// ================================================================================
// FILE: src\layouts\Sidebar.jsx
// ================================================================================

import React from 'react';
import { cn } from '@/components/ui/utils';
import {
  LayoutDashboard,
  User,
  LogOut,
  BookOpen,
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = ({ role, currentPage, onNavigate }) => {
  const { logout } = useAuth();

  const getNavItems = () => {
    const dashboardItem = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />
      }
    ];

    const roleSpecificItems = {
      student: [
        { id: 'courses', label: 'My Courses', icon: <BookOpen className="h-5 w-5" /> },
        { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> }
      ],
      teacher: [
        { id: 'sections', label: 'My Sections', icon: <Users className="h-5 w-5" /> },
        { id: 'classes', label: 'My Classes', icon: <Users className="h-5 w-5" /> }
      ],
      admin: [
        { id: 'users', label: 'Manage Users', icon: <Users className="h-5 w-5" /> },
        { id: 'sections', label: 'Manage Sections', icon: <Users className="h-5 w-5" /> },
        { id: 'classes', label: 'Manage Classes', icon: <BookOpen className="h-5 w-5" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }
      ]
    };

    // Combine dashboard + role-specific items
    return [...dashboardItem, ...(roleSpecificItems[role] || [])];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Nexora</h1>
        <p className="text-xs text-muted-foreground mt-1 capitalize">{role} Portal</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 transform',
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow hover:scale-105'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10 hover:shadow hover:scale-105"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;



// ================================================================================
// FILE: src\layouts\TopBar.jsx
// ================================================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, User, Menu } from 'lucide-react';

const TopBar = ({ userName, onProfile, onNotifications, onMessages }) => {
  return (
    <header className="h-16 bg-white border-b px-4 md:px-6 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h2 className="text-sm md:text-lg font-semibold truncate">
          Welcome, {userName || 'User'}
        </h2>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Messages button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMessages}
          className="transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Notifications button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNotifications}
          className="transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-1" />

        {/* Profile button */}
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 pl-2 transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
          onClick={onProfile}
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 transform hover:scale-110">
            <User className="h-5 w-5 text-primary" />
          </div>
          <span className="hidden md:inline text-sm font-medium">Profile</span>
        </Button>
      </div>
    </header>
  );
};

export default TopBar;



// ================================================================================
// FILE: src\main.jsx
// ================================================================================



import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "./App.jsx";
import "./index.css";
const root = document.getElementById("root");

createRoot(root).render(
    <AuthProvider>
        <App />
    </AuthProvider>
);




// ================================================================================
// FILE: src\pages\admin\ClassManagementPage.jsx
// ================================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/services/api";
import CreateClassModal from "@/components/modals/CreateClassModal";
import DeleteModal from "@/components/modals/DeleteModal";

const ClassManagementPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Classes
  // -------------------------
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/classes/all");
      if (response.data.success) {
        const transformedClasses = response.data.data.map((c) => ({
          _id: c.id,
          // denormalized subject fields (preferred)
          subjectName: c.subjectName || c.subject?.name || "Unknown",
          subjectCode: (c.subjectCode || c.subject?.code || "").toUpperCase(),
          subject: c.subjectName || c.subject?.name ? `${c.subjectName || c.subject?.name} (${(c.subjectCode || c.subject?.code || "").toUpperCase()})` : "Unknown",
          section: c.section?.name || "Unknown",
          sectionId: c.section?.id || null,
          teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "Unknown",
          teacherId: c.teacher?.id || null,
          gradeLevel: c.subjectGradeLevel || c.section?.gradeLevel || "—",
          schoolYear: c.schoolYear,
          schedule: c.schedule || "—",
          room: c.room || "—",
          isActive: c.isActive,
        }));
        setClasses(transformedClasses);
      }
    } catch (error) {
      console.error("Failed to load classes", error);
      toast.error("Failed to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // -------------------------
  // Add or Update Class
  // -------------------------
  const handleAddOrUpdateClass = async (classData) => {
    try {
      if (editingClass) {
        const response = await api.put(`/classes/${editingClass._id}`, classData);
        if (response.data.success) toast.success("Class updated successfully");
      } else {
        const response = await api.post("/classes", classData);
        if (response.data.success) toast.success("Class created successfully");
      }
      await fetchClasses();
      setIsModalOpen(false);
      setEditingClass(null);
    } catch (error) {
      console.error("Failed to save class", error);
      toast.error(error.response?.data?.message || "Failed to save class");
    }
  };

  // -------------------------
  // Delete Class
  // -------------------------
  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/classes/${classToDelete._id}`);
      toast.success("Class deleted successfully");
      setClasses(prev => prev.filter(c => c._id !== classToDelete._id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete class");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setClassToDelete(null);
    }
  };

  const confirmDeleteClass = (cls) => {
    setClassToDelete(cls);
    setIsDeleteModalOpen(true);
  };

  // -------------------------
  // Filter & Search
  // -------------------------
  const filteredClasses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return classes.filter(c => {
      const matchesGrade = selectedGrade === "all" ? true : c.gradeLevel === selectedGrade;
      const matchesSearch =
        c.subject.toLowerCase().includes(term) ||
        c.section.toLowerCase().includes(term) ||
        c.teacher.toLowerCase().includes(term) ||
        c.schedule.toLowerCase().includes(term) ||
        c.room.toLowerCase().includes(term) ||
        c.gradeLevel.toLowerCase().includes(term);
      return matchesGrade && matchesSearch;
    });
  }, [classes, searchTerm, selectedGrade]);

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = { width: "100%", minHeight: "100vh", padding: "40px 20px", background: "#f2f2f2", display: "flex", justifyContent: "center" };
  const cardStyle = { width: "100%", maxWidth: "1200px", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const buttonStyle = { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.2s"
  });
  const searchContainerStyle = { display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f5", padding: "8px 12px", borderRadius: "12px", border: "1px solid #ddd", maxWidth: "400px" };
  const tableContainerStyle = { overflowX: "auto", borderRadius: "12px", border: "1px solid #ddd", background: "#fff" };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = { textAlign: "left", padding: "12px 16px", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", color: "#4b5563", borderBottom: "1px solid #ddd" };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (active) => ({
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: active ? "#d1fae5" : "#fee2e2",
    color: active ? "#059669" : "#dc2626",
    display: "inline-block"
  });
  const actionBtnStyle = { border: "none", background: "transparent", cursor: "pointer" };

  return (
    <div style={containerStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={cardStyle}>
        {/* Modals */}
        {isModalOpen && <CreateClassModal classItem={editingClass} onClose={() => { setIsModalOpen(false); setEditingClass(null); }} onAddClass={handleAddOrUpdateClass} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setClassToDelete(null); }} onDelete={handleDeleteClass} itemName={classToDelete?.subject + " - " + classToDelete?.section} title="Delete Class" message={classToDelete ? `Are you sure you want to delete ${classToDelete.subject} - ${classToDelete.section}?` : ""} loading={deleting} />

        {/* Header & Controls */}
        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>Class Management</h1>
                <p style={subtitleStyle}>Manage all classes in the system.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New Class
              </button>
            </div>

            {/* Grade Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              {[
                { value: 'all', label: 'All Classes' },
                { value: '7', label: 'Grade 7' },
                { value: '8', label: 'Grade 8' },
                { value: '9', label: 'Grade 9' },
                { value: '10', label: 'Grade 10' },
              ].map(grade => (
                <button key={grade.value} style={filterBtnStyle(selectedGrade === grade.value)} onClick={() => setSelectedGrade(grade.value)}>
                  {grade.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by subject, section, teacher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["Subject", "Section", "Grade Level", "Teacher", "School Year", "Schedule", "Room", "Status", "Actions"].map(header => (
                      <th key={header} style={thStyle}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredClasses.length > 0 ? (
                    filteredClasses.map(cls => (
                      <tr key={cls._id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                        <td style={tdStyle}>{cls.subject}</td>
                        <td style={tdStyle}>{cls.section}</td>
                        <td style={tdStyle}>{cls.gradeLevel}</td>
                        <td style={tdStyle}>{cls.teacher}</td>
                        <td style={tdStyle}>{cls.schoolYear}</td>
                        <td style={tdStyle}>{cls.schedule}</td>
                        <td style={tdStyle}>{cls.room}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(cls.isActive)}>{cls.isActive ? "Active" : "Inactive"}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={() => { setEditingClass(cls); setIsModalOpen(true); }}><Edit2 size={18} color="#111827" /></button>
                            <button style={actionBtnStyle} onClick={() => confirmDeleteClass(cls)}><Trash2 size={18} color="#111827" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No classes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClassManagementPage;



// ================================================================================
// FILE: src\pages\admin\SectionManagementPage.jsx
// ================================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/services/api";
import CreateSectionModal from "@/components/modals/CreateSectionModal";
import DeleteModal from "@/components/modals/DeleteModal";

const SectionManagementPage = ({ onViewRoster }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Sections
  // -------------------------
  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sections/all");
      if (response.data.success) {
        const transformedSections = response.data.data.map((section) => ({
          _id: section.id,
          sectionName: section.name,
          gradeLevel: section.gradeLevel,
          schoolYear: section.schoolYear,
          assignedTeacher: section.adviser
            ? `${section.adviser.firstName} ${section.adviser.lastName}`
            : "No Adviser",
          adviserId: section.adviser?.id,
          studentCapacity: section.capacity,
          roomNumber: section.roomNumber || "N/A",
          isActive: section.isActive,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
        }));
        setSections(transformedSections);
      }
    } catch (error) {
      console.error("Failed to load sections", error);
      toast.error("Failed to load sections. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // -------------------------
  // Add or Update Section
  // -------------------------
  const handleAddOrUpdateSection = async (sectionData) => {
    try {
      const payload = {
        name: sectionData.sectionName,
        gradeLevel: sectionData.gradeLevel,
        schoolYear: sectionData.schoolYear,
        capacity: sectionData.studentCapacity,
        roomNumber: sectionData.roomNumber,
        adviserId: sectionData.adviserId || null,
      };

      if (editingSection) {
        const response = await api.put(`/sections/update/${editingSection._id}`, payload);
        if (response.data.success) toast.success("Section updated successfully");
        setSections(prev =>
          prev.map(s => (s._id === editingSection._id ? { ...s, ...payload } : s))
        );
      } else {
        const response = await api.post("/sections/create", payload);
        if (response.data.success) toast.success("Section created successfully");
        setSections(prev => [{ _id: crypto.randomUUID(), ...payload, isActive: true }, ...prev]);
      }

      setIsModalOpen(false);
      setEditingSection(null);
    } catch (error) {
      console.error("Failed to save section", error);
      toast.error(error.response?.data?.message || "Failed to save section");
    }
  };

  // -------------------------
  // Delete Section
  // -------------------------
  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/sections/delete/${sectionToDelete._id}`);
      toast.success("Section deleted successfully");
      setSections(prev => prev.filter(s => s._id !== sectionToDelete._id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete section");
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSectionToDelete(null);
    }
  };

  const confirmDeleteSection = (section) => {
    setSectionToDelete(section);
    setIsDeleteModalOpen(true);
  };

  // -------------------------
  // Filter & Search
  // -------------------------
  const filteredSections = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sections.filter(s => {
      const matchesGrade = selectedGrade === "all" ? true : s.gradeLevel === selectedGrade;
      const matchesSearch =
        s.sectionName.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term) ||
        s.assignedTeacher.toLowerCase().includes(term);
      return matchesGrade && matchesSearch;
    });
  }, [sections, searchTerm, selectedGrade]);

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = { width: "100%", minHeight: "100vh", padding: "40px 20px", background: "#f2f2f2", display: "flex", justifyContent: "center" };
  const cardStyle = { width: "100%", maxWidth: "1200px", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const buttonStyle = { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.2s"
  });
  const searchContainerStyle = { display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f5", padding: "8px 12px", borderRadius: "12px", border: "1px solid #ddd", maxWidth: "400px" };
  const tableContainerStyle = { overflowX: "auto", borderRadius: "12px", border: "1px solid #ddd", background: "#fff" };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = { textAlign: "left", padding: "12px 16px", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", color: "#4b5563", borderBottom: "1px solid #ddd" };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (active) => ({
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: active ? "#d1fae5" : "#fee2e2",
    color: active ? "#059669" : "#dc2626",
    display: "inline-block"
  });
  const actionBtnStyle = { border: "none", background: "transparent", cursor: "pointer" };

  return (
    <div style={containerStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={cardStyle}>
        {/* Modals */}
        {isModalOpen && <CreateSectionModal section={editingSection} onClose={() => { setIsModalOpen(false); setEditingSection(null); }} onAddSection={handleAddOrUpdateSection} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSectionToDelete(null); }} onDelete={handleDeleteSection} itemName={sectionToDelete?.sectionName} title="Delete Section" message={sectionToDelete ? `Are you sure you want to delete ${sectionToDelete.sectionName}?` : ""} loading={deleting} />

        {/* Header & Controls */}
        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>Section Management</h1>
                <p style={subtitleStyle}>Manage all sections in the system.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New Section
              </button>
            </div>

            {/* Grade Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              {["all", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map(grade => (
                <button key={grade} style={filterBtnStyle(selectedGrade === grade)} onClick={() => setSelectedGrade(grade)}>
                  {grade === "all" ? "All Sections" : grade}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by section, grade, or teacher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Section Name</th>
                    <th style={thStyle}>Grade Level</th>
                    <th style={thStyle}>Teacher</th>
                    <th style={thStyle}>Students</th>
                    <th style={thStyle}>Room</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredSections.length > 0 ? (
                    filteredSections.map(section => (
                      <tr key={section._id} style={{ borderBottom: "1px solid #f1f1f1", transition: "background 0.2s", cursor: 'pointer' }} onClick={() => (typeof onViewRoster === 'function' ? onViewRoster(section) : null)}>
                        <td style={tdStyle}>{section.sectionName}</td>
                        <td style={tdStyle}>{section.gradeLevel}</td>
                        <td style={tdStyle}>{section.assignedTeacher}</td>
                        <td style={tdStyle}>{section.studentCapacity}</td>
                        <td style={tdStyle}>{section.roomNumber}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(section.isActive)}>{section.isActive ? "Active" : "Inactive"}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={(e) => { e.stopPropagation(); setEditingSection(section); setIsModalOpen(true); }}>
                              <Edit2 size={18} color="#111827" />
                            </button>
                            <button style={actionBtnStyle} onClick={(e) => { e.stopPropagation(); confirmDeleteSection(section); }}>
                              <Trash2 size={18} color="#111827" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No sections found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SectionManagementPage;



// ================================================================================
// FILE: src\pages\admin\SectionRosterPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Trash2, Loader2, Search } from 'lucide-react';
import api from '@/services/api';
import adminService from '@/services/adminService';
import AddStudentsModal from '@/components/modals/AddStudentsModal';

const SectionRosterPage = ({ section, onBack }) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSectionRoster(section._id || section.id);
      if (res?.success) {
        setRoster(res.data);
      }
    } catch (err) {
      console.error('Failed to load roster', err);
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleRemove = async (studentId) => {
    if (!confirm('Remove this student from the section?')) return;
    setRemovingId(studentId);
    try {
      await adminService.removeStudentFromSection(section._id || section.id, studentId);
      toast.success('Student removed from section');
      setRoster(prev => prev.filter(r => r.studentId !== studentId));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to remove student');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddSuccess = (addedCount) => {
    if (addedCount > 0) {
      toast.success(`${addedCount} students added`);
      fetchRoster();
    }
    setIsAddOpen(false);
  };

  const containerStyle = { width: '100%', minHeight: '100vh', padding: '40px 20px', background: '#f2f2f2', display: 'flex', justifyContent: 'center' };
  const cardStyle = { width: '100%', maxWidth: '1200px', background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <ArrowLeft />
            </button>
            <div>
              <h2 style={{ margin: 0 }}>{section.sectionName || section.name}</h2>
              <small style={{ color: '#6b7280' }}>{section.gradeLevel} • {section.schoolYear}</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsAddOpen(true)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
              <UserPlus size={16} /> Add Students
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : roster.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No students in this section.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 8px', width: 40 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Grade</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r, idx) => (
                  <tr key={r.enrollmentId || r.studentId} style={{ borderTop: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '12px 8px' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.firstName} {r.student?.lastName}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.email}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.profile?.gradeLevel || '-'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button onClick={() => handleRemove(r.studentId)} disabled={removingId === r.studentId} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isAddOpen && (
          <AddStudentsModal
            section={section}
            onClose={() => setIsAddOpen(false)}
            onSuccess={handleAddSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default SectionRosterPage;



// ================================================================================
// FILE: src\pages\admin\SubjectManagementPage.jsx
// ================================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { UserPlus, Trash2, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreateSubjectModal from "@/components/modals/CreateSubjectModal";
import DeleteModal from "@/components/modals/DeleteModal";
import api from "@/services/api";

const SubjectManagementPage = () => {
  // -------------------------
  // State
  // -------------------------
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------
  // Fetch Subjects
  // -------------------------
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/subjects/all");
      
      if (response.data.success) {
        // Transform backend data to match frontend expectations
        const transformedSubjects = response.data.data.map(subject => ({
          _id: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          gradeLevel: subject.gradeLevel,
          description: subject.description,
          isActive: subject.isActive,
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt,
        }));
        setSubjects(transformedSubjects);
      }
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // -------------------------
  // Add or Update Subject
  // -------------------------
  const handleAddOrUpdateSubject = async (subjectData) => {
    try {
      if (editingSubject) {
        // Update existing subject
        const payload = {
          name: subjectData.subjectName,
          code: subjectData.subjectCode,
          gradeLevel: subjectData.gradeLevel,
          description: subjectData.description,
        };

        const response = await api.put(`/subjects/update/${editingSubject._id}`, payload);
        
        if (response.data.success) {
          toast.success("Subject updated successfully");
          await fetchSubjects(); // Refresh the list
        }
      } else {
        // Create new subject
        const payload = {
          name: subjectData.subjectName,
          code: subjectData.subjectCode,
          gradeLevel: subjectData.gradeLevel,
          description: subjectData.description,
        };

        const response = await api.post("/subjects/create", payload);
        
        if (response.data.success) {
          toast.success("Subject created successfully");
          await fetchSubjects(); // Refresh the list
        }
      }
      
      setIsModalOpen(false);
      setEditingSubject(null);
    } catch (error) {
      console.error("Failed to save subject", error);
      const errorMessage = error.response?.data?.message || "Failed to save subject";
      toast.error(errorMessage);
      throw error; // Re-throw so the modal can handle it
    }
  };

  // -------------------------
  // Delete Subject
  // -------------------------
  const confirmDeleteSubject = (subject) => {
    setSubjectToDelete(subject);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setDeleting(true);
    try {
      const response = await api.delete(`/subjects/delete/${subjectToDelete._id}`);
      
      if (response.data.success) {
        toast.success("Subject deleted successfully");
        await fetchSubjects(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete subject", error);
      const errorMessage = error.response?.data?.message || "Failed to delete subject";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setSubjectToDelete(null);
    }
  };

  // -------------------------
  // Filter Subjects (Search)
  // -------------------------
  const filteredSubjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return subjects.filter(
      s =>
        s.subjectName.toLowerCase().includes(term) ||
        s.subjectCode.toLowerCase().includes(term) ||
        s.gradeLevel.toLowerCase().includes(term)
    );
  }, [subjects, searchTerm]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="flex-1 w-full rounded-2xl p-8 md:p-12">
      {/* Create/Edit Subject Modal */}
      {isModalOpen && (
        <CreateSubjectModal
          subject={editingSubject}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSubject(null);
          }}
          onAddSubject={handleAddOrUpdateSubject}
        />
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteSubject}
        itemName={subjectToDelete?.subjectName}
        loading={deleting}
        title="Delete Subject"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subject Management</h1>
          <p className="text-slate-500">Manage all subjects in the system.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Subject
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-1 rounded-xl border border-gray-100 shadow-sm max-w-2xl mb-4">
        <Input
          placeholder="Search by subject name, code, or grade..."
          className="border-0 bg-transparent focus-visible:ring-0 shadow-none text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Subject Name</th>
              <th className="px-6 py-4">Subject Code</th>
              <th className="px-6 py-4">Grade Level</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" />
                </td>
              </tr>
            ) : filteredSubjects.length > 0 ? (
              filteredSubjects.map(subject => (
                <tr key={subject._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{subject.subjectName}</td>
                  <td className="px-6 py-4 text-slate-500">{subject.subjectCode}</td>
                  <td className="px-6 py-4 text-slate-500">{subject.gradeLevel}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setIsModalOpen(true);
                        }}
                        title="Edit Subject"
                      >
                        <Edit2 size={18} className="text-slate-900" />
                      </button>
                      <button
                        onClick={() => confirmDeleteSubject(subject)}
                        title="Delete Subject"
                      >
                        <Trash2 size={18} className="text-slate-900" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-12 text-center text-gray-500">
                  No subjects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubjectManagementPage;



// ================================================================================
// FILE: src\pages\admin\UserManagementPage.jsx
// ================================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, Trash2, Search, Loader2, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../services/api";
import CreateUserModal from "@/components/modals/CreateUserModal";
import DeleteModal from "@/components/modals/DeleteModal";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // -------------------------
  // 1. FETCH USERS
  // -------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/users/all");

      const mockData = [
        { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com", roles: [{ name: "student" }], status: "ACTIVE" },
        { id: "2", firstName: "Jane", lastName: "Smith", email: "jane@example.com", roles: [{ name: "teacher" }], status: "ACTIVE" },
      ];

      const userData = Array.isArray(response.data?.users) ? response.data.users : mockData;
      setUsers(userData);

      const rolesSet = new Set();
      userData.forEach(user => {
        if (user.roles && Array.isArray(user.roles)) {
          user.roles.forEach(role => { if (role?.name) rolesSet.add(role.name); });
        }
      });

      setAvailableRoles(Array.from(rolesSet).sort());
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // -------------------------
  // DELETE USER
  // -------------------------
  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setUsers(prev => prev.map(u => u.id === userToDelete.id ? { ...u, status: "INACTIVE" } : u));
      toast.success("User deactivated");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error("Deactivation failed");
    }
  };

  // -------------------------
  // ADD OR UPDATE USER
  // -------------------------
  const handleAddOrUpdateUser = async (userData) => {
    try {
      if (editingUser) {
        const resp = await api.put(`/users/update/${editingUser.id}`, userData);
        const updatedUser = resp.data?.data?.user || { id: editingUser.id, ...userData };
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? { ...u, ...updatedUser } : u)));
        toast.success("User updated");
        return updatedUser;
      } else {
        const resp = await api.post("/users/create", userData);
        const createdUser = resp.data?.data?.user;
        // if API didn't return a user object, fall back to a minimal local representation
        const userRecord = createdUser || { id: crypto.randomUUID(), status: "ACTIVE", ...userData };
        setUsers(prev => [{ ...userRecord }, ...prev]);
        toast.success("User added");
        return userRecord;
      }
    } catch (error) {
      // If the server responds with a conflict (duplicate email), forward a structured error
      if (error?.response?.status === 409) {
        const message = error.response?.data?.message || "Email already registered";
        const err = new Error(message);
        err.fieldErrors = { email: message };
        throw err;
      }
      toast.error("Failed to save user");
      // rethrow so callers (like the modal) can handle specifics if needed
      throw error;
    }
  };

  // -------------------------
  // SEARCH & FILTER
  // -------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => {
      const userRoleNames = u.roles?.map(role => role?.name).filter(Boolean) || [];
      const matchesRole = selectedRole === "all" ? true : userRoleNames.includes(selectedRole);
      const matchesSearch =
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        userRoleNames.some(role => role.toLowerCase().includes(term));
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, selectedRole]);

  const getUserRoles = (user) => {
    if (!user.roles || !Array.isArray(user.roles)) return "—";
    return user.roles
      .map(role => role?.name)
      .filter(Boolean)
      .map(role => role.charAt(0).toUpperCase() + role.slice(1))
      .join(", ");
  };

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = { width: "100%", minHeight: "100vh", padding: "40px 20px", background: "#f2f2f2", display: "flex", justifyContent: "center" };
  const cardStyle = { width: "100%", maxWidth: "1200px", background: "#fff", borderRadius: "12px", padding: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "25px" };
  const titleStyle = { fontSize: "28px", fontWeight: "bold", margin: 0 };
  const subtitleStyle = { fontSize: "14px", color: "#555", marginTop: "5px" };
  const buttonStyle = { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
  const filterBtnStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "999px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: active ? "#111827" : "#f5f5f5",
    color: active ? "#fff" : "#4b5563",
    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.2s"
  });
  const searchContainerStyle = { display: "flex", alignItems: "center", gap: "8px", background: "#f5f5f5", padding: "8px 12px", borderRadius: "12px", border: "1px solid #ddd", maxWidth: "400px" };
  const tableContainerStyle = { overflowX: "auto", borderRadius: "12px", border: "1px solid #ddd", background: "#fff" };
  const tableStyle = { width: "100%", borderCollapse: "collapse" };
  const thStyle = { textAlign: "left", padding: "12px 16px", fontWeight: "600", fontSize: "13px", textTransform: "uppercase", color: "#4b5563", borderBottom: "1px solid #ddd" };
  const tdStyle = { padding: "12px 16px", fontSize: "14px", color: "#111827" };
  const statusBadgeStyle = (status) => ({
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
    color: status === "ACTIVE" ? "#059669" : "#dc2626",
    display: "inline-block"
  });
  const actionBtnStyle = { border: "none", background: "transparent", cursor: "pointer" };

  // -------------------------
  // FIXED ROLE BUTTONS
  // -------------------------
  const fixedRoles = ["student", "teacher", "admin"];

  return (
    <div style={containerStyle}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={cardStyle}>
        {/* Modals */}
        {isModalOpen && <CreateUserModal user={editingUser} onClose={() => { setIsModalOpen(false); setEditingUser(null); }} onAddUser={handleAddOrUpdateUser} />}
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} onDelete={confirmDelete} itemName={userToDelete ? `${userToDelete.firstName} ${userToDelete.lastName}` : "user"} title="Deactivate User" message={userToDelete ? `Are you sure you want to deactivate ${userToDelete.firstName} ${userToDelete.lastName}?` : ""} />

        {!isModalOpen && !isDeleteModalOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header */}
            <div style={headerStyle}>
              <div>
                <h1 style={titleStyle}>User Management</h1>
                <p style={subtitleStyle}>Manage and monitor all system users.</p>
              </div>
              <button style={buttonStyle} onClick={() => setIsModalOpen(true)}>
                <UserPlus size={16} /> Add New User
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
              <button style={filterBtnStyle(selectedRole === "all")} onClick={() => setSelectedRole("all")}>All Users</button>
              {/* Fixed role buttons */}
              {fixedRoles.map(role => (
                <button key={role} style={filterBtnStyle(selectedRole === role)} onClick={() => setSelectedRole(role)}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
              {/* Dynamic roles from API */}
             
            </div>

            {/* Search */}
            <div style={searchContainerStyle}>
              <Search size={16} color="#9ca3af" />
              <input placeholder="Search by name, email, or role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
            </div>

            {/* Table */}
            <div style={tableContainerStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "40px 0" }}>
                        <Loader2 size={24} className="animate-spin" color="#dc2626" />
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f1f1f1", transition: "background 0.2s" }}>
                        <td style={tdStyle}>{`${user.firstName} ${user.middleName ? user.middleName : ""} ${user.lastName}`}</td>
                        <td style={tdStyle}>{user.email}</td>
                        <td style={tdStyle}>{getUserRoles(user)}</td>
                        <td style={tdStyle}><span style={statusBadgeStyle(user.status)}>{user.status}</span></td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button style={actionBtnStyle} onClick={() => { setEditingUser(user); setIsModalOpen(true); }}>
                              <Edit2 size={18} color="#111827" />
                            </button>
                            <button style={actionBtnStyle} onClick={() => handleDeleteUser(user)} disabled={user.status === "INACTIVE"}>
                              <Trash2 size={18} color={user.status === "INACTIVE" ? "#d1d5db" : "#111827"} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UserManagementPage;



// ================================================================================
// FILE: src\pages\auth\CompleteProfilePage.jsx
// ================================================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function CompleteProfilePage({ onComplete }) {
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState(user?.gender || '');
  const [address, setAddress] = useState(user?.city || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [familyName, setFamilyName] = useState(user?.familyName || '');
  const [familyRelationship, setFamilyRelationship] = useState(user?.familyRelationship || '');
  const [familyContact, setFamilyContact] = useState(user?.familyContact || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const dobInitRef = useRef(false);

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];
  const currentYear = new Date().getFullYear();
  const minYear = 1975;
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => String(currentYear - i));
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

  useEffect(() => {
    if (user?.dob) {
      const d = new Date(user.dob);
      if (!Number.isNaN(d.getTime())) {
        dobInitRef.current = true;
        setDobDay(String(d.getDate()));
        setDobMonth(String(d.getMonth() + 1));
        setDobYear(String(d.getFullYear()));
        setTimeout(() => (dobInitRef.current = false), 0);
      }
    }
  }, [user]);

  useEffect(() => {
    if (dobInitRef.current) return;
    if (dobYear) {
      setDobMonth('');
      setDobDay('');
    }
  }, [dobYear]);

  const isValidPHPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('09');
  };
  const [phoneValid, setPhoneValid] = useState(false);
  const [familyContactValid, setFamilyContactValid] = useState(false);

  useEffect(() => {
    if (dobYear && dobMonth) {
      const max = daysInMonth(Number(dobYear), Number(dobMonth));
      if (dobDay && Number(dobDay) > max) setDobDay('');
    }
  }, [dobMonth, dobYear]);

  const validate = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!dobDay || !dobMonth || !dobYear) e.dob = 'Date of birth is required';
    if (!gender) e.gender = 'Gender is required';
    if (!studentId.trim()) e.studentId = 'Student ID is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!isValidPHPhone(phone)) e.phone = 'Enter a valid 11-digit Philippine number';
    if (!address.trim()) e.address = 'Address is required';
    if (!familyName.trim()) e.familyName = 'Family member name is required';
    if (!familyRelationship.trim()) e.familyRelationship = 'Relationship is required';
    if (!familyContact.trim()) e.familyContact = 'Family contact is required';
    else if (!isValidPHPhone(familyContact)) e.familyContact = 'Enter a valid 11-digit Philippine number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        dob: `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`,
        gender,
        studentId: studentId.trim(),
        phone: phone.trim(),
        address: address.trim(),
        familyName: familyName.trim(),
        familyRelationship: familyRelationship.trim(),
        familyContact: familyContact.trim(),
      };
      await updateProfile(payload);
      toast.success('Profile saved successfully!');
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to save profile', err);
      toast.error(err?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px'
  };

  const inputStyle = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    marginTop: '5px'
  };

  const errorStyle = { color: '#dc2626', fontSize: '12px', marginTop: '4px' };
  const validStyle = { color: '#16a34a', fontSize: '12px', marginTop: '4px' };
  const dobSelectsStyle = { display: 'flex', gap: '10px' };
  const submitBtnStyle = {
    padding: '15px',
    fontSize: '16px',
    backgroundColor: '#dc2626',
    color: 'white',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '30px'
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#f2f2f2',
      minHeight: '100vh'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'white',
          borderRadius: '10px',
          padding: '40px',
          maxWidth: '800px',
          width: '100%',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}
      >
        <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '5px' }}>Complete Your Profile</h2>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#555' }}>All fields are required.</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>

          {/* Name fields */}
          <div style={formGroupStyle}>
            <label>First Name</label>
            <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} />
            {errors.firstName && <span style={errorStyle}>{errors.firstName}</span>}
          </div>

          <div style={formGroupStyle}>
            <label>Middle Name</label>
            <input style={inputStyle} value={middleName} onChange={e => setMiddleName(e.target.value)} />
          </div>

          <div style={formGroupStyle}>
            <label>Last Name</label>
            <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            {errors.lastName && <span style={errorStyle}>{errors.lastName}</span>}
          </div>

          <div style={formGroupStyle}>
            <label>Student ID</label>
            <input style={inputStyle} value={studentId} onChange={e => setStudentId(e.target.value)} />
            {errors.studentId && <span style={errorStyle}>{errors.studentId}</span>}
          </div>

          {/* Date of Birth */}
          <div style={formGroupStyle}>
            <label>Date of Birth</label>
            <div style={dobSelectsStyle}>
              <select style={inputStyle} value={dobYear} onChange={e => setDobYear(e.target.value)}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select style={inputStyle} value={dobMonth} onChange={e => setDobMonth(e.target.value)} disabled={!dobYear}>
                <option value="">Month</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select style={inputStyle} value={dobDay} onChange={e => setDobDay(e.target.value)} disabled={!dobMonth || !dobYear}>
                <option value="">Day</option>
                {dobYear && dobMonth && Array.from({ length: daysInMonth(Number(dobYear), Number(dobMonth)) }, (_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
            </div>
            {errors.dob && <span style={errorStyle}>{errors.dob}</span>}
          </div>

          {/* Gender */}
          <div style={formGroupStyle}>
            <label>Gender</label>
            <select style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span style={errorStyle}>{errors.gender}</span>}
          </div>

          {/* Phone */}
          <div style={formGroupStyle}>
            <label>Phone</label>
            <input
              style={inputStyle}
              value={phone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhone(v);
                setPhoneValid(v.length === 11 && v.startsWith('09'));
              }}
            />
            {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
            {!errors.phone && phone.length > 0 && (
              <span style={phoneValid ? validStyle : errorStyle}>{phoneValid ? 'Valid number' : 'Invalid format'}</span>
            )}
          </div>

          {/* Address */}
          <div style={formGroupStyle}>
            <label>Address</label>
            <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
            {errors.address && <span style={errorStyle}>{errors.address}</span>}
          </div>

          {/* Emergency Contact */}
          <fieldset style={{ gridColumn: '1 / -1', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginTop: '20px' }}>
            <legend>Emergency Contact</legend>

            <div style={formGroupStyle}>
              <label>Name</label>
              <input style={inputStyle} value={familyName} onChange={e => setFamilyName(e.target.value)} />
              {errors.familyName && <span style={errorStyle}>{errors.familyName}</span>}
            </div>

            <div style={formGroupStyle}>
              <label>Relationship</label>
              <select style={inputStyle} value={familyRelationship} onChange={e => setFamilyRelationship(e.target.value)}>
                <option value="">Select</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
              {errors.familyRelationship && <span style={errorStyle}>{errors.familyRelationship}</span>}
            </div>

            <div style={formGroupStyle}>
              <label>Contact</label>
              <input
                style={inputStyle}
                value={familyContact}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0,11);
                  setFamilyContact(v);
                  setFamilyContactValid(v.length === 11 && v.startsWith('09'));
                }}
              />
              {errors.familyContact && <span style={errorStyle}>{errors.familyContact}</span>}
              {!errors.familyContact && familyContact.length > 0 && (
                <span style={familyContactValid ? validStyle : errorStyle}>{familyContactValid ? 'Valid number' : 'Invalid format'}</span>
              )}
            </div>
          </fieldset>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSaving}
            style={submitBtnStyle}
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </motion.button>

        </form>
      </motion.div>
    </div>
  );
}

export default CompleteProfilePage;



// ================================================================================
// FILE: src\pages\auth\EmailVerificationPage.jsx
// ================================================================================

// ================================================================================
// EMAIL VERIFICATION PAGE - Real Backend Integration
// ================================================================================
// Verifies user email with 6-digit OTP code
// ALL UI PRESERVED - Only logic updated

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import ChangePasswordModal from "@/components/modals/ChangePasswordModal";


export function EmailVerificationPage({ email, onBack, onVerify }) {

  // ================================================================================
  // HOOKS & STATE
  // ================================================================================

  /**
   * Get auth functions from contexts
   */
  const { verifyEmail, resendOTP } = useAuth();

  /**
   * OTP code input
   * 6 digits (e.g., "123456")
   */
  const [code, setCode] = useState("");

  /**
   * Validation error
   */
  const [error, setError] = useState("");

  /**
   * Loading states
   */
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  /**
   * Success state
   * Shows success message after verification
   */
  const [isVerified, setIsVerified] = useState(false);

  /**
   * Show change password modal after OTP verification
   */
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  /**
   * Resend cooldown timer
   * Prevents spamming resend button
   * Counts down from 60 seconds
   */
  const [resendCountdown, setResendCountdown] = useState(0);

  // ================================================================================
  // EFFECTS
  // ================================================================================

  /**
   * Countdown timer for resend button
   *
   * FLOW:
   * 1. User clicks resend
   * 2. setResendCountdown(60)
   * 3. This effect runs every second
   * 4. Decrements countdown
   * 5. At 0, stops and enables resend button
   */
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);

      // Cleanup timer on unmount
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Refs for segmented inputs
  const inputRefs = useRef([]);

  // Focus and reset when email changes (e.g., navigated from login)
  useEffect(() => {
    setCode('');
    setError('');
    // focus first input (use timeout to ensure refs are mounted)
    setTimeout(() => {
      if (inputRefs.current && inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 0);
  }, [email]);

  // ================================================================================
  // VALIDATION
  // ================================================================================

  /**
   * Validate OTP code format
   *
   * RULES:
   * - Must be exactly 6 digits
   * - Only numbers allowed
   */
  const validateCode = (value) => {
    if (!value) {
      return "Verification code is required";
    }
    if (value.length !== 6) {
      return "Code must be 6 digits";
    }
    if (!/^\d{6}$/.test(value)) {
      return "Code must contain only numbers";
    }
    return "";
  };

  // ================================================================================
  // INPUT HANDLER
  // ================================================================================

  // NOTE: Individual input handlers are implemented inline in the JSX below to support segmented OTP UI.


  // ================================================================================
  // VERIFICATION
  // ================================================================================

  /**
   * Handle verification submission
   *
   * FLOW:
   * 1. Validate code format locally (no backend call)
   * 2. Show password setting modal with the code
   * 3. When user submits password, setInitialPassword() verifies the OTP on backend
   * 4. Backend verifies code, deletes OTP, and updates password
   * 5. Backend marks user as verified and activates account
   * 
   * NOTE: We validate locally only to avoid consuming the OTP.
   * The actual OTP verification happens when password is set.
   */
  const handleVerify = (e) => {
    e.preventDefault();

    // Validate code format locally
    const validationError = validateCode(code);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Code is valid format, show password modal
    // The actual OTP verification happens when user sets their password
    setIsVerified(true);
    setShowChangePasswordModal(true);
  };

  // ================================================================================
  // RESEND OTP
  // ================================================================================

  /**
   * Handle resend OTP request
   *
   * FLOW:
   * 1. Call POST /otp/resend
   * 2. Backend deletes old OTP
   * 3. Backend generates new OTP
   * 4. Backend sends email
   * 5. Start 60 second cooldown
   */
  const handleResend = async () => {
    setIsResending(true);
    setError("");
    setCode("");  // Clear input

    try {
      /**
       * CALL BACKEND RESEND API
       *
       * POST /otp/resend
       * Body: { email }
       */
      await resendOTP(email);

      // Start cooldown (60 seconds)
      setResendCountdown(60);

    } catch (error) {
      setError(error.message || 'Failed to resend code. Please try again.');

    } finally {
      setIsResending(false);
    }
  };

  // ================================================================================
  // RENDER
  // ================================================================================

  /**
   * If verified, show success message or change password modal
   */
  if (isVerified) {
    return (
      <>
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          isInitialPassword={true}
          email={email}
          otpCode={code}
          onClose={() => {
            // User skipped password change, redirect to login
            window.location.href = '/login';
          }}
          onSuccess={() => {
            // Password set successfully, redirect to login
            window.location.href = '/login';
          }}
        />
        <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-green-600">
                Email Verified! ✓
              </CardTitle>
              <CardDescription className="text-center">
                Your account has been activated
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Your email has been successfully verified.
                </p>
                <p className="text-sm text-gray-600">
                  Complete your account setup by changing your password.
                </p>
              </div>

              {/* Manual redirect button */}
              <Button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Go to Login Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  /**
   * Show verification form
   */
  return (
      <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">

        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Verification Card */}
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-center">
              Enter the 6-digit code sent to your email
            </CardDescription>
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <strong>Development Mode:</strong> Check the backend console for the OTP code (look for "[DEV MODE] OTP for...")
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">

              {/* Display email */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Verification code sent to:
                </p>
                <p className="font-medium text-[#dc2626]">
                  {email}
                </p>
              </div>

              {/* Code Input - segmented OTP fields */}
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div
                  className={`flex gap-2 justify-center ${error ? 'border border-[#dc2626] p-2 rounded-md' : ''}`}
                  onPaste={(e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                    const digits = paste.replace(/\D/g, '').slice(0,6);
                    if (digits.length) {
                      setCode(digits.padEnd(6, ''));
                      const nextIndex = digits.length >= 6 ? 5 : digits.length;
                      const dst = inputRefs.current[nextIndex];
                      if (dst) dst.focus();
                    }
                  }}
                >
                  {Array.from({length:6}).map((_, i) => (
                    <input
                      key={i}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      ref={el => inputRefs.current[i] = el}
                      value={code[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0,1);
                        setError('');
                        const arr = code.split('').slice(0,6);
                        while (arr.length < 6) arr.push('');
                        arr[i] = val;
                        const newCode = arr.join('');
                        setCode(newCode);
                        if (val) {
                          const next = inputRefs.current[i+1];
                          if (next) next.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          const arr = code.split('').slice(0,6);
                          while (arr.length < 6) arr.push('');
                          if (arr[i]) {
                            arr[i] = '';
                            setCode(arr.join(''));
                          } else {
                            const prev = inputRefs.current[i-1];
                            if (prev) {
                              arr[i-1] = '';
                              setCode(arr.join(''));
                              prev.focus();
                            }
                          }
                        } else if (e.key === 'ArrowLeft') {
                          const prev = inputRefs.current[i-1];
                          if (prev) prev.focus();
                        } else if (e.key === 'ArrowRight') {
                          const next = inputRefs.current[i+1];
                          if (next) next.focus();
                        }
                      }}
                      disabled={isVerifying || isResending}
                      className="w-12 h-12 text-center text-2xl tracking-widest rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  ))}
                </div>
                {error && (
                    <p className="text-sm text-[#dc2626]">{error}</p>
                )}

                {/* Helper text */}
                <p className="text-xs text-gray-500 text-center">
                  Enter the 6-digit code from your email
                </p>
              </div>

              {/* Verify Button */}
              <Button
                  type="submit"
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                  disabled={code.length !== 6 || isVerifying || isResending}
              >
                {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verifying...
                    </>
                ) : (
                    'Verify Email'
                )}
              </Button>

              {/* Resend Code */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?
                </p>

                {/* Resend button with countdown */}
                {resendCountdown > 0 ? (
                    <p className="text-sm text-gray-500">
                      Resend available in {resendCountdown}s
                    </p>
                ) : (
                    <Button
                        type="button"
                        variant="link"
                        className="text-[#dc2626]"
                        onClick={handleResend}
                        disabled={isVerifying || isResending}
                    >
                      {isResending ? 'Sending...' : 'Resend Code'}
                    </Button>
                )}
              </div>

              {/* Important notes */}
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> The code expires in 10 minutes. If you don't see the email, check your spam folder.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}




// ================================================================================
// FILE: src\pages\auth\ForgotPasswordPage.jsx
// ================================================================================

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export const ForgotPasswordPage = ({ onBack, onReset }) => {
  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { forgotPassword, resetPassword } = useAuth()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await forgotPassword(email)
      setStep('otp')
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(email, otp, newPassword)
      if (onReset) {
        setTimeout(() => onReset(), 2000)
      }
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      await forgotPassword(email)
      toast.success('New code sent to your email')
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
      
      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={step === 'otp' ? () => setStep('email') : onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'otp' ? 'Back' : 'Home'}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {step === 'email' ? 'Forgot Password' : 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'email'
              ? "Enter your email address and we'll send you a verification code."
              : 'Enter the code sent to your email and your new password.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : 'Send Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting...
                  </>
                ) : 'Reset Password'}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-[#dc2626]"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend Code
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage


// ================================================================================
// FILE: src\pages\auth\LoginPage.jsx
// ================================================================================

// ================================================================================
// LOGIN PAGE - Role-Guarded
// ================================================================================

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { validateCredentials } from "@/services/authService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

/**
 * LoginPage Component
 *
 * @param {Function} onBack - Navigate back
 * @param {Function} onForgotPassword - Navigate to forgot password
 * @param {Function} onUnverified - Called when account is unverified. Receives the email and should navigate to verification page.
 */
export function LoginPage({ onBack, onForgotPassword, onUnverified }) {
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validate email format
  const validateEmail = (value) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|edu|ph|net|org|gov)$/i;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validate password (not empty)
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Handle input changes
  const handleEmailChange = (value) => {
    setEmail(value);
    validateEmail(value);
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    validatePassword(value);
  };

  // Form validity
  const isFormValid = () => {
    return email && password && !emailError && !passwordError;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);

    try {
      // Call backend login
      await login(email, password);

      // Success: AuthContext already updated, App.jsx handles redirect

    } catch (error) {
      // Invalid credentials (wrong email/password)
      if (error.message?.includes("Invalid") || error.code === "INVALID_CREDENTIALS") {
        setPasswordError("Invalid email or password");
      }
      // Email not verified - only navigate to verification flow if the provided password is correct
      else if (error.message?.includes("Email not verified") || error.code === "EMAIL_NOT_VERIFIED") {
        // Confirm the password is correct before sending user to verification page
        try {
          await validateCredentials(email, password);

          // If credentials are valid, navigate to verification flow
          if (typeof onUnverified === 'function') {
            onUnverified(email);
          } else {
            setEmailError("Please verify your email before logging in");
          }
        } catch (vError) {
          // Password is incorrect or validation failed
          setPasswordError("Invalid email or password");
        }
      }
      // Account not active
      else if (error.message?.includes("not active")) {
        setEmailError("Account suspended. Contact administrator.");
      }
      // Generic error
      else {
        setPasswordError(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">

      {/* Back Button */}
      <div className="absolute top-8 left-8">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Nexora Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => validateEmail(email)}
                className={emailError ? "border-[#dc2626] focus-visible:ring-[#dc2626]" : ""}
                disabled={isLoading}
              />
              {emailError && <p className="text-sm text-[#dc2626]">{emailError}</p>}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => validatePassword(password)}
                  className={passwordError ? "border-[#dc2626] focus-visible:ring-[#dc2626] pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="text-sm text-[#dc2626]">{passwordError}</p>}
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex justify-center items-center"
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            {/* Forgot Password */}
            <Button
              type="button"
              variant="link"
              className="w-full text-[#dc2626]"
              onClick={onForgotPassword}
              disabled={isLoading}
            >
              Forgot password?
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}



// ================================================================================
// FILE: src\pages\auth\SignUpPage.jsx
// ================================================================================

// ================================================================================
// SIGN UP PAGE - Real Backend Integration
// ================================================================================
// Updated to match backend registration schema
// ALL UI/DESIGN PRESERVED - Only logic and fields changed

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

/**
 * SignUpPage Component
 *
 * BACKEND EXPECTS:
 * {
 *   email: "student@school.edu",
 *   password: "SecurePass123!",
 *   role: "student"  // or "teacher"
 * }
 *
 * NOTE: Backend does NOT require name fields during registration
 * Names are added later in profile completion
 *
 * CHANGES FROM ORIGINAL:
 * - Removed firstName, middleName, lastName (not needed for registration)
 * - Uses useAuth() instead of prop
 * - Calls real API
 * - Handles loading states
 * - Proper error handling
 * - Redirects to email verification on success
 */
export function SignUpPage({ role, onBack, onLogin, onSignupSuccess }) {

  // ================================================================================
  // HOOKS & STATE
  // ================================================================================

  /**
   * Get register function from contexts
   */
  const { register } = useAuth();

  /**
   * Form state
   *
   * SIMPLIFIED FROM ORIGINAL:
   * - Only email and password needed
   * - Name fields moved to profile page (after verification)
   */
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""  // For frontend validation only
  });

  /**
   * Validation errors
   */
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  /**
   * Password visibility toggles
   */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Loading state
   */
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Track if email verification page should show
   * After successful registration, show email verification
   */
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // ================================================================================
  // VALIDATION FUNCTIONS
  // ================================================================================

  /**
   * Validate email
   * Same as LoginPage
   */
  const validateEmail = (value) => {
    if (!value) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|edu|ph|net|org|gov)$/i;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email";
    }
    return "";
  };

  /**
   * Validate password strength
   *
   * BACKEND REQUIREMENTS:
   * - At least 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character
   */
  const validatePassword = (value) => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must include at least 1 uppercase letter";
    }
    if (!/[a-z]/.test(value)) {
      return "Password must include at least 1 lowercase letter";
    }
    if (!/[0-9]/.test(value)) {
      return "Password must include at least 1 number";
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(value)) {
      return "Password must include at least 1 special character";
    }
    return "";
  };

  /**
   * Validate password confirmation matches
   */
  const validateConfirmPassword = (value, password) => {
    if (!value) {
      return "Please confirm your password";
    }
    if (value !== password) {
      return "Passwords do not match";
    }
    return "";
  };

  // ================================================================================
  // INPUT HANDLERS
  // ================================================================================

  /**
   * Handle input changes
   * Updates form data and validates on change
   */
  const handleInputChange = (field, value) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate the field
    let error = "";

    if (field === "email") {
      error = validateEmail(value);
    } else if (field === "password") {
      error = validatePassword(value);
      // Also re-validate confirm password if it has a value
      if (formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: validateConfirmPassword(formData.confirmPassword, value)
        }));
      }
    } else if (field === "confirmPassword") {
      error = validateConfirmPassword(value, formData.password);
    }

    // Update errors
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // ================================================================================
  // FORM VALIDATION
  // ================================================================================

  /**
   * Check if form is valid
   */
  const isFormValid = () => {
    return (
        formData.email &&
        formData.password &&
        formData.confirmPassword &&
        !errors.email &&
        !errors.password &&
        !errors.confirmPassword
    );
  };

  // ================================================================================
  // FORM SUBMISSION
  // ================================================================================

  /**
   * Handle form submission
   *
   * FLOW:
   * 1. Validate all fields
   * 2. Call backend registration API
   * 3. Backend creates account with PENDING status
   * 4. Backend sends OTP email
   * 5. Show email verification page
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);

    try {
      /**
       * CALL BACKEND REGISTRATION API
       *
       * BACKEND EXPECTS:
       * {
       *   email: "student@school.edu",
       *   password: "SecurePass123!",
       *   role: "student"
       * }
       *
       * BACKEND RETURNS:
       * {
       *   success: true,
       *   message: "Registration successful. Please check your email...",
       *   data: {
       *     user: {
       *       id: "uuid",
       *       email: "student@school.edu",
       *       roles: ["student"],
       *       isEmailVerified: false,
       *       status: "PENDING"
       *     }
       *   }
       * }
       */
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: role  // From props (student/teacher)
      });

      // Registration successful!
      // Call parent success handler to move to verification page
      if (onSignupSuccess) {
        onSignupSuccess({ email: formData.email });
      } else {
        // Fallback internal state
        setRegisteredEmail(formData.email);
        setShowEmailVerification(true);
      }

    } catch (error) {
      /**
       * HANDLE ERRORS
       *
       * POSSIBLE ERRORS:
       * 1. Email already registered
       * 2. Invalid role
       * 3. Network error
       */

      // Email already exists (checked via code or message)
      if (error.code === 'EMAIL_EXISTS' || error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already taken')) {
        setErrors(prev => ({
          ...prev,
          email: 'Email already registered. Please log in instead.'
        }));
      }
      // Validation errors from backend (e.g., password too weak)
      else if (error.errors) {
        // Map backend errors to form fields
        const newErrors = { ...errors };
        
        Object.values(error.errors).forEach(err => {
          const field = err.field;
          const msg = err.message || err.msg;
          
          if (field && newErrors.hasOwnProperty(field)) {
            newErrors[field] = msg;
          } else if (field === 'email') { // Fallback if field name slightly different
            newErrors.email = msg;
          }
        });
        
        setErrors(newErrors);
      }
      // Generic error
      else {
        setErrors(prev => ({
          ...prev,
          email: error.message || 'Registration failed. Please try again.'
        }));
      }

    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================================
  // RENDER
  // ================================================================================

  /**
   * Get role display name
   */
  const getRoleDisplayName = () => {
    if (role === "student") return "Student";
    if (role === "teacher") return "Teacher";
    return "";
  };

  /**
   * If registration successful, show verification message
   */
  if (showEmailVerification) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-green-600">
                Registration Successful!
              </CardTitle>
              <CardDescription className="text-center">
                Please check your email to verify your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  We've sent a verification code to:
                </p>
                <p className="font-medium text-[#dc2626]">
                  {registeredEmail}
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  Please enter the code on the verification page to activate your account.
                </p>
              </div>

              <Button
                  onClick={onLogin}
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  /**
   * Show registration form
   */
  return (
      <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">

        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Sign Up Card */}
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {getRoleDisplayName()} Registration
            </CardTitle>
            <CardDescription className="text-center">
              Create your account to get started
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={errors.email ? "border-[#dc2626]" : ""}
                    disabled={isLoading}
                />
                {errors.email && (
                    <p className="text-sm text-[#dc2626]">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className={errors.password ? "border-[#dc2626] pr-10" : "pr-10"}
                      disabled={isLoading}
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                    <p className="text-sm text-[#dc2626]">{errors.password}</p>
                )}
                {/* Password Requirements */}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside pl-2">
                    <li>At least 8 characters</li>
                    <li>1 uppercase letter</li>
                    <li>1 lowercase letter</li>
                    <li>1 number</li>
                    <li>1 special character (!@#$%^&*)</li>
                  </ul>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className={errors.confirmPassword ? "border-[#dc2626] pr-10" : "pr-10"}
                      disabled={isLoading}
                  />
                  <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                    <p className="text-sm text-[#dc2626]">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Sign Up Button */}
              <Button
                  type="submit"
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                  disabled={!isFormValid() || isLoading}
              >
                {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating account...
                    </>
                ) : (
                    'Sign Up'
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm">
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={onLogin}
                    className="text-[#dc2626] hover:underline"
                    disabled={isLoading}
                >
                  Log in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}



// ================================================================================
// FILE: src\pages\dashboard\AdminDashboard.jsx
// ================================================================================


import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import adminService from '@/services/adminService';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      setError(null);
      const response = await adminService.getDashboardStats();
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      const errorMessage = error?.message || 'Failed to load dashboard stats';
      setError(errorMessage);
      
      // Only show toast if not already loaded once
      if (!stats) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh effect
  useEffect(() => {
    // Fetch immediately on mount
    fetchStats();

    // Setup interval for auto-refresh
    if (isAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchStats();
      }, refreshInterval);
    }

    // Cleanup interval on unmount or when settings change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setLoading(true);
    fetchStats();
    toast.success('Dashboard updated');
  };

  // Format time since last update
  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={isAutoRefresh}
              onChange={(e) => setIsAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!isAutoRefresh}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated Status */}
      <div className="text-sm text-gray-500">
        Last updated: {formatTimeSince(lastUpdated)}
        {error && <span className="text-red-500 ml-4">Error: {error}</span>}
      </div>

      {/* Stats Grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats?.teachers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalUsers > 0 
                  ? `${Math.round((stats?.teachers / stats?.totalUsers) * 100)}% of users`
                  : 'No data'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats?.students || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalUsers > 0 
                  ? `${Math.round((stats?.students / stats?.totalUsers) * 100)}% of users`
                  : 'No data'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats?.activeSubjects || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Courses offered</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats?.activeClasses || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Running classes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
       

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">API Status</span>
              <span className="text-green-600 font-medium">✓ Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Last Sync</span>
              <span className="text-sm">{formatTimeSince(lastUpdated)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Auto-refresh</span>
              <span className="text-sm">{isAutoRefresh ? `Every ${refreshInterval / 1000}s` : 'Disabled'}</span>
            </div>
            <div className="pt-2 border-t">
              <button
                onClick={handleManualRefresh}
                className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-medium"
              >
                Force Refresh
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;




// ================================================================================
// FILE: src\pages\dashboard\StudentDashboard.jsx
// ================================================================================

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import studentService from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const StudentDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [lessonsRes, assessmentsRes] = await Promise.all([
        studentService.getLessons(),
        studentService.getAssessments()
      ]);
      setLessons(lessonsRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lessons.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assessments.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">N/A</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Your Lessons</h2>
      {loading ? (
        <p>Loading lessons...</p>
      ) : lessons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{lesson.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span>Type: {lesson.contentType}</span>
                  <button className="text-primary hover:underline">View Lesson</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No lessons available at this time.
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mt-8 mb-4">Your Assessments</h2>
      {loading ? (
        <p>Loading assessments...</p>
      ) : assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{assessment.title}</CardTitle>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded uppercase">
                    {assessment.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{assessment.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                  <button className="text-primary font-bold hover:underline">Start Assessment</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="pb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            No assessments assigned at this time.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;



// ================================================================================
// FILE: src\pages\dashboard\TeacherDashboard.jsx
// ================================================================================

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import teacherService from '@/services/teacherService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);
  const { user } = useAuth();

  // Handle navigation using window.location

  // Fetch teacher data from backend
  const fetchTeacherData = async () => {
    try {
      setError(null);
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        teacherService.getLessons(),
        teacherService.getClasses(),
        teacherService.getAssessments()
      ]);
      setLessons(lessonsRes.data || lessonsRes || []);
      console.log('Classes Response:', classesRes);
      console.log('Assessments Response:', assessmentsRes);
      console.log('Lessons Response:', lessonsRes);
      setClasses(classesRes.data || classesRes || []);
      setAssessments(assessmentsRes.data || assessmentsRes || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      const errorMessage = error?.message || 'Failed to load dashboard data';
      setError(errorMessage);
      if (!lessons.length) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh effect
  useEffect(() => {
    // Fetch immediately on mount
    fetchTeacherData();

    // Setup interval for auto-refresh
    if (isAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchTeacherData();
      }, refreshInterval);
    }

    // Cleanup interval on unmount or when settings change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setLoading(true);
    fetchTeacherData();
    toast.success('Dashboard updated');
  };

  // Format time since last update
  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await teacherService.deleteLesson(id);
      toast.success('Lesson deleted successfully');
      fetchTeacherData();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = {
    width: '100%',
    minHeight: '100vh',
    padding: '40px 20px',
    background: '#f2f2f2',
    display: 'flex',
    justifyContent: 'center'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '1200px',
    background: '#fff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  };

  const titleStyle = { fontSize: '28px', fontWeight: 'bold', margin: 0 };
  const summaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  };
  const tableContainerStyle = {
    borderRadius: '12px',
    border: '1px solid #ddd',
    overflowX: 'auto',
    background: '#fff'
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: '13px',
    textTransform: 'uppercase',
    color: '#4b5563',
    borderBottom: '1px solid #ddd'
  };
  const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#111827' };
  const actionBtnStyle = { border: 'none', background: 'transparent', cursor: 'pointer' };
  const controlsStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Dashboard Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Teacher Dashboard</h1>
          <div style={controlsStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>Auto-refresh:</label>
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!isAutoRefresh}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: isAutoRefresh ? 'pointer' : 'not-allowed',
                opacity: isAutoRefresh ? 1 : 0.6
              }}
            >
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Last Updated Status */}
        <div style={{ fontSize: '13px', color: '#666' }}>
          Last updated: {formatTimeSince(lastUpdated)}
          {error && <span style={{ color: '#dc2626', marginLeft: '16px' }}>Error: {error}</span>}
        </div>

        {/* Summary Cards */}
        <div style={summaryGridStyle}>
          <Card 
            style={{ cursor: 'pointer' }}
            onClick={() => window.location.href = '/teacher/lessons'}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{lessons.length}</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </CardContent>
          </Card>

          <Card style={{ cursor: 'pointer' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{classes.length}</p>
              <p className="text-xs text-gray-500 mt-1">Active classes</p>
            </CardContent>
          </Card>

          <Card 
            style={{ cursor: 'pointer' }}
            onClick={() => window.location.href = '/teacher/assessments'}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{assessments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </CardContent>
          </Card>
        </div>

        {/* Lessons Table */}
        <h2 className="text-xl font-semibold mt-4 mb-2">Recent Lessons (Last 5)</h2>
        {loading && !lessons.length ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading lessons...</div>
        ) : lessons.length > 0 ? (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {lessons.slice(0, 5).map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-muted/50 transition-colors">
                    <td style={tdStyle}>{lesson.title}</td>
                    <td style={tdStyle}>{lesson.classId?.slice(0, 8) || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {new Date(lesson.createdAt).toLocaleDateString()}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              You haven't created any lessons yet.
            </CardContent>
          </Card>
        )}

        {/* Assessments Table */}
        <h2 className="text-xl font-semibold mt-8 mb-2">Recent Assessments (Last 5)</h2>
        {loading && !assessments.length ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading assessments...</div>
        ) : assessments.length > 0 ? (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 5).map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-muted/50 transition-colors">
                    <td style={tdStyle}>{assessment.title}</td>
                    <td style={{ ...tdStyle, textTransform: 'uppercase', fontSize: '12px' }}>{assessment.type}</td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'N/A'}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              You haven't created any assessments yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;



// ================================================================================
// FILE: src\pages\MessagesPage.jsx
// ================================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MessagesPage = () => {
  return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No messages yet</p>
          </CardContent>
        </Card>
      </div>
  )
}

export default MessagesPage



// ================================================================================
// FILE: src\pages\NotificationsPage.jsx
// ================================================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const NotificationsPage = () => {
  return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No notifications yet</p>
          </CardContent>
        </Card>
      </div>
  )
}

export default NotificationsPage



// ================================================================================
// FILE: src\pages\ProfilePage.jsx
// ================================================================================

import { 
  User, Mail, Phone, MapPin, Calendar
} from "lucide-react";
import { useState } from "react";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("about");

  const tabs = [
    { id: "about", label: "About Me" },
    
    { id: "family", label: "Family" },
  ];

  // Inline Style Objects
  const containerStyle = { padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' };
  const cardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
  const tabContainerStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  
  return (
    <div style={containerStyle}>
      {/* Profile Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '128px', height: '128px', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)',
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={64} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Jacob Angelo Miguel Calderon
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Bachelor of Science in Information Technology
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <HeaderDetail icon={Mail} text="jacob@example.com" />
              <HeaderDetail icon={Phone} text="+63 912 345 6789" />
              <HeaderDetail icon={MapPin} text="Pasig City, PH" />
              <HeaderDetail icon={Calendar} text="ID: 2023-00001" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={tabContainerStyle}>
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', backgroundColor: '#ffffff' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? '#dc2626' : '#6b7280',
                borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === "about" && <AboutMeTab />}
          {activeTab === "family" && <FamilyTab />}
        </div>
      </div>
    </div>
  );
}

// --------------------
// Tab Components
// --------------------

function AboutMeTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Basic Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Full Name" value="Jacob Angelo Miguel Calderon" />
          <InfoRow label="Date of Birth" value="January 15, 2005" />
          <InfoRow label="Gender" value="Male" />
          <InfoRow label="Civil Status" value="Single" />
        </div>
      </section>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Contact Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Email" value="jacob.calderon@student.edu.ph" />
          <InfoRow label="Phone" value="+63 912 345 6789" />
          <InfoRow label="City" value="Pasig City" />
          <InfoRow label="Country" value="Philippines" />
        </div>
      </section>
    </div>
  );
}




function FamilyTab() {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#111827' }}>JACOB, DANILO GREGORIO</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
        <div><span style={{ color: '#6b7280' }}>Relationship:</span> Father</div>
        <div><span style={{ color: '#6b7280' }}>Contact:</span> +63 917 123 4567</div>
      </div>
    </div>
  );
}

// --------------------
// UI Helpers
// --------------------

function HeaderDetail({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
      <Icon size={18} color="#3b82f6" />
      <span>{text}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
      <span style={{ color: '#6b7280', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}




export { default } from './student/ProfilePage';


// ================================================================================
// FILE: src\pages\student\CoursesPage.jsx
// ================================================================================

import { useState, useEffect } from "react";
import { GraduationCap, Clock, Users, AlertCircle } from "lucide-react";
import lessonService from '@/services/lessonService';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import StudentClassDetailsPage from './StudentClassDetailsPage';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonErrors, setLessonErrors] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [completions, setCompletions] = useState({});

  // Fetch real enrolled courses for this student
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user || !user.userId) return;
      setLoading(true);
      try {
        const res = await api.get(`/classes/student/${user.userId}`);
        if (res?.data?.data && Array.isArray(res.data.data)) {
          const courseList = res.data.data.map(c => ({
            id: c.id,
            name: c.subjectName ? `${c.subjectName} (${(c.subjectCode||'').toUpperCase()})` : (c.name || 'Unknown'),
            grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
            teacher: c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Unknown',
            schedule: c.schedule || '—',
            students: Array.isArray(c.enrollments) ? c.enrollments.length : 0,
            progress: 0, // Will be calculated after lessons load
            color: pickColor(c.subjectCode || c.id),
            lessons: [],
          }));
          if (mounted) setCourses(courseList);
        }
      } catch (err) {
        console.error('Failed to load student courses', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  // Fetch lessons for all courses
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (courses.length === 0) return;
      setLoadingLessons(true);
      const next = await Promise.all(courses.map(async (c) => {
        try {
          const res = await lessonService.getLessonsByClass(c.id);
          if (res && res.data) {
            return { ...c, lessons: res.data };
          }
          return c;
        } catch (err) {
          console.error(`Failed to load lessons for class ${c.id}`, err);
          setLessonErrors(prev => ({ ...prev, [c.id]: true }));
          return c;
        }
      }));

      if (mounted) setCourses(next);
      setLoadingLessons(false);
    };

    load();
    return () => { mounted = false; };
  }, [courses.length]);

  // Fetch lesson completions for all courses and calculate progress
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (courses.length === 0 || !loadingLessons === false) return;
      // Only proceed if all courses have lessons loaded
      if (!courses.every(c => Array.isArray(c.lessons))) return;
      
      const newCompletions = {};
      const updatedCourses = await Promise.all(courses.map(async (c) => {
        try {
          const res = await lessonService.getCompletedLessonsForClass(c.id);
          if (res && res.data) {
            const completed = res.data.length;
            const total = c.lessons.length || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            newCompletions[c.id] = {
              completed,
              total,
              progress,
            };
            
            return { ...c, progress };
          }
          return c;
        } catch (err) {
          console.error(`Failed to load completions for class ${c.id}`, err);
          return c;
        }
      }));

      if (mounted) {
        setCompletions(newCompletions);
        setCourses(updatedCourses);
      }
    };

    load();
    return () => { mounted = false; };
  }, [courses.length, loadingLessons]);

  // Deterministically pick a color for course cards
  const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F97316","#EC4899","#14B8A6","#64748B"];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  // General container styles
  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    padding: "32px",
    fontFamily: "Arial, sans-serif"
  };

  const headerStyle = {
    marginBottom: "24px",
  };

  const titleStyle = { fontSize: "24px", margin: 0, color: "#111" };
  const subtitleStyle = { fontSize: "14px", color: "#555" };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px"
  };

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #ddd",
    overflow: "hidden",
    transition: "box-shadow 0.2s, transform 0.2s",
    cursor: "pointer"
  };

  const cardHeaderStyle = color => ({
    height: "6px",
    backgroundColor: color
  });

  const cardContentStyle = { padding: "16px" };
  const cardTitleStyle = { fontSize: "18px", margin: "0 0 4px 0", color: "#111" };
  const cardSubtitleStyle = { fontSize: "12px", color: "#555", marginBottom: "12px" };
  const cardRowStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#555", marginBottom: "8px" };

  const emptyStyle = {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "64px",
    textAlign: "center"
  };
  const iconCircleStyle = {
    width: "64px",
    height: "64px",
    background: "#eee",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px auto"
  };

  return selectedCourse ? (
    <StudentClassDetailsPage 
      classItem={selectedCourse}
      onBack={() => setSelectedCourse(null)}
    />
  ) : (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Courses</h1>
        <p style={subtitleStyle}>Access your enrolled subjects and learning materials.</p>
      </div>

      {/* Empty State */}
      {!loading && courses.length === 0 ? (
        <div style={emptyStyle}>
          <div style={iconCircleStyle}><GraduationCap /></div>
          <h2>Not enrolled in any courses</h2>
          <p>You are not currently enrolled in any classes. Please contact the registrar or administrator.</p>
        </div>
      ) : loading ? (
        <div style={emptyStyle}>
          <p>Loading your courses...</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {courses.map(course => (
            <div
              key={course.id}
              style={cardStyle}
              onClick={() => setSelectedCourse(course)}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {/* Color Header */}
              <div style={cardHeaderStyle(course.color)}></div>

              {/* Card Content */}
              <div style={cardContentStyle}>
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={cardTitleStyle}>{course.name}</h3>
                  <p style={cardSubtitleStyle}>{course.grade}</p>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={cardRowStyle}>
                    <Users style={{ width: "14px", height: "14px", color: "#555" }} />
                    <span>{course.students} students</span>
                  </div>
                  <div style={cardRowStyle}>
                    <Clock style={{ width: "14px", height: "14px", color: "#555" }} />
                    <span>{course.schedule}</span>
                  </div>
                </div>

                {/* Lessons preview */}
                {loadingLessons && (!course.lessons || course.lessons.length === 0) ? (
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>Loading lessons...</div>
                ) : lessonErrors[course.id] ? (
                  <div style={{ marginTop: 8, color: '#dc2626', fontSize: 12 }}>Failed to load lessons</div>
                ) : (course.lessons && course.lessons.length > 0) ? (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                      {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>No lessons yet</div>
                )}

                {/* Progress Bar and Completion Status */}
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "6px"
                  }}>
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div style={{
                    height: "6px",
                    background: "#e5e7eb",
                    borderRadius: "3px",
                    overflow: "hidden",
                    width: "100%"
                  }}>
                    <div style={{
                      height: "100%",
                      borderRadius: "3px",
                      transition: "width 0.3s",
                      width: `${course.progress}%`,
                      backgroundColor: course.color
                    }} />
                  </div>
                  {completions[course.id] && (
                    <div style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#6b7280"
                    }}>
                      {completions[course.id].completed} of {completions[course.id].total} lessons completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ================================================================================
// FILE: src\pages\student\ProfilePage.jsx
// ================================================================================

import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import profilesService from '@/services/profilesService';

// Helper to format ISO dates cleanly
const formatDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return iso;
  }
};

export function ProfilePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("about");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Local editable fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('Loading profile for user:', user);
        const res = await profilesService.getProfileByUserId(user.id);
        console.log('API response for profile:', res);
        const data = res?.data || res || null;
        console.log('Loaded profile data:', data);
        console.log('User data:', user);
        if (!mounted) return;
        setProfile(data || null);

        // initialize editable fields from profile or user
        const src = { ...user, ...(data || {}) };
        setFirstName(src.firstName || '');
        setMiddleName(src.middleName || '');
        setLastName(src.lastName || '');
        setDateOfBirth(src.dateOfBirth || src.dob || '');
        setGender(src.gender || '');
        setPhone(src.phone || '');
        setAddress(src.address || '');
        setFamilyName(src.familyName || '');
        setFamilyRelationship(src.familyRelationship || '');
        setFamilyContact(src.familyContact || '');
        setGradeLevel(src.gradeLevel || src.grade || '');

      } catch (err) {
        console.warn('Failed to load profile', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);



  const tabs = [
    { id: "about", label: "About Me" },
    { id: "family", label: "Family" },
  ];

  // Inline Style Objects (kept from original)
  const containerStyle = { padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' };
  const cardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
  const tabContainerStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

  const fullName = `${firstName} ${middleName ? (middleName + ' ') : ''}${lastName}`.trim();

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ width: '128px', height: '128px', background: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={64} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0' }}>
              {fullName || user?.email}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '6px' }}>
              {user?.studentId ? `ID: ${user.studentId}` : ''}
            </p>
            <p style={{ marginTop: 0, color: '#111827', fontSize: '1rem' }}>
              Grade: <strong style={{ fontWeight: 800 }}>{gradeLevel || '—'}</strong>
            </p>


          </div>
        </div>
      </div>

      <div style={tabContainerStyle}>
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', backgroundColor: '#ffffff' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', border: 'none', background: 'none', color: activeTab === tab.id ? '#dc2626' : '#6b7280', borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent', transition: 'all 0.2s ease' }}>{tab.label}</button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === "about" && (
            <AboutMeTab
              user={user}
              firstName={firstName}
              middleName={middleName}
              lastName={lastName}
              dateOfBirth={dateOfBirth}
              gender={gender}
              phone={phone}
              address={address}
            />
          )}

          {activeTab === "family" && (
            <FamilyTab
              profile={profile}
              familyName={familyName}
              familyRelationship={familyRelationship}
              familyContact={familyContact}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------
// Tab Components
// --------------------

function AboutMeTab({ user, firstName, middleName, lastName, dateOfBirth, gender, phone, address }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Basic Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Full Name" value={`${firstName} ${middleName ? (middleName + ' ') : ''}${lastName}`} />
          <InfoRow label="Date of Birth" value={dateOfBirth ? formatDate(dateOfBirth) : '—'} />
        </div>
      </section>

      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Contact Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Email" value={user?.email || '—'} />
          <InfoRow label="Phone" value={phone || '—'} />
          <InfoRow label="City" value={address || '—'} />
          <InfoRow label="Country" value={'Philippines'} />
        </div>
      </section>
    </div>
  );
}

function FamilyTab({ profile, familyName, familyRelationship, familyContact }) {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#111827' }}>{(familyName || '—').toUpperCase()}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
        <div><span style={{ color: '#6b7280' }}>Relationship:</span> {familyRelationship || '—'}</div>
        <div><span style={{ color: '#6b7280' }}>Contact:</span> {familyContact || '—'}</div>
      </div>
    </div>
  );
}

// --------------------
// UI Helpers
// --------------------


function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
      <span style={{ color: '#6b7280', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

export default ProfilePage;



// ================================================================================
// FILE: src\pages\student\StudentAssessmentPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';
import StudentAssessmentTakingPage from './StudentAssessmentTakingPage';
import StudentAssessmentResultsPage from './StudentAssessmentResultsPage';

const StudentAssessmentPage = ({ assessment, classItem, onBack }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [takingAssessment, setTakingAssessment] = useState(null);
  const [viewingResultId, setViewingResultId] = useState(null);

  useEffect(() => {
    fetchAttempts();
  }, [assessment.id]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getStudentAttempts(assessment.id);
      if (res?.data && Array.isArray(res.data)) {
        setAttempts(res.data);
      }
    } catch (err) {
      console.error('Failed to load attempts', err);
      toast.error('Failed to load assessment attempts');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    try {
      const res = await assessmentService.startAttempt(assessment.id);
      if (res?.data) {
        setTakingAssessment(res.data);
      }
    } catch (err) {
      console.error('Failed to start attempt', err);
      toast.error('Failed to start assessment attempt');
    }
  };

  const handleViewResults = async (attemptId) => {
    setViewingResultId(attemptId);
  };

  // If taking assessment, show the taking page
  if (takingAssessment) {
    return (
      <StudentAssessmentTakingPage
        assessment={assessment}
        attempt={takingAssessment}
        classItem={classItem}
        onBack={() => {
          setTakingAssessment(null);
          fetchAttempts(); // Reload attempts after completing
        }}
      />
    );
  }

  // If viewing results, show the results page
  if (viewingResultId) {
    const selectedAttempt = attempts.find(a => a.id === viewingResultId);
    if (selectedAttempt) {
      return (
        <StudentAssessmentResultsPage
          attempt={selectedAttempt}
          assessment={assessment}
          onBack={() => setViewingResultId(null)}
        />
      );
    }
  }

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const buttonStyle = {
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const secondaryButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const infoGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
    fontSize: '14px',
  };

  const infoItemStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const attemptsListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const attemptCardStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)} • {assessment.questions?.length || 0} questions
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Assessment Info */}
        <div style={sectionStyle}>
          {assessment.description && (
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              {assessment.description}
            </p>
          )}
          
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Total Points</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.totalPoints}
              </strong>
            </div>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Passing Score</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.passingScore}%
              </strong>
            </div>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Questions</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.questions?.length || 0}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <button
              style={buttonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
              onClick={handleStartAttempt}
            >
              <Play size={16} />
              Start Assessment
            </button>
          </div>
        </div>

        {/* Previous Attempts */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
            My Attempts
          </h2>

          {loading ? (
            <div style={placeholderStyle}>Loading attempts...</div>
          ) : attempts.length === 0 ? (
            <div style={placeholderStyle}>
              <p>No attempts yet. Start an assessment to begin!</p>
            </div>
          ) : (
            <div style={attemptsListStyle}>
              {attempts.map((attempt, idx) => (
                <div key={attempt.id} style={attemptCardStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}>
                        Attempt {idx + 1}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: attempt.passed ? '#dcfce7' : '#fee2e2',
                        color: attempt.passed ? '#15803d' : '#dc2626',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}>
                        {attempt.passed ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                      <span>Score: <strong>{(attempt.score || 0).toFixed(1)}%</strong></span>
                      <span>Points: <strong>{attempt.score ? (attempt.score * assessment.totalPoints / 100).toFixed(1) : 0}/{assessment.totalPoints}</strong></span>
                      <span>Date: <strong>{new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                  <button
                    style={secondaryButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }}
                    onClick={() => handleViewResults(attempt.id)}
                  >
                    <Eye size={14} />
                    View Results
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssessmentPage;



// ================================================================================
// FILE: src\pages\student\StudentAssessmentResultsPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const StudentAssessmentResultsPage = ({ attempt, assessment, onBack }) => {
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attempt.id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getAttemptResults(attempt.id);
      if (res?.data) {
        setResultData(res.data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const scoreCardStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  };

  const scoreItemStyle = {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  };

  const scoreNumberStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 8px 0',
  };

  const scoreLabelStyle = {
    fontSize: '14px',
    color: '#6b7280',
  };

  const feedbackBannerStyle = (status) => ({
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor:
      status === 'unlocked' ? '#f0fdf4' :
      status === 'locked' ? '#fef3c7' :
      '#fef2f2',
    border:
      status === 'unlocked' ? '1px solid #bbf7d0' :
      status === 'locked' ? '1px solid #fde68a' :
      '1px solid #fecaca',
  });

  const feedbackMessageStyle = (status) => ({
    fontSize: '14px',
    color:
      status === 'unlocked' ? '#15803d' :
      status === 'locked' ? '#92400e' :
      '#dc2626',
    margin: 0,
  });

  const questionListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const questionCardStyle = (isCorrect) => ({
    padding: '16px',
    border: `2px solid ${isCorrect ? '#d1fae5' : '#fee2e2'}`,
    borderRadius: '8px',
    backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
  });

  const questionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button
            style={backButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={onBack}
          >
            <ArrowLeft size={20} style={{ color: '#111827' }} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              {assessment.title}
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Results
            </p>
          </div>
        </div>
        <div style={contentStyle}>
          <div style={placeholderStyle}>Loading results...</div>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button
            style={backButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={onBack}
          >
            <ArrowLeft size={20} style={{ color: '#111827' }} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              {assessment.title}
            </h1>
          </div>
        </div>
        <div style={contentStyle}>
          <div style={placeholderStyle}>Failed to load results</div>
        </div>
      </div>
    );
  }

  const feedbackStatus = resultData.feedbackStatus || {};
  const isLocked = !feedbackStatus.unlocked;
  const score = resultData.score || 0;
  const passed = resultData.passed;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Results • {new Date(resultData.submittedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Score Card */}
        <div style={sectionStyle}>
          <div style={scoreCardStyle}>
            <div style={scoreItemStyle}>
              <div style={scoreNumberStyle}>{score.toFixed(1)}%</div>
              <div style={scoreLabelStyle}>Your Score</div>
            </div>
            <div style={scoreItemStyle}>
              <div
                style={{
                  fontSize: '48px',
                  margin: '0 0 8px 0',
                }}
              >
                {passed ? '✓' : '✗'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: passed ? '#15803d' : '#dc2626',
                }}
              >
                {passed ? 'PASSED' : 'FAILED'}
              </div>
              <div style={scoreLabelStyle}>
                {assessment.passingScore}% needed
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Status Banner */}
        {feedbackStatus && (
          <div style={feedbackBannerStyle(feedbackStatus.unlocked ? 'unlocked' : 'locked')}>
            <div>
              {feedbackStatus.unlocked ? (
                <CheckCircle size={20} style={{ color: '#15803d' }} />
              ) : (
                <Lock size={20} style={{ color: '#92400e' }} />
              )}
            </div>
            <div>
              <p style={feedbackMessageStyle(feedbackStatus.unlocked ? 'unlocked' : 'locked')}>
                {feedbackStatus.message}
              </p>
              {feedbackStatus.hoursRemaining > 0 && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Available in {feedbackStatus.hoursRemaining} {feedbackStatus.hoursRemaining === 1 ? 'hour' : 'hours'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question Review */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
            Question Review {feedbackStatus.unlocked ? '& Feedback' : ''}
          </h2>

          <div style={questionListStyle}>
            {(resultData.responses || []).map((response, idx) => (
              <div
                key={response.id}
                style={questionCardStyle(response.isCorrect)}
              >
                <div style={questionHeaderStyle}>
                  <div>
                    {response.isCorrect ? (
                      <CheckCircle size={20} style={{ color: '#15803d' }} />
                    ) : (
                      <XCircle size={20} style={{ color: '#dc2626' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>
                        Question {idx + 1}
                      </strong>
                      <span
                        style={{
                          fontSize: '12px',
                          backgroundColor: response.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: response.isCorrect ? '#15803d' : '#dc2626',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontWeight: '600',
                        }}
                      >
                        {response.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                      {response.pointsEarned !== null && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {response.pointsEarned} / {response.question?.points || 0} points
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        color: '#111827',
                        fontWeight: '500',
                      }}
                    >
                      {response.question?.content}
                    </p>
                  </div>
                </div>

                {/* Show answer details only if unlocked */}
                {feedbackStatus.unlocked && response.isCorrect !== null && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    {response.studentAnswer && (
                      <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <strong>Your Answer:</strong>
                        <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                          {response.studentAnswer}
                        </div>
                      </div>
                    )}

                    {response.question?.options && response.question.options.length > 0 && (
                      <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <strong>Options Review:</strong>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {response.question.options.map((option) => (
                            <div
                              key={option.id}
                              style={{
                                padding: '8px',
                                backgroundColor: option.isCorrect ? '#f0fdf4' : 'rgba(0,0,0,0.02)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            >
                              {option.isCorrect && <strong>✓ </strong>}
                              {option.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Learning Hint (always shown) */}
                {response.hint && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#eff6ff',
                    borderLeft: '3px solid #3b82f6',
                    borderRadius: '4px',
                  }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                      💡 <strong>Learning Tip:</strong> {response.hint}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Study Resources */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            📚 Suggested Study Resources
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {!passed ? (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Review the lesson content</strong> for topics you struggled with
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Take more practice</strong> to build confidence
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Ask your teacher</strong> for clarification on difficult topics
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ You can retake</strong> this assessment to improve your score
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>🎉 Great job!</strong> You passed the assessment
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Review the feedback</strong> to deepen your understanding
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssessmentResultsPage;



// ================================================================================
// FILE: src\pages\student\StudentAssessmentTakingPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Flag } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const StudentAssessmentTakingPage = ({ assessment, attempt, classItem, onBack }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState(attempt.responses || {});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const questions = assessment.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  // Track time spent
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswerChange = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAssessment = async () => {
    // Validate all questions are answered
    const allAnswered = questions.every(q => responses[q.id] !== undefined);
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = questions.map(q => {
        const answer = responses[q.id];
        return {
          questionId: q.id,
          studentAnswer: q.type === 'short_answer' || q.type === 'fill_blank' ? answer : undefined,
          selectedOptionId: ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) ? answer : undefined,
          selectedOptionIds: q.type === 'multiple_select' ? (Array.isArray(answer) ? answer : []) : undefined,
        };
      });

      const res = await assessmentService.submitAssessment({
        assessmentId: assessment.id,
        responses: responseArray,
        timeSpentSeconds: timeElapsed,
      });

      if (res?.data) {
        toast.success('Assessment submitted successfully!');
        setTimeout(() => onBack(), 1500);
      }
    } catch (err) {
      console.error('Failed to submit assessment', err);
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const value = responses[currentQuestion.id] || '';

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${value === option.id ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: value === option.id ? '#fef2f2' : '#ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#111827' }}>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_select':
        const selectedIds = value || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${selectedIds.includes(option.id) ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedIds.includes(option.id) ? '#fef2f2' : '#ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleAnswerChange(currentQuestion.id, [...selectedIds, option.id]);
                    } else {
                      handleAnswerChange(currentQuestion.id, selectedIds.filter(id => id !== option.id));
                    }
                  }}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#111827' }}>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div style={{ display: 'flex', gap: '12px' }}>
            {['true', 'false'].map(option => (
              <button
                key={option}
                onClick={() => handleAnswerChange(currentQuestion.id, currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: responses[currentQuestion.id] === currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id ? '#dc2626' : '#f3f4f6',
                  color: responses[currentQuestion.id] === currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id ? '#ffffff' : '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (responses[currentQuestion.id] !== currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (responses[currentQuestion.id] !== currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            placeholder="Enter your answer..."
            rows="4"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">Select an answer...</option>
            {currentQuestion.options.map(option => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const mainContentStyle = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  };

  const questionPaneStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const sidebarStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    height: 'fit-content',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Question {currentQuestionIdx + 1} of {questions.length}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Time Elapsed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', fontFamily: 'monospace' }}>
            {formatTime(timeElapsed)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Question Pane */}
        <div style={questionPaneStyle}>
          {currentQuestion && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#dbeafe',
                      color: '#0369a1',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQuestion.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQuestion.points} points
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {currentQuestion.content}
                </h2>
              </div>

              <div style={{ marginBottom: '32px' }}>
                {renderQuestionInput()}
              </div>

              {currentQuestion.explanation && responses[currentQuestion.id] && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '6px',
                    marginBottom: '24px',
                  }}
                >
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', margin: '0 0 8px 0' }}>
                    Explanation
                  </p>
                  <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: currentQuestionIdx === 0 ? '#f3f4f6' : '#ffffff',
                    color: currentQuestionIdx === 0 ? '#9ca3af' : '#111827',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                  >
                    <Flag size={16} />
                    Submit Assessment
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Question Navigator */}
        <div style={sidebarStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Questions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                style={{
                  padding: '8px',
                  backgroundColor:
                    idx === currentQuestionIdx
                      ? '#dc2626'
                      : responses[q.id] !== undefined
                      ? '#dcfce7'
                      : '#f3f4f6',
                  color:
                    idx === currentQuestionIdx ? '#ffffff' : idx === currentQuestionIdx ? '#ffffff' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={
                  responses[q.id] !== undefined ? 'Answered' : 'Not answered'
                }
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#dcfce7', borderRadius: '2px', marginRight: '6px' }}></span>
              Answered
            </div>
            <div>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '2px', marginRight: '6px' }}></span>
              Not answered
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              width: '90%',
              maxWidth: '500px',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
              Submit Assessment?
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Are you sure you want to submit your assessment? You won't be able to change your answers after submission.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirmSubmit(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Keep Working
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmitAssessment}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssessmentTakingPage;



// ================================================================================
// FILE: src\pages\student\StudentClassDetailsPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, Bell, BarChart3, FileText } from 'lucide-react';
import lessonService from '@/services/lessonService';
import assessmentService from '@/services/assessmentService';
import StudentLessonViewerPage from './StudentLessonViewerPage';
import StudentAssessmentPage from './StudentAssessmentPage';
import { toast } from 'sonner';

const StudentClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completions, setCompletions] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [studentAttempts, setStudentAttempts] = useState({});

  // Tab configuration
  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: Book },
     {id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Bell }, 
    { id: 'grades', label: 'Grades', icon: BarChart3 },
  ];

  // Fetch lessons and assessments on component mount
  useEffect(() => {
    if (classItem?.id) {
      fetchLessons();
      fetchAssessments();
    }
  }, [classItem?.id]);

  const fetchLessons = async () => {
    setLoadingLessons(true);
    try {
      const res = await lessonService.getLessonsByClass(classItem.id);
      if (res?.data) {
        setLessons(res.data);
      }
    } catch (err) {
      console.error('Failed to load lessons', err);
      toast.error('Failed to load lessons');
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fetch lesson completions for this class
  useEffect(() => {
    if (!classItem?.id || lessons.length === 0) return;

    const fetchCompletions = async () => {
      try {
        const res = await lessonService.getCompletedLessonsForClass(classItem.id);
        if (res?.data && Array.isArray(res.data)) {
          const completionMap = {};
          res.data.forEach(completion => {
            completionMap[completion.lessonId] = {
              isCompleted: true,
              completedAt: completion.completedAt,
            };
          });
          setCompletions(completionMap);
        }
      } catch (err) {
        console.error('Failed to load lesson completions', err);
        // Don't show error toast for this, it's optional
      }
    };

    fetchCompletions();
  }, [classItem?.id, lessons.length]);

  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const res = await assessmentService.getAssessmentsByClass(classItem.id);
      if (res?.data) {
        // Only show published assessments to students
        const publishedAssessments = res.data.filter(a => a.isPublished);
        setAssessments(publishedAssessments);
        
        // Fetch student attempts for each assessment
        publishedAssessments.forEach(async (assessment) => {
          try {
            const attemptsRes = await assessmentService.getStudentAttempts(assessment.id);
            if (attemptsRes?.data && Array.isArray(attemptsRes.data)) {
              setStudentAttempts(prev => (
                {
                  ...prev,
                  [assessment.id]: attemptsRes.data,
                }
              ));
            }
          } catch (err) {
            console.error('Failed to load assessment attempts', err);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
      toast.error('Failed to load assessments');
    } finally {
      setLoadingAssessments(false);
    }
  };

  // Container styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const titleContainerStyle = {
    flex: 1,
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  };

  // Tab navigation styles
  const tabNavigationStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    padding: '0 32px',
    gap: '8px',
    overflowX: 'auto',
  };

  const tabButtonStyle = (isActive) => ({
    padding: '16px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: isActive ? '#dc2626' : '#6b7280',
    borderBottom: isActive ? '3px solid #dc2626' : '3px solid transparent',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  });

  const tabIconStyle = {
    width: '16px',
    height: '16px',
  };

  // Content styles
  const contentStyle = {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  };

  const placeholderTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  };

  const placeholderDescStyle = {
    fontSize: '14px',
  };

  // Lesson list styles
  const lessonListStyle = {
    display: 'grid',
    gap: '12px',
  };

  const lessonItemStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff',
  };

  const lessonItemHoverStyle = {
    backgroundColor: '#f9fafb',
    borderColor: '#dc2626',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const lessonTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    marginBottom: '6px',
  };

  const lessonDescStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    marginBottom: '8px',
  };

  const lessonStatusStyle = (isDraft) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: isDraft ? '#fef3c7' : '#d1fae5',
    color: isDraft ? '#d97706' : '#059669',
  });

  const completionBadgeStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#0369a1',
    marginLeft: '8px',
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'lessons':
        return (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Course Lessons
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loadingLessons ? (
              <div style={placeholderStyle}>
                <p>Loading lessons...</p>
              </div>
            ) : lessons.length === 0 ? (
              <div style={placeholderStyle}>
                <p style={placeholderTitleStyle}>No Lessons Yet</p>
                <p style={placeholderDescStyle}>Your instructor hasn't created any lessons for this course.</p>
              </div>
            ) : (
              <div style={lessonListStyle}>
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    style={lessonItemStyle}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, lessonItemHoverStyle);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={lessonTitleStyle}>{lesson.title}</h3>
                        {lesson.description && <p style={lessonDescStyle}>{lesson.description}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        {completions[lesson.id]?.isCompleted && (
                          <span style={completionBadgeStyle}>
                            ✓ Completed
                          </span>
                        )}
                        <span style={lessonStatusStyle(lesson.isDraft)}>
                          {lesson.isDraft ? 'Draft' : 'Published'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'announcements':
        return (
          <div style={placeholderStyle}>
            <p style={placeholderTitleStyle}>Announcements</p>
            <p style={placeholderDescStyle}>No announcements yet. Check back soon for updates from your instructor.</p>
          </div>
        );
      case 'assessments':
        return (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Course Assessments
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loadingAssessments ? (
              <div style={placeholderStyle}>
                <p>Loading assessments...</p>
              </div>
            ) : assessments.length === 0 ? (
              <div style={placeholderStyle}>
                <p style={placeholderTitleStyle}>No Assessments Yet</p>
                <p style={placeholderDescStyle}>Your instructor hasn't published any assessments for this course.</p>
              </div>
            ) : (
              <div style={lessonListStyle}>
                {assessments.map((assessment) => {
                  const attempts = studentAttempts[assessment.id] || [];
                  const hasAttempted = attempts.length > 0;
                  const latestAttempt = hasAttempted ? attempts[attempts.length - 1] : null;
                  
                  return (
                    <div
                      key={assessment.id}
                      style={lessonItemStyle}
                      onMouseEnter={(e) => {
                        Object.assign(e.currentTarget.style, lessonItemHoverStyle);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => setSelectedAssessment(assessment)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={lessonTitleStyle}>{assessment.title}</h3>
                          {assessment.description && <p style={lessonDescStyle}>{assessment.description}</p>}
                          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                            <span>Type: <strong>{assessment.type}</strong></span>
                            <span>Points: <strong>{assessment.totalPoints}</strong></span>
                            <span>Passing: <strong>{assessment.passingScore}%</strong></span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', whiteSpace: 'nowrap' }}>
                          {hasAttempted && latestAttempt && (
                            <div style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: latestAttempt.passed ? '#dcfce7' : '#fee2e2',
                                  color: latestAttempt.passed ? '#15803d' : '#dc2626',
                                }}
                              >
                                Score: {latestAttempt.score?.toFixed(1) || 0}% {latestAttempt.passed ? '✓ PASSED' : '✗ FAILED'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )}
                          {!hasAttempted && (
                            <span style={lessonStatusStyle(false)}>
                              Not Started
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'grades':
        return (
          <div style={placeholderStyle}>
            <p style={placeholderTitleStyle}>Grades</p>
            <p style={placeholderDescStyle}>Your grades will appear here as assignments are graded.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return selectedLesson ? (
    <StudentLessonViewerPage
      lesson={selectedLesson}
      classItem={classItem}
      allLessons={lessons}
      onBack={() => setSelectedLesson(null)}
    />
  ) : selectedAssessment ? (
    <StudentAssessmentPage
      assessment={selectedAssessment}
      classItem={classItem}
      onBack={() => {
        setSelectedAssessment(null);
        fetchAssessments(); // Reload to get updated attempts
      }}
    />
  ) : (
    <div style={containerStyle}>
      {/* Header with Back Button and Class Title */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>{classItem?.name || 'Class Details'}</h1>
          <p style={subtitleStyle}>
            {classItem?.grade || 'Grade —'} • {classItem?.schedule || '—'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={tabNavigationStyle}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              style={tabButtonStyle(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <IconComponent style={tabIconStyle} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={contentStyle}>
        <div style={sectionStyle}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default StudentClassDetailsPage;



// ================================================================================
// FILE: src\pages\student\StudentLessonViewerPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import lessonService from '@/services/lessonService';
import { toast } from 'sonner';

const StudentLessonViewerPage = ({ lesson, classItem, onBack, allLessons = [] }) => {
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Fetch lesson content blocks on mount
  useEffect(() => {
    if (lesson?.id) {
      fetchLessonContent();
      fetchCompletionStatus();
    }
  }, [lesson?.id]);

  // Track scroll position
  useEffect(() => {
    const handleScroll = (e) => {
      const scrollContainer = e.target;
      const scrollPercentage = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
      setScrollPosition(Math.min(scrollPercentage, 100));
    };

    const scrollableDiv = document.getElementById('lesson-content-container');
    if (scrollableDiv) {
      scrollableDiv.addEventListener('scroll', handleScroll);
      return () => scrollableDiv.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchLessonContent = async () => {
    setLoading(true);
    try {
      // Fetch lesson with detail (assuming endpoint returns blocks)
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data && res.data.contentBlocks) {
        setContentBlocks(res.data.contentBlocks);
      }
    } catch (err) {
      console.error('Failed to load lesson content', err);
      toast.error('Failed to load lesson content');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely convert content to string
  const getContentString = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      // If it's an empty object, return empty string
      if (Object.keys(content).length === 0) return '';
      // Otherwise stringify it
      return typeof content === 'object' ? JSON.stringify(content) : String(content);
    }
    return String(content);
  };

  // Fetch completion status from backend
  const fetchCompletionStatus = async () => {
    try {
      const res = await lessonService.checkLessonCompletion(lesson.id);
      if (res?.data) {
        setIsCompleted(res.data.isCompleted);
      }
    } catch (err) {
      console.error('Failed to load completion status', err);
      // Don't show error toast for this, it's optional
    }
  };

  // Mark lesson as complete and save to backend
  const handleMarkComplete = async () => {
    try {
      await lessonService.markLessonComplete(lesson.id);
      setIsCompleted(true);
      toast.success('Great job! Lesson marked as complete.');
    } catch (err) {
      console.error('Failed to mark lesson complete', err);
      toast.error('Failed to save completion status');
    }
  };

  const currentLessonIndex = allLessons.findIndex(l => l.id === lesson.id);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // ===== STYLES =====
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    color: '#111827',
  };

  const headerTitleStyle = {
    flex: 1,
  };

  const headerLessonTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  };

  const headerClassNameStyle = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0 0',
  };

  const progressBarStyle = {
    height: '3px',
    backgroundColor: '#e5e7eb',
    width: '100%',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#dc2626',
    width: `${scrollPosition}%`,
    transition: 'width 0.1s ease',
  };

  const contentContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '32px 20px',
  };

  const contentWrapperStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  };

  const lessonHeaderStyle = {
    marginBottom: '40px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  };

  const lessonTitleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 12px 0',
    lineHeight: '1.2',
  };

  const lessonDescStyle = {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.6',
  };

  const blocksContainerStyle = {
    display: 'grid',
    gap: '32px',
  };

  const blockStyle = {
    animation: 'fadeIn 0.3s ease-in',
  };

  const textBlockStyle = {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.8',
    margin: 0,
  };

  const imageBlockStyle = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const imageCaptionStyle = {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    fontStyle: 'italic',
    textAlign: 'center',
  };

  const videoContainerStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    height: 0,
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: '#000',
  };

  const videoIframeStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  };

  const blockContainerStyle = {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const blockTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 12px 0',
  };

  const dividerStyle = {
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '24px 0',
    border: 'none',
  };

  const fileCardStyle = {
    padding: '16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const bottomSectionStyle = {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '24px 20px',
    marginTop: 'auto',
  };

  const bottomWrapperStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  };

  const completionAreaStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  };

  const completionTextStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const completionButtonStyle = {
    padding: '10px 16px',
    backgroundColor: isCompleted ? '#dcfce7' : '#dc2626',
    color: isCompleted ? '#166534' : '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: isCompleted ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  const navigationAreaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const navButtonStyle = (disabled) => ({
    padding: '10px 16px',
    backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: disabled ? '#9ca3af' : '#111827',
    transition: 'all 0.2s',
    opacity: disabled ? 0.5 : 1,
  });

  // ===== CONTENT BLOCK RENDERERS =====
  const renderContentBlock = (block, index) => {
    switch (block.type) {
      case 'text':
       
        const textContent = getContentString(block.content);
        if (!textContent) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No text content</p>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <p style={textBlockStyle}>{textContent}</p>
          </div>
        );

      case 'image':
        const imageSrc = getContentString(block.content);
        if (!imageSrc) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={{ ...blockContainerStyle, backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>🖼️ No image content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <img
              src={imageSrc}
              alt={block.metadata?.caption || 'Lesson image'}
              style={imageBlockStyle}
              onError={(e) => {
                e.target.style.border = '2px solid #dc2626';
                e.target.style.backgroundColor = '#fee2e2';
              }}
            />
            {block.metadata?.caption && (
              <p style={imageCaptionStyle}>{block.metadata.caption}</p>
            )}
          </div>
        );

      case 'video':
        const videoUrl = getContentString(block.content);
        
        // Handle invalid video URLs
        if (!videoUrl) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
                  ⚠️ Invalid video content
                </p>
              </div>
            </div>
          );
        }

        const embedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
          ? videoUrl.replace('watch?v=', 'embed/')
          : videoUrl;

        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={videoContainerStyle}>
              <iframe
                style={videoIframeStyle}
                src={embedUrl}
                title={block.metadata?.title || 'Embedded video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            {block.metadata?.title && (
              <p style={{ ...imageCaptionStyle, marginTop: '12px' }}>
                {block.metadata.title}
              </p>
            )}
          </div>
        );

      case 'question':
        
        const questionContent = getContentString(block.content.text);
        if (!questionContent) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No question content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={blockContainerStyle}>
              <h3 style={blockTitleStyle}>{questionContent}</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {block.metadata?.type === 'quiz' ? '(Quiz Question)' : '(Discussion Question)'}
              </p>
              {block.metadata?.type === 'quiz' && (
                <div style={{ marginTop: '12px' }}>
                  {/* TODO: Implement quiz answering */}
                  <p style={{ fontSize: '12px', color: '#dc2626', fontStyle: 'italic' }}>
                    Quiz features coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'file':
        const fileContent = getContentString(block.content);
        const filename = block.metadata?.filename || fileContent || 'Download File';
        if (!fileContent && !block.metadata?.filename) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No file content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={fileCardStyle}>
              <div style={{ fontSize: '24px' }}>📎</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {filename}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {block.metadata?.filesize || 'Click to download'}
                </p>
              </div>
              <div style={{ fontSize: '18px' }}>↓</div>
            </div>
          </div>
        );

      case 'divider':
        return <hr key={block.id || index} style={dividerStyle} />;

      default:
        return (
          <div key={block.id || index} style={blockStyle}>
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              Unknown block type: {block.type}
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button style={backButtonStyle} onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div style={headerTitleStyle}>
            <p style={headerLessonTitleStyle}>Loading...</p>
          </div>
        </div>
        <div style={{ ...contentContainerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6b7280' }}>Loading lesson content...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Sticky Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={headerTitleStyle}>
          <p style={headerLessonTitleStyle}>{lesson?.title || 'Lesson'}</p>
          <p style={headerClassNameStyle}>{classItem?.name || 'Course'}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={progressBarStyle}>
        <div style={progressFillStyle}></div>
      </div>

      {/* Main Content - Long Scroll */}
      <div id="lesson-content-container" style={contentContainerStyle}>
        <div style={contentWrapperStyle}>
          {/* Lesson Info */}
          <div style={lessonHeaderStyle}>
            <h1 style={lessonTitleStyle}>{lesson?.title}</h1>
            {lesson?.description && (
              <p style={lessonDescStyle}>{getContentString(lesson.description)}</p>
            )}
          </div>

          {/* Content Blocks */}
          {contentBlocks.length > 0 ? (
            <div style={blocksContainerStyle}>
              {contentBlocks.map((block, index) => renderContentBlock(block, index))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <p>No content blocks in this lesson yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Completion & Navigation */}
      <div style={bottomSectionStyle}>
        <div style={bottomWrapperStyle}>
          {/* Completion Status */}
          <div style={completionAreaStyle}>
            <div style={completionTextStyle}>
              {isCompleted && <CheckCircle2 size={20} style={{ color: '#10b981' }} />}
              <span style={{ fontSize: '14px', color: isCompleted ? '#10b981' : '#6b7280' }}>
                {isCompleted ? 'Lesson completed!' : 'Mark this lesson as complete when finished'}
              </span>
            </div>
            <button
              style={completionButtonStyle}
              onClick={handleMarkComplete}
              disabled={isCompleted}
              onMouseEnter={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
            >
              {isCompleted ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Lesson Navigation */}
          {(previousLesson || nextLesson) && (
            <div style={navigationAreaStyle}>
              {previousLesson ? (
                <button
                  style={navButtonStyle(false)}
                  onClick={() => {
                    // TODO: Navigate to previous lesson
                    onBack();
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              ) : (
                <button style={navButtonStyle(true)} disabled>
                  <ChevronLeft size={16} />
                  Previous
                </button>
              )}

              {nextLesson ? (
                <button
                  style={navButtonStyle(false)}
                  onClick={() => {
                    // TODO: Navigate to next lesson
                    onBack();
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button style={navButtonStyle(true)} disabled>
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StudentLessonViewerPage;



// ================================================================================
// FILE: src\pages\teacher\AssessmentEditorPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const AssessmentEditorPage = ({ assessment, classId, onBack }) => {
  const [questions, setQuestions] = useState(assessment.questions || []);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [isPublished, setIsPublished] = useState(assessment.isPublished || false);
  const [publishingState, setPublishingState] = useState(false);
  
  // Question form state
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionContent, setQuestionContent] = useState('');
  const [questionPoints, setQuestionPoints] = useState(1);
  const [questionOrder, setQuestionOrder] = useState(questions.length);
  const [options, setOptions] = useState([{ text: '', isCorrect: false, order: 0 }]);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [explanation, setExplanation] = useState('');

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'multiple_select', label: 'Multiple Select' },
    { value: 'true_false', label: 'True/False' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'fill_blank', label: 'Fill in Blank' },
    { value: 'dropdown', label: 'Dropdown' },
  ];

  // Reset form
  const resetForm = () => {
    setQuestionContent('');
    setQuestionType('multiple_choice');
    setQuestionPoints(1);
    setQuestionOrder(questions.length);
    setOptions([{ text: '', isCorrect: false, order: 0 }]);
    setExplanation('');
    setEditingQuestionId(null);
  };

  // Toggle publish status
  const handleTogglePublish = async () => {
    setPublishingState(true);
    try {
      const res = await assessmentService.updateAssessment(assessment.id, {
        isPublished: !isPublished,
      });
      if (res?.data) {
        setIsPublished(!isPublished);
        toast.success(isPublished ? 'Assessment unpublished' : 'Assessment published for students');
      }
    } catch (err) {
      console.error('Failed to update assessment publish status', err);
      toast.error('Failed to update assessment status');
    } finally {
      setPublishingState(false);
    }
  };

  // Open modal to edit question
  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setQuestionContent(question.content);
    setQuestionType(question.type);
    setQuestionPoints(question.points);
    setQuestionOrder(question.order);
    setExplanation(question.explanation || '');
    setOptions(question.options || [{ text: '', isCorrect: false, order: 0 }]);
    setShowQuestionModal(true);
  };

  // Save question (create or update)
  const handleSaveQuestion = async () => {
    if (!questionContent.trim()) {
      toast.error('Please enter a question');
      return;
    }

    // Validate options for question types that require them
    const requiresOptions = ['multiple_choice', 'multiple_select', 'true_false', 'dropdown'];
    if (requiresOptions.includes(questionType)) {
      if (options.length === 0 || options.some(o => !o.text.trim())) {
        toast.error('Please fill in all option text');
        return;
      }

      const hasCorrectOption = options.some(o => o.isCorrect);
      if (!hasCorrectOption) {
        toast.error('Please mark at least one option as correct');
        return;
      }
    }

    setCreatingQuestion(true);
    try {
      if (editingQuestionId) {
        // Update question
        const res = await assessmentService.updateQuestion(editingQuestionId, {
          content: questionContent,
          type: questionType,
          points: parseInt(questionPoints),
          order: parseInt(questionOrder),
          explanation,
          options: requiresOptions.includes(questionType) ? options : undefined,
        });
        if (res?.data) {
          toast.success('Question updated successfully');
          setQuestions(questions.map(q => q.id === editingQuestionId ? res.data : q));
        }
      } else {
        // Create question
        const res = await assessmentService.createQuestion({
          assessmentId: assessment.id,
          content: questionContent,
          type: questionType,
          points: parseInt(questionPoints),
          order: parseInt(questionOrder),
          explanation,
          options: requiresOptions.includes(questionType) ? options : undefined,
        });
        if (res?.data) {
          toast.success('Question created successfully');
          setQuestions([...questions, res.data]);
        }
      }
      setShowQuestionModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save question', err);
      toast.error(editingQuestionId ? 'Failed to update question' : 'Failed to create question');
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;

    try {
      await assessmentService.deleteQuestion(questionId);
      toast.success('Question deleted successfully');
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Failed to delete question', err);
      toast.error('Failed to delete question');
    }
  };

  // Update option
  const handleOptionChange = (idx, field, value) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setOptions(newOptions);
  };

  // Add option
  const handleAddOption = () => {
    setOptions([
      ...options,
      { text: '', isCorrect: false, order: options.length },
    ]);
  };

  // Remove option
  const handleRemoveOption = (idx) => {
    if (options.length <= 1) {
      toast.error('At least one option is required');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const headerRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const addButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const questionCardStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
    backgroundColor: '#ffffff',
  };

  const questionHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const modalHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const modalTitleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  };

  const modalContentStyle = {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  };

  const modalFooterStyle = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
    display: 'block',
  };

  const removeButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Edit questions and answers
          </p>
        </div>
        <button
          style={{
            padding: '10px 16px',
            backgroundColor: isPublished ? '#dc2626' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          disabled={publishingState}
          onMouseEnter={(e) => {
            if (!publishingState) {
              e.target.style.backgroundColor = isPublished ? '#b91c1c' : '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (!publishingState) {
              e.target.style.backgroundColor = isPublished ? '#dc2626' : '#10b981';
            }
          }}
          onClick={handleTogglePublish}
        >
          {isPublished ? (
            <>
              <Unlock size={16} />
              Unpublish
            </>
          ) : (
            <>
              <Lock size={16} />
              Publish
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Assessment Info */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Type:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.type}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Total Points:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.totalPoints}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Passing Score:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.passingScore}%</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Status:</span>
              <strong
                style={{
                  marginLeft: '8px',
                  color: isPublished ? '#15803d' : '#92400e',
                }}
              >
                {isPublished ? 'Published' : 'Draft'}
              </strong>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div style={sectionStyle}>
          <div style={headerRowStyle}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Questions ({questions.length})
            </h2>
            <button
              style={addButtonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
              onClick={() => {
                resetForm();
                setShowQuestionModal(true);
              }}
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              <p>No questions yet. Add your first question to get started.</p>
            </div>
          ) : (
            <div>
              {questions.map((question, idx) => (
                <div key={question.id} style={questionCardStyle}>
                  <div style={questionHeaderStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Q{idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            backgroundColor: '#dbeafe',
                            color: '#0369a1',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {question.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {question.points} pts
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                        }}
                      >
                        {question.content}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #e5e7eb' }}>
                          {question.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              style={{
                                fontSize: '13px',
                                color: option.isCorrect ? '#15803d' : '#6b7280',
                                marginBottom: '4px',
                              }}
                            >
                              {option.isCorrect && <strong>✓ </strong>}
                              {option.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dbeafe',
                          color: '#0369a1',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#bfdbfe')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#dbeafe')}
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>
                {editingQuestionId ? 'Edit Question' : 'Add Question'}
              </h2>
              <button
                style={closeButtonStyle}
                onClick={() => {
                  setShowQuestionModal(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              {/* Question Content */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Question *</label>
                <textarea
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  placeholder="Enter your question here..."
                  rows="3"
                  style={{ ...inputStyle, fontFamily: 'Arial, sans-serif' }}
                />
              </div>

              {/* Question Type and Points */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Question Type *</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    style={inputStyle}
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Points *</label>
                  <input
                    type="number"
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(e.target.value)}
                    min="1"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Explanation (Optional)</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain the correct answer..."
                  rows="2"
                  style={{ ...inputStyle, fontFamily: 'Arial, sans-serif' }}
                />
              </div>

              {/* Options (for applicable question types) */}
              {['multiple_choice', 'multiple_select', 'true_false', 'dropdown'].includes(questionType) && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Options *</label>
                    <button
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        color: '#111827',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                      onClick={handleAddOption}
                    >
                      + Add Option
                    </button>
                  </div>

                  {options.map((option, idx) => (
                    <div key={idx} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                          style={{ marginTop: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          style={{ flex: 1, ...inputStyle }}
                        />
                        {options.length > 1 && (
                          <button
                            style={{
                              ...removeButtonStyle,
                              marginTop: '0',
                              padding: '8px 12px',
                            }}
                            onClick={() => handleRemoveOption(idx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowQuestionModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                disabled={creatingQuestion}
                onMouseEnter={(e) => {
                  if (!creatingQuestion) e.target.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  if (!creatingQuestion) e.target.style.backgroundColor = '#dc2626';
                }}
                onClick={handleSaveQuestion}
              >
                {creatingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentEditorPage;



// ================================================================================
// FILE: src\pages\teacher\ClassDetailsPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, BarChart3, Bell, Users, FileText, Plus, Trash2, Edit2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/adminService';
import lessonService from '@/services/lessonService';
import assessmentService from '@/services/assessmentService';
import LessonEditorPage from './LessonEditorPage';
import AssessmentEditorPage from './AssessmentEditorPage';

const ClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);

  // Lesson states
  const [lessons, setLessons] = useState([]);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null); // For navigation to LessonEditorPage

  // Assessment states
  const [assessments, setAssessments] = useState([]);
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
  const [newAssessmentDesc, setNewAssessmentDesc] = useState('');
  const [newAssessmentType, setNewAssessmentType] = useState('quiz');
  const [newAssessmentPoints, setNewAssessmentPoints] = useState(100);
  const [newAssessmentPassingScore, setNewAssessmentPassingScore] = useState(60);
  const [newAssessmentFeedbackLevel, setNewAssessmentFeedbackLevel] = useState('standard');
  const [newAssessmentFeedbackDelayHours, setNewAssessmentFeedbackDelayHours] = useState(24);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);

  // Tab configuration with icons
  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: Book },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: Users },
  ];

  // Fetch enrolled students when component mounts or classItem changes
  useEffect(() => {
    if (classItem?.id) {
      fetchEnrolledStudents();
      fetchLessons();
      fetchAssessments();
    }
  }, [classItem?.id]);

  // Fetch enrolled students when students tab is active
  useEffect(() => {
    if (activeTab === 'students' && classItem?.id && enrolledStudents.length === 0) {
      fetchEnrolledStudents();
    }
  }, [activeTab, classItem?.id]);

  // Fetch candidates when modal opens
  useEffect(() => {
    if (showAddModal && classItem?.id) {
      fetchCandidates();
    }
  }, [showAddModal, classItem?.id]);

  const fetchEnrolledStudents = async () => {
    setLoading(true);
    try {
      const res = await adminService.getClassEnrollments(classItem.id);
      if (res?.data) {
        setEnrolledStudents(res.data);
      }
    } catch (err) {
      console.error('Failed to load enrolled students', err);
      toast.error('Failed to load enrolled students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await adminService.getClassCandidates(classItem.id);
      if (res?.data) {
        setCandidates(res.data);
        setSelectedStudents([]);
      }
    } catch (err) {
      console.error('Failed to load candidates', err);
      toast.error('Failed to load available students');
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setAddingStudents(true);
    const addedCount = { success: 0, failed: 0 };

    for (const studentId of selectedStudents) {
      try {
        await adminService.enrollStudentInClass(classItem.id, studentId);
        addedCount.success += 1;
      } catch (err) {
        console.error(`Failed to add student ${studentId}`, err);
        addedCount.failed += 1;
      }
    }

    setAddingStudents(false);

    if (addedCount.failed === 0) {
      toast.success(`Successfully added ${addedCount.success} student(s)`);
      setShowAddModal(false);
      fetchEnrolledStudents();
    } else {
      toast.error(`Added ${addedCount.success}, failed ${addedCount.failed}`);
      fetchEnrolledStudents();
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the class?')) return;

    try {
      await adminService.removeStudentFromClass(classItem.id, studentId);
      toast.success('Student removed successfully');
      fetchEnrolledStudents();
    } catch (err) {
      console.error('Failed to remove student', err);
      toast.error('Failed to remove student');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const fetchLessons = async () => {
    try {
      const res = await lessonService.getLessonsByClass(classItem.id);
      if (res?.data) {
        setLessons(res.data);
      }
    } catch (err) {
      console.error('Failed to load lessons', err);
    }
  };

  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    setCreatingLesson(true);
    try {
      const res = await lessonService.createLesson({
        title: newLessonTitle,
        description: newLessonDesc,
        classId: classItem.id,
      });
      if (res?.data) {
        toast.success('Lesson created successfully');
        setNewLessonTitle('');
        setNewLessonDesc('');
        setShowCreateLessonModal(false);
        fetchLessons();
      }
    } catch (err) {
      console.error('Failed to create lesson', err);
      toast.error('Failed to create lesson');
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson? This action cannot be undone.')) return;

    try {
      await lessonService.deleteLesson(lessonId);
      toast.success('Lesson deleted successfully');
      fetchLessons();
    } catch (err) {
      console.error('Failed to delete lesson', err);
      toast.error('Failed to delete lesson');
    }
  };

  const handleEditLesson = async (lesson) => {
    try {
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data) {
        setEditingLesson(res.data);
      }
    } catch (err) {
      console.error('Failed to load lesson', err);
      toast.error('Failed to load lesson details');
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await assessmentService.getAssessmentsByClass(classItem.id);
      if (res?.data) {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessmentTitle.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }

    setCreatingAssessment(true);
    try {
      const res = await assessmentService.createAssessment({
        title: newAssessmentTitle,
        description: newAssessmentDesc,
        classId: classItem.id,
        type: newAssessmentType,
        totalPoints: parseInt(newAssessmentPoints),
        passingScore: parseInt(newAssessmentPassingScore),
        feedbackLevel: newAssessmentFeedbackLevel,
        feedbackDelayHours: parseInt(newAssessmentFeedbackDelayHours),
      });
      if (res?.data) {
        toast.success('Assessment created successfully');
        setNewAssessmentTitle('');
        setNewAssessmentDesc('');
        setNewAssessmentType('quiz');
        setNewAssessmentPoints(100);
        setNewAssessmentPassingScore(60);
        setNewAssessmentFeedbackLevel('standard');
        setNewAssessmentFeedbackDelayHours(24);
        setShowCreateAssessmentModal(false);
        fetchAssessments();
      }
    } catch (err) {
      console.error('Failed to create assessment', err);
      toast.error('Failed to create assessment');
    } finally {
      setCreatingAssessment(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Delete this assessment? This action cannot be undone.')) return;

    try {
      await assessmentService.deleteAssessment(assessmentId);
      toast.success('Assessment deleted successfully');
      fetchAssessments();
    } catch (err) {
      console.error('Failed to delete assessment', err);
      toast.error('Failed to delete assessment');
    }
  };

  // Container styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const titleContainerStyle = {
    flex: 1,
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  };

  // Tab navigation styles
  const tabNavigationStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    padding: '0 32px',
    gap: '8px',
    overflowX: 'auto',
  };

  const tabButtonStyle = (isActive) => ({
    padding: '16px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: isActive ? '#dc2626' : '#6b7280',
    borderBottom: isActive ? '3px solid #dc2626' : '3px solid transparent',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  });

  const tabIconStyle = {
    width: '16px',
    height: '16px',
  };

  // Content styles
  const contentStyle = {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  };

  const placeholderTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  };

  const placeholderDescStyle = {
    fontSize: '14px',
  };

  // Students tab styles
  const studentsHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const addButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const theadStyle = {
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #e5e7eb',
  };

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  };

  const tbodyTrStyle = {
    borderBottom: '1px solid #e5e7eb',
  };

  const tdStyle = {
    padding: '16px',
    fontSize: '14px',
    color: '#111827',
  };

  const removeButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  // Modal styles
  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const modalHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const modalTitleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  };

  const modalContentStyle = {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  };

  const modalFooterStyle = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const cancelButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const submitButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const candidateItemStyle = {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const checkboxStyle = {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'lessons':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Lessons ({lessons.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowCreateLessonModal(true)}
              >
                <Plus size={16} />
                Create Lesson
              </button>
            </div>

            {lessons.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No lessons yet</div>
                <div style={placeholderDescStyle}>Create your first lesson to get started teaching this class.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: lesson.isDraft ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                          Lesson {idx + 1}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {lesson.title}
                        </h4>
                        {lesson.isDraft && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                          }}>
                            DRAFT
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                          {lesson.description}
                        </p>
                      )}
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        {lesson.contentBlocks?.length || 0} content block(s)
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
                        onClick={() => handleEditLesson(lesson)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'assessments':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Assessments ({assessments.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowCreateAssessmentModal(true)}
              >
                <Plus size={16} />
                Create Assessment
              </button>
            </div>

            {assessments.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No assessments yet</div>
                <div style={placeholderDescStyle}>Create your first assessment to evaluate student progress.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assessments.map((assessment, idx) => (
                  <div
                    key={assessment.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: !assessment.isPublished ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                          Assessment {idx + 1}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {assessment.title}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          backgroundColor: assessment.isPublished ? '#dcfce7' : '#fef3c7',
                          color: assessment.isPublished ? '#15803d' : '#92400e',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                        }}>
                          {assessment.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                      {assessment.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                          {assessment.description}
                        </p>
                      )}
                      <div style={{ margin: '8px 0 0 0', display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                        <span>Type: <strong>{assessment.type}</strong></span>
                        <span>Points: <strong>{assessment.totalPoints}</strong></span>
                        <span>Passing: <strong>{assessment.passingScore}%</strong></span>
                        <span>Questions: <strong>{assessment.questions?.length || 0}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
                        onClick={() => setEditingAssessment(assessment)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteAssessment(assessment.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'announcements':
        return (
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📢 Announcements</div>
            <div style={placeholderDescStyle}>No announcements posted yet. Share important updates with your class.</div>
          </div>
        );
      case 'gradebook':
        return (
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📊 Gradebook</div>
            <div style={placeholderDescStyle}>Gradebook will display student grades and performance metrics here.</div>
          </div>
        );
      case 'students':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Enrolled Students ({enrolledStudents.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                Add Student
              </button>
            </div>

            {loading ? (
              <div style={placeholderStyle}>Loading students...</div>
            ) : enrolledStudents.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No students enrolled yet</div>
                <div style={placeholderDescStyle}>Add students from your section to get started.</div>
              </div>
            ) : (
              <table style={tableStyle}>
                <thead style={theadStyle}>
                  <tr>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Grade</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((enrollment) => (
                    <tr key={enrollment.id} style={tbodyTrStyle}>
                      <td style={tdStyle}>
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </td>
                      <td style={tdStyle}>{enrollment.student.email}</td>
                      <td style={tdStyle}>{enrollment.student.profile?.gradeLevel || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          style={removeButtonStyle}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                          onClick={() => handleRemoveStudent(enrollment.studentId)}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // If editing a lesson, show the LessonEditorPage instead
  if (editingLesson) {
    return (
      <LessonEditorPage
        lesson={editingLesson}
        classId={classItem.id}
        onBack={() => {
          setEditingLesson(null);
          fetchLessons(); // Reload lessons in case edits were made
        }}
      />
    );
  }

  // If editing an assessment, show the AssessmentEditorPage instead
  if (editingAssessment) {
    return (
      <AssessmentEditorPage
        assessment={editingAssessment}
        classId={classItem.id}
        onBack={() => {
          setEditingAssessment(null);
          fetchAssessments(); // Reload assessments in case edits were made
        }}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header with Back Button and Class Title */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>{classItem?.name || 'Class Details'}</h1>
          <p style={subtitleStyle}>
            {classItem?.grade || 'Grade —'} • {enrolledStudents.length > 0 ? enrolledStudents.length : (classItem?.students || 0)} students
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={tabNavigationStyle}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              style={tabButtonStyle(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = '#6b7280';
                }
              }}
            >
              <IconComponent style={tabIconStyle} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={contentStyle}>
        <div style={sectionStyle}>
          {renderTabContent()}
        </div>
      </div>

      {/* Create Lesson Modal */}
      {showCreateLessonModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Create New Lesson</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowCreateLessonModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="e.g., Introduction to Algebra"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  placeholder="Brief description of this lesson..."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowCreateLessonModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={creatingLesson}
                onMouseEnter={(e) => {
                  if (!creatingLesson) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingLesson) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleCreateLesson}
              >
                {creatingLesson ? 'Creating...' : 'Create Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Add Students Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Add Students to Class</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              {candidates.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  <p>No available students to add</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    All students in this section are already enrolled in this class.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                    Select students from your section to enroll them in this class:
                  </p>
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      style={candidateItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      onClick={() => toggleStudentSelection(candidate.studentId)}
                    >
                      <input
                        type="checkbox"
                        style={checkboxStyle}
                        checked={selectedStudents.includes(candidate.studentId)}
                        onChange={() => toggleStudentSelection(candidate.studentId)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                          {candidate.student.firstName} {candidate.student.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {candidate.student.email}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {candidate.student.profile?.gradeLevel || 'Grade —'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={selectedStudents.length === 0 || addingStudents}
                onMouseEnter={(e) => {
                  if (selectedStudents.length > 0 && !addingStudents) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStudents.length > 0 && !addingStudents) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleAddStudents}
              >
                {addingStudents ? 'Adding...' : `Add ${selectedStudents.length} Student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      {showCreateAssessmentModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Create New Assessment</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowCreateAssessmentModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={newAssessmentTitle}
                  onChange={(e) => setNewAssessmentTitle(e.target.value)}
                  placeholder="e.g., Algebra Quiz 1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newAssessmentDesc}
                  onChange={(e) => setNewAssessmentDesc(e.target.value)}
                  placeholder="Brief description of this assessment..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Assessment Type *
                  </label>
                  <select
                    value={newAssessmentType}
                    onChange={(e) => setNewAssessmentType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Total Points *
                  </label>
                  <input
                    type="number"
                    value={newAssessmentPoints}
                    onChange={(e) => setNewAssessmentPoints(e.target.value)}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Passing Score (%) *
                </label>
                <input
                  type="number"
                  value={newAssessmentPassingScore}
                  onChange={(e) => setNewAssessmentPassingScore(e.target.value)}
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  Smart Feedback Settings
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  Control when and how much feedback students receive after submitting.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Feedback Level *
                  </label>
                  <select
                    value={newAssessmentFeedbackLevel}
                    onChange={(e) => setNewAssessmentFeedbackLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="immediate">Immediate (Score Only)</option>
                    <option value="standard">Standard (With Hints)</option>
                    <option value="detailed">Detailed (Full Feedback)</option>
                  </select>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    Standard: Answers + hints after delay | Detailed: All feedback + hints after delay
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Feedback Delay (Hours) *
                  </label>
                  <input
                    type="number"
                    value={newAssessmentFeedbackDelayHours}
                    onChange={(e) => setNewAssessmentFeedbackDelayHours(e.target.value)}
                    min="0"
                    max="168"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    0 = Immediate | 24 = Next day | 48 = Two days
                  </p>
                </div>
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowCreateAssessmentModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={creatingAssessment}
                onMouseEnter={(e) => {
                  if (!creatingAssessment) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingAssessment) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleCreateAssessment}
              >
                {creatingAssessment ? 'Creating...' : 'Create Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetailsPage;



// ================================================================================
// FILE: src\pages\teacher\ClassesPage.jsx
// ================================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, BookOpen, MoreVertical } from "lucide-react";
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export function ClassesPage({ onViewClassDetails }) {
  // Keep the same mock format initially, but load from API for the current teacher
  const { user } = useAuth();
  const [classes, setClasses] = useState([
   
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  // deterministically pick a color for class cards
  const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F97316","#EC4899","#14B8A6","#64748B"];
  const pickColor = (seed) => {
    if (!seed) return COLORS[0];
    let h = 0; for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
    return COLORS[Math.abs(h) % COLORS.length];
  };

  const mapClassToCard = (c) => ({
    id: c.id,
    name: c.subjectName ? `${c.subjectName} (${(c.subjectCode||'').toUpperCase()})` : (c.subject || 'Unknown'),
    grade: c.subjectGradeLevel ? `Grade ${c.subjectGradeLevel}` : (c.section?.gradeLevel ? `Grade ${c.section.gradeLevel}` : 'Grade —'),
    students: (Array.isArray(c.enrollments) ? c.enrollments.length : 0) || (c.studentCount || 0),
    schedule: c.schedule || '—',
    color: pickColor(c.subjectCode || c.id?.toString() || c.subjectName || c.name),
  });

  const fetchClasses = useCallback(async () => {
    if (!user || !user.userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/teacher/${user.userId}`);
      console.log('API response for teacher classes:', res);
      if (res.data?.data) {
        const items = res.data.data.map(mapClassToCard);
        setClasses(items);
      }
    } catch (err) {
      console.error('Failed to load teacher classes', err);
      // keep mock data as a fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    padding: "32px",
    fontFamily: "Arial, sans-serif"
  };

  const headerStyle = {
    marginBottom: "24px",
  };

  const titleStyle = { fontSize: "24px", margin: 0, color: "#111" };
  const subtitleStyle = { fontSize: "14px", color: "#555" };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px"
  };

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #ddd",
    overflow: "hidden",
    transition: "box-shadow 0.2s, transform 0.2s",
    cursor: "pointer"
  };

  const cardHeaderStyle = color => ({
    height: "6px",
    backgroundColor: color
  });

  const cardContentStyle = { padding: "16px" };
  const cardTitleStyle = { fontSize: "18px", margin: "0 0 4px 0", color: "#111" };
  const cardSubtitleStyle = { fontSize: "12px", color: "#555", marginBottom: "12px" };
  const cardRowStyle = { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#555", marginBottom: "6px" };

  const detailsButtonStyle = {
    flex: 1,
    padding: "8px 0",
    borderRadius: "6px",
    fontSize: "12px",
    border: "1px solid #E74C3C",
    color: "#E74C3C",
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  const detailsButtonHoverStyle = {
    backgroundColor: "#E74C3C",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Classes</h1>
        <p style={subtitleStyle}>Manage your assigned classes and student rosters.</p>
      </div>

      {/* Classes Grid */}
      <div style={gridStyle}>
        {classes.map(classItem => (
          <div
            key={classItem.id}
            style={cardStyle}
            onClick={() => onViewClassDetails?.(classItem)}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.cursor = "pointer";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {/* Color Header */}
            <div style={cardHeaderStyle(classItem.color)}></div>

            {/* Card Content */}
            <div style={cardContentStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={cardTitleStyle}>{classItem.name}</h3>
                  <p style={cardSubtitleStyle}>{classItem.grade}</p>
                </div>
                <MoreVertical style={{ width: "16px", height: "16px", color: "#888", cursor: "pointer" }} />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={cardRowStyle}>
                  <Users style={{ width: "14px", height: "14px", color: "#555" }} />
                  <span>{classItem.students} students</span>
                </div>
                <div style={cardRowStyle}>
                  <Clock style={{ width: "14px", height: "14px", color: "#555" }} />
                  <span>{classItem.schedule}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClassesPage;



// ================================================================================
// FILE: src\pages\teacher\LessonEditorPage.jsx
// ================================================================================

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Save, Lock, Unlock, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import lessonService from '@/services/lessonService';

const LessonEditorPage = ({ lesson, classId, onBack }) => {
  const [lessonData, setLessonData] = useState(lesson);
  const [contentBlocks, setContentBlocks] = useState(lesson?.contentBlocks || []);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [showAddBlockMenu, setShowAddBlockMenu] = useState(false);
  const [blockTypeToAdd, setBlockTypeToAdd] = useState(null);

  // Refs & menu positioning for add-block menu (responsive UX)
  const addButtonRef = useRef(null);
  const addMenuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, position: 'bottom' });

  // Toggle add menu with computed position
  const toggleAddMenu = (open) => {
    if (!open) {
      setShowAddBlockMenu(false);
      return;
    }

    if (!addButtonRef.current) {
      setShowAddBlockMenu(true);
      return;
    }

    const rect = addButtonRef.current.getBoundingClientRect();
    const menuWidth = 220; // ideal width
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const position = spaceBelow < 260 ? 'top' : 'bottom';
    const top = position === 'bottom' ? rect.bottom + 8 : Math.max(8, rect.top - 8 - 260);

    setMenuStyle({ top, left, position });
    setShowAddBlockMenu(true);
  };

  // Close menu on outside click or ESC
  useEffect(() => {
    if (!showAddBlockMenu) return;

    const onClickOut = (e) => {
      if (
        addMenuRef.current && !addMenuRef.current.contains(e.target) &&
        addButtonRef.current && !addButtonRef.current.contains(e.target)
      ) {
        setShowAddBlockMenu(false);
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setShowAddBlockMenu(false);
    };

    window.addEventListener('mousedown', onClickOut);
    window.addEventListener('touchstart', onClickOut);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('mousedown', onClickOut);
      window.removeEventListener('touchstart', onClickOut);
      window.removeEventListener('keydown', onKey);
    };
  }, [showAddBlockMenu]);

  const blockTypes = [
    { id: 'text', label: 'Text Block', icon: '📝' },
    { id: 'image', label: 'Image', icon: '🖼️' },
    { id: 'video', label: 'Video', icon: '🎥' },
    { id: 'question', label: 'Question', icon: '❓' },
    { id: 'file', label: 'File', icon: '📄' },
    { id: 'divider', label: 'Divider', icon: '─' },
  ];

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#111827',
  };

  const titleContainerStyle = {
    flex: 1,
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const blockItemStyle = (isEditing) => ({
    padding: '16px',
    border: isEditing ? '2px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: isEditing ? '#eff6ff' : '#ffffff',
    marginBottom: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  });

  const handleSaveLesson = async () => {
    if (!lessonData.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }

    setSaving(true);
    try {
      await lessonService.updateLesson(lesson.id, {
        title: lessonData.title,
        description: lessonData.description,
      });
      toast.success('Lesson updated successfully');
    } catch (err) {
      console.error('Failed to save lesson', err);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishLesson = async () => {
    setSaving(true);
    try {
      await lessonService.publishLesson(lesson.id);
      setLessonData(prev => ({ ...prev, isDraft: false }));
      toast.success('Lesson published successfully');
    } catch (err) {
      console.error('Failed to publish lesson', err);
      toast.error('Failed to publish lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockType) => {
    
    try {
      const newBlock = await lessonService.addContentBlock({
        lessonId: lesson.id,
        type: blockType,
        order: contentBlocks.length,
        content: blockType === 'text' ? '' : {},
        metadata: {},
      });
      setContentBlocks([...contentBlocks, newBlock.data || newBlock]);
      toast.success(`${blockType} block added`);
      setShowAddBlockMenu(false);
      setBlockTypeToAdd(null);
    } catch (err) {
      console.error('Failed to add block', err);
      toast.error('Failed to add content block');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Delete this content block?')) return;

    try {
      await lessonService.deleteContentBlock(blockId);
      setContentBlocks(contentBlocks.filter(b => b.id !== blockId));
      toast.success('Block deleted');
    } catch (err) {
      console.error('Failed to delete block', err);
      toast.error('Failed to delete block');
    }
  };

  const handleUpdateBlock = async (blockId, updatedContent) => {
    try {
      await lessonService.updateContentBlock(blockId, {
        content: updatedContent,
      });
      setContentBlocks(contentBlocks.map(b =>
        b.id === blockId ? { ...b, content: updatedContent } : b
      ));
      toast.success('Block updated');
      setEditingBlockId(null);
    } catch (err) {
      console.error('Failed to update block', err);
      toast.error('Failed to update block');
    }
  };

  const renderBlockContent = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div>
            {editingBlockId === block.id ? (
              <textarea
                defaultValue={block.content || ''}
                rows={6}
                style={{
                  ...inputStyle,
                  fontFamily: 'Arial, sans-serif',
                }}
                onBlur={(e) => handleUpdateBlock(block.id, e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden' }}>
                {block.content || '(empty)'}
              </p>
            )}
          </div>
        );
      case 'image':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="Image URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `Image: ${block.content.url}` : '(no image URL)'}
              </p>
            )}
          </div>
        );
      case 'video':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="YouTube video URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `Video: ${block.content.url}` : '(no video URL)'}
              </p>
            )}
          </div>
        );
      case 'question':
        return (
          <div>
            {editingBlockId === block.id ? (
              <textarea
                defaultValue={block.content?.text || ''}
                placeholder="Question text"
                rows={3}
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden' }}>
                {block.content?.text || '(empty)'}
              </p>
            )}
          </div>
        );
      case 'file':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="File URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `File: ${block.content.url}` : '(no file URL)'}
              </p>
            )}
          </div>
        );
      case 'divider':
        return <hr style={{ margin: '8px 0', borderColor: '#e5e7eb' }} />;
      default:
        return <p style={{ margin: 0, color: '#9ca3af' }}>Unknown block type</p>;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            Edit Lesson
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {lessonData?.title || 'Untitled Lesson'}
          </p>
        </div>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: lessonData?.isDraft ? '#dc2626' : '#16a34a',
          }}
          disabled={saving}
          onClick={lessonData?.isDraft ? handlePublishLesson : undefined}
        >
          {lessonData?.isDraft ? 'Publish' : 'Published'}
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Lesson Info Section */}
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Lesson Details
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lesson Title *</label>
            <input
              type="text"
              value={lessonData?.title || ''}
              onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={lessonData?.description || ''}
              onChange={(e) => setLessonData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={inputStyle}
            />
          </div>

          <button
            style={buttonStyle}
            disabled={saving}
            onClick={handleSaveLesson}
            onMouseEnter={(e) => {
              if (!saving) e.target.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.target.style.backgroundColor = '#dc2626';
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Content Blocks Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Content Blocks ({contentBlocks.length})
            </h2>
            <button
              ref={addButtonRef}
              aria-haspopup="true"
              aria-expanded={showAddBlockMenu}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                position: 'relative',
              }}
              onClick={() => toggleAddMenu(!showAddBlockMenu)}
              onMouseEnter={(e) => {
                if (!showAddBlockMenu) e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!showAddBlockMenu) e.target.style.backgroundColor = '#3b82f6';
              }}
            >
              <Plus size={16} />
              Add Block
            </button>

            {/* Block Type Menu */}
            <AnimatePresence>
              {showAddBlockMenu && (
                <motion.div
                  ref={addMenuRef}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.16 } }}
                  exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                  style={{
                    position: 'fixed',
                    top: menuStyle.top,
                    left: menuStyle.left,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 2000,
                    minWidth: '200px',
                    maxWidth: '320px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    padding: '6px 0',
                  }}
                >
                  {blockTypes.map(type => (
                    <button
                      key={type.id}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        fontSize: '14px',
                        color: '#111827',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => { setShowAddBlockMenu(false); handleAddBlock(type.id); }}
                    >
                      <span style={{ marginRight: '8px' }}>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {contentBlocks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              color: '#9ca3af',
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                No content blocks yet
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Click "Add Block" above to start creating lesson content
              </p>
            </div>
          ) : (
            <div>
              {contentBlocks.map((block, idx) => (
                <div key={block.id} style={blockItemStyle(editingBlockId === block.id)}>
                  <div style={{ color: '#9ca3af', paddingTop: '4px' }}>
                    <GripVertical size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        backgroundColor: '#f3f4f6',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        Block {idx + 1}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#111827',
                        textTransform: 'uppercase',
                      }}>
                        {block.type}
                      </span>
                    </div>

                    {renderBlockContent(block)}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                    <button
                      style={{
                        padding: '8px 10px',
                        backgroundColor: editingBlockId === block.id ? '#3b82f6' : '#f3f4f6',
                        color: editingBlockId === block.id ? '#ffffff' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = editingBlockId === block.id ? '#2563eb' : '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = editingBlockId === block.id ? '#3b82f6' : '#f3f4f6';
                      }}
                      onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#fee2e2';
                      }}
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonEditorPage;



// ================================================================================
// FILE: src\pages\teacher\TeacherSectionsPage.jsx
// ================================================================================

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const TeacherSectionsPage = ({ onViewRoster }) => {
  const { user, loading: authLoading } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMySections = async () => {
    setLoading(true);
    try {
      
      const res = await api.get('/sections/my');
      if (res?.data?.success) setSections(res.data.data);
    } catch (err) {
      console.error('Failed to load my sections', err);
      // Show a clearer message when unauthenticated
      if (err.response?.status === 401) {
        toast.error('Please log in to view your sections');
      } else {
        toast.error('Failed to load your sections');
      }
    } finally {
      setLoading(false);
    }
  };

  // Wait for auth to be ready and user to exist
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }

    fetchMySections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">My Sections</h1>
        <p className="text-sm text-muted-foreground mb-6">Sections you are assigned to. You can manage students of your section.</p>

        <div className="bg-white rounded-lg border p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">You are not assigned to any section.</div>
          ) : (
            <ul className="space-y-4">
              {sections.map(s => (
                <li key={s.id} className="flex items-center justify-between border rounded-md p-4">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.gradeLevel} • {s.schoolYear}</div>
                  </div>
                  <div>
                    <button className="px-3 py-2 rounded-md bg-slate-900 text-white" onClick={() => onViewRoster({ _id: s.id, sectionName: s.name, gradeLevel: s.gradeLevel, schoolYear: s.schoolYear })}>
                      View Roster <ArrowRight className="inline-block ml-2" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSectionsPage;



// ================================================================================
// FILE: src\services\adminService.js
// ================================================================================


import api from './api';

const adminService = {
  // User Management
  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  async createUser(userData) {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  async updateUserStatus(id, status) {
    const response = await api.patch(`/admin/users/${id}/status`, { status });
    return response.data;
  },
  async deleteUser(id) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Subject Management
  async getSubjects(params = {}) {
    const response = await api.get('/admin/subjects', { params });
    return response.data;
  },
  async createSubject(subjectData) {
    const response = await api.post('/admin/subjects', subjectData);
    return response.data;
  },
  async updateSubject(id, subjectData) {
    const response = await api.patch(`/admin/subjects/${id}`, subjectData);
    return response.data;
  },
  async deleteSubject(id) {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
  },

  // Section Management
  async getSections(params = {}) {
    const response = await api.get('/admin/sections', { params });
    return response.data;
  },
  async createSection(sectionData) {
    const response = await api.post('/admin/sections', sectionData);
    return response.data;
  },
  async updateSection(id, sectionData) {
    const response = await api.patch(`/admin/sections/${id}`, sectionData);
    return response.data;
  },
  async deleteSection(id) {
    const response = await api.delete(`/admin/sections/${id}`);
    return response.data;
  },

  // Section roster
  async getSectionRoster(id) {
    const response = await api.get(`/sections/${id}/roster`);
    return response.data;
  },
  async getSectionCandidates(id, params = {}) {
    const response = await api.get(`/sections/${id}/candidates`, { params });
    return response.data;
  },
  async addStudentsToSection(id, studentIds = []) {
    const response = await api.post(`/sections/${id}/roster`, { studentIds });
    return response.data;
  },
  async removeStudentFromSection(id, studentId) {
    const response = await api.delete(`/sections/${id}/roster/${studentId}`);
    return response.data;
  },

  // Class Management
  async getClasses(params = {}) {
    const response = await api.get('/classes/all', { params });
    return response.data;
  },
  async createClass(classData) {
    const response = await api.post('/classes', classData);
    return response.data;
  },
  async updateClass(id, classData) {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },
  async deleteClass(id) {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },
  async toggleClassStatus(id) {
    const response = await api.put(`/classes/${id}/toggle-status`, {});
    return response.data;
  },

  // Class Enrollment Management
  async getClassEnrollments(classId) {
    const response = await api.get(`/classes/${classId}/enrollments`);
    return response.data;
  },
  async getClassCandidates(classId) {
    const response = await api.get(`/classes/${classId}/candidates`);
    return response.data;
  },
  async enrollStudentInClass(classId, studentId) {
    const response = await api.post(`/classes/${classId}/enrollments`, { studentId });
    return response.data;
  },
  async removeStudentFromClass(classId, studentId) {
    const response = await api.delete(`/classes/${classId}/enrollments/${studentId}`);
    return response.data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  }
};

export default adminService;



// ================================================================================
// FILE: src\services\api.js
// ================================================================================

// API client: axios instance with token refresh

import axios from 'axios';

// Configuration

// API base URL (uses VITE_API_URL or defaults to localhost)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default settings
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,  // CRITICAL: Sends httpOnly cookie with requests
    timeout: 30000,         // 30 second timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

// Token storage: access token kept in memory (prevents XSS, restored via refresh on load)
let accessToken = null;

// Set access token (stored in memory)
export const setAccessToken = (token) => {
    accessToken = token;
    console.log('[AUTH] Access token set in memory');
};

// Get current access token
export const getAccessToken = () => {
    return accessToken;
};

// Clear access token
export const clearAccessToken = () => {
    accessToken = null;
    console.log('[AUTH] Access token cleared from memory');
};

// Request interceptor: attach Authorization header and queue requests during refresh
api.interceptors.request.use(
    (config) => {
        // If a token refresh is in progress, queue outgoing requests so they get
        // the new token when available. This prevents race conditions where
        // requests are sent without an Authorization header.
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (token) => {
                        if (token) {
                            config.headers.Authorization = `Bearer ${token}`;
                        }
                        resolve(config);
                    },
                    reject,
                });
            });
        }

        // Add access token to request if available
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Log request for debugging (remove in production)
        if (import.meta.env.DEV) {
            console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        // Request setup failed
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor: refresh token on 401 and retry requests

// Flag to prevent multiple refresh attempts
let isRefreshing = false;

// Queue of failed requests waiting for token refresh
let failedQueue = [];

// Process queued requests after token refresh
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        // Successful response (2xx status)
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Don't handle 401 for auth endpoints (login, register, refresh, etc)
        // These should return their original error messages
        const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/otp/verify', '/otp/resend'];
        const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));

        // Handle token expiration (401 Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {

            // Prevent retry loop
            if (isRefreshing) {
                // Token refresh already in progress
                // Queue this request to retry after refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            // Mark request as retried to prevent infinite loop
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                console.log('[AUTH] Access token expired, refreshing...');

                // Call refresh endpoint
                // Backend uses refresh token from httpOnly cookie
                const refreshResponse = await axios.post(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Extract new access token
                const newAccessToken = refreshResponse.data.data.accessToken;

                // Save new token
                setAccessToken(newAccessToken);

                console.log('[AUTH] Token refreshed successfully');

                // Process queued requests
                processQueue(null, newAccessToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                console.error('[AUTH] Token refresh failed:', refreshError);

                // Refresh failed - user must login again
                processQueue(refreshError, null);
                clearAccessToken();

                return Promise.reject(refreshError);

            } finally {
                isRefreshing = false;
            }
        }

        // Other errors (not 401) - return them as-is
        // Log error for debugging
        if (import.meta.env.DEV) {
            console.error('[API] Response error:', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.response?.data?.message,
                data: error.response?.data
            });
        }

        return Promise.reject(error);
    }
);

// Export api instance

export default api;




// ================================================================================
// FILE: src\services\assessmentService.js
// ================================================================================

import api from './api';

const assessmentService = {
  // Assessment Management
  async getAssessmentsByClass(classId) {
    try {
      const response = await api.get(`/assessments/class/${classId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }
  },

  async getAssessmentById(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment:', error);
      throw error;
    }
  },

  async createAssessment(assessmentData) {
    try {
      const response = await api.post('/assessments', assessmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  },

  async updateAssessment(assessmentId, assessmentData) {
    try {
      const response = await api.put(`/assessments/${assessmentId}`, assessmentData);
      return response.data;
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  },

  async deleteAssessment(assessmentId) {
    try {
      const response = await api.delete(`/assessments/${assessmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  },

  // Question Management
  async createQuestion(questionData) {
    try {
      const response = await api.post('/assessments/questions', questionData);
      return response.data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },

  async updateQuestion(questionId, questionData) {
    try {
      const response = await api.put(`/assessments/questions/${questionId}`, questionData);
      return response.data;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  async deleteQuestion(questionId) {
    try {
      const response = await api.delete(`/assessments/questions/${questionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  // Attempt Management
  async startAttempt(assessmentId) {
    try {
      const response = await api.post(`/assessments/${assessmentId}/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting attempt:', error);
      throw error;
    }
  },

  async submitAssessment(submissionData) {
    try {
      const response = await api.post('/assessments/submit', submissionData);
      return response.data;
    } catch (error) {
      console.error('Error submitting assessment:', error);
      throw error;
    }
  },

  async getStudentAttempts(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/student-attempts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student attempts:', error);
      throw error;
    }
  },

  async getAssessmentAttempts(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/all-attempts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment attempts:', error);
      throw error;
    }
  },

  async getAttemptResults(attemptId) {
    try {
      const response = await api.get(`/assessments/attempts/${attemptId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attempt results:', error);
      throw error;
    }
  },

  async getAssessmentStats(assessmentId) {
    try {
      const response = await api.get(`/assessments/${assessmentId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
      throw error;
    }
  },
};

export default assessmentService;



// ================================================================================
// FILE: src\services\authService.js
// ================================================================================

// Auth service: backend-compatible authentication API

import api, { setAccessToken, clearAccessToken } from './api';

// Register a new user (POST /auth/register)
export const register = async ({ email, password, confirmPassword, role = 'student' }) => {
    try {
        // Make API call to registration endpoint
        const response = await api.post('/auth/register', {
            email,           // User's email address
            password,        // User's password (will be hashed by backend)
            confirmPassword, // Password confirmation
            role            // User role (student/teacher)
        });

        // Return the full response data
        // This includes the user object and success message
        return response.data;

    } catch (error) {
        // Handle different error types from backend

        if (error.response) {
            // Backend returned an error response
            const { data, status } = error.response;

            // Throw structured error with backend message
            throw {
                message: data.message || 'Registration failed',
                code: data.code,
                status: status,
                errors: data.errors // Validation errors if any
            };
        }

        // Network or other error
        throw {
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Verify email with OTP (POST /otp/verify)
export const verifyEmail = async (email, code) => {
    try {
        const response = await api.post('/otp/verify', {
            email,  // User's email address
            code    // 6-digit verification code
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;

            // Handle specific verification errors
            throw {
                message: data.message || 'Verification failed',
                code: data.code,
                // These codes help UI show specific messages:
                // OTP_INVALID - Wrong code entered
                // OTP_EXPIRED - Code is older than 10 minutes
                // OTP_MAX_ATTEMPTS - User tried 5+ times
                // OTP_NOT_FOUND - No pending verification for this user
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Resend OTP (POST /otp/resend)
export const resendOTP = async (email) => {
    try {
        const response = await api.post('/otp/resend', { email });
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to resend code',
                code: data.code
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Login user (POST /auth/login)
export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', {
            email,      // User's email
            password    // User's password (backend will verify hash)
        });

        // Extract access token and user data from response
        const { accessToken, user } = response.data.data;

        // Save access token to memory (NOT localStorage for security)
        // This token will be added to all future API requests automatically
        setAccessToken(accessToken);

        // Return user data for context/state management
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data, status } = error.response;

            // Handle specific login errors
            throw {
                message: data.message || 'Login failed',
                code: data.code,
                status: status,
                // Common error codes:
                // EMAIL_NOT_VERIFIED - User hasn't verified email yet
                // INVALID_CREDENTIALS - Wrong email or password
                // ACCOUNT_INACTIVE - Account suspended/deleted
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Validate credentials without enforcing email verification
export const validateCredentials = async (email, password) => {
    try {
        const response = await api.post('/auth/validate-credentials', { email, password });
        return response.data;
    } catch (error) {
        if (error.response) {
            const { data, status } = error.response;
            throw {
                message: data.message || 'Invalid credentials',
                code: data.code,
                status,
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Logout and clear session (POST /auth/logout)
export const logout = async () => {
    try {
        // Call backend logout endpoint
        await api.post('/auth/logout');

        // Clear access token from memory
        clearAccessToken();

        return { success: true };

    } catch (error) {
        // Even if backend call fails, clear local token
        clearAccessToken();

        // Don't throw error on logout - always succeed locally
        return { success: true };
    }
};

// Get current authenticated user (GET /auth/me)
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;

    } catch (error) {
        // If this fails, user is not authenticated
        clearAccessToken();

        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Authentication failed',
                code: data.code
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Forgot password (POST /auth/forgot-password)
export const forgotPassword = async (email) => {
    try {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;

    } catch (error) {
        if (error.response) {
            const { data, status } = error.response;
            throw {
                message: data.message || 'Failed to send reset code',
                code: status === 404 ? 'EMAIL_NOT_FOUND' : data.code,
                status: status
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Reset password with OTP (POST /auth/reset-password)
export const resetPassword = async (email, code, newPassword) => {
    try {
        const response = await api.post('/auth/reset-password', {
            email,        // User's email
            code,         // 6-digit OTP code
            newPassword   // New password (backend will hash it)
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to reset password',
                code: data.code,
                errors: data.errors // Validation errors if password is weak
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Change password for authenticated user (POST /auth/change-password)
export const changePassword = async (oldPassword, newPassword) => {
    try {
        const response = await api.post('/auth/change-password', {
            oldPassword,   // Current password for verification
            newPassword    // New password (backend will hash it)
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to change password',
                code: data.code,
                errors: data.errors // Validation errors if password is weak
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Set initial password with OTP verification (POST /auth/set-initial-password)
// Used after email verification during account creation
export const setInitialPassword = async (email, code, newPassword) => {
    try {
        const response = await api.post('/auth/set-initial-password', {
            email,        // User's email address
            code,         // OTP code from email verification
            newPassword   // Initial password to set (backend will hash it)
        });

        return response.data;

    } catch (error) {
        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Failed to set password',
                code: data.code,
                errors: data.errors // Validation errors if password is weak
            };
        }

        throw {
            message: 'Network error. Please try again.',
            code: 'NETWORK_ERROR'
        };
    }
};

// Refresh access token (POST /auth/refresh)
export const refreshToken = async () => {
    try {
        const response = await api.post('/auth/refresh');

        const { accessToken } = response.data.data;

        // Save new access token
        setAccessToken(accessToken);

        return response.data;

    } catch (error) {
        // Refresh token expired or invalid - user must login again
        clearAccessToken();

        if (error.response) {
            const { data } = error.response;
            throw {
                message: data.message || 'Session expired',
                code: data.code
            };
        }

        throw {
            message: 'Session expired. Please login again.',
            code: 'SESSION_EXPIRED'
        };
    }
};

// Helpers

// Check if user is authenticated (token exists in memory)
export const isAuthenticated = () => {
    const { getAccessToken } = require('./api');
    return getAccessToken() !== null;
};

/**
 * Update user profile
 *
 * BACKEND ENDPOINT: PATCH /api/auth/profile
 */
export const updateProfile = async (profileData) => {
    try {
        const isForm = profileData instanceof FormData;
        const response = await api.patch('/auth/profile', profileData, isForm ? {
            headers: { 'Content-Type': 'multipart/form-data' }
        } : undefined);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw error.response.data;
        }
        throw error;
    }
};

// Export functions

export default {
    // Registration & Verification
    register,
    verifyEmail,
    resendOTP,

    // Authentication
    login,
    logout,
    getCurrentUser,
    updateProfile,

    // Password Management
    forgotPassword,
    resetPassword,
    changePassword,
    setInitialPassword,

    // Token Management
    refreshToken,
    isAuthenticated
};


// ================================================================================
// FILE: src\services\lessonService.js
// ================================================================================

import api from './api';

const lessonService = {
  // Lessons
  async getLessonsByClass(classId) {
    const response = await api.get(`/lessons/class/${classId}`);
    return response.data;
  },

  async getLessonById(lessonId) {
    const response = await api.get(`/lessons/${lessonId}`);
    return response.data;
  },

  async createLesson(lessonData) {
    const response = await api.post('/lessons', lessonData);
    return response.data;
  },

  async updateLesson(lessonId, lessonData) {
    const response = await api.put(`/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  async publishLesson(lessonId) {
    const response = await api.put(`/lessons/${lessonId}/publish`, {});
    return response.data;
  },

  async deleteLesson(lessonId) {
    const response = await api.delete(`/lessons/${lessonId}`);
    return response.data;
  },

  // Content Blocks
  async addContentBlock(blockData) {
    
    const { lessonId, ...bodyData } = blockData;
    console.log(lessonId)
    const response = await api.post(
      `/lessons/${lessonId}/blocks`,
      bodyData,
    );
    return response.data;
  },

  async updateContentBlock(blockId, blockData) {
    const response = await api.put(`/lessons/blocks/${blockId}`, blockData);
    return response.data;
  },

  async deleteContentBlock(blockId) {
    const response = await api.delete(`/lessons/blocks/${blockId}`);
    return response.data;
  },

  async reorderBlocks(lessonId, blocks) {
    const response = await api.put(`/lessons/${lessonId}/reorder-blocks`, {
      blocks,
    });
    return response.data;
  },

  // Lesson Completion & Progress
  async markLessonComplete(lessonId) {
    const response = await api.post(`/lessons/${lessonId}/complete`);
    return response.data;
  },

  async checkLessonCompletion(lessonId) {
    const response = await api.get(`/lessons/${lessonId}/completion-status`);
    return response.data;
  },

  async getCompletedLessonsForClass(classId) {
    const response = await api.get(`/lessons/class/${classId}/completed`);
    return response.data;
  },
};

export default lessonService;



// ================================================================================
// FILE: src\services\profilesService.js
// ================================================================================

import api from './api';

const profilesService = {
  // Get current user's profile
  async getMyProfile() {
    const response = await api.get('/profiles/me');
    return response.data;
  },

  // Get profile by user id (admin)
  async getProfileByUserId(userId) {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  },

  // Update profile (owner or admin)
  async updateProfile(userId, dto) {
    const response = await api.put(`/profiles/update/${userId}`, dto);
    return response.data;
  },
};

export default profilesService;



// ================================================================================
// FILE: src\services\studentService.js
// ================================================================================

import api from './api';

// Student-facing API (matches backend "classes" module)
const studentService = {
  // Get classes with optional filters (maps to GET /classes/all)
  async getClasses(params = {}) {
    const response = await api.get('/classes/all', { params });
    return response.data;
  },

  // Get a specific class by ID (GET /classes/:id)
  async getClassById(id) {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  // Get classes by teacher (GET /classes/teacher/:teacherId)
  async getClassesByTeacher(teacherId) {
    const response = await api.get(`/classes/teacher/${teacherId}`);
    return response.data;
  },

  // Get classes by section (GET /classes/section/:sectionId)
  async getClassesBySection(sectionId) {
    const response = await api.get(`/classes/section/${sectionId}`);
    return response.data;
  },

  // Get classes by subject (GET /classes/subject/:subjectId)
  async getClassesBySubject(subjectId) {
    const response = await api.get(`/classes/subject/${subjectId}`);
    return response.data;
  }
};

export default studentService;



// ================================================================================
// FILE: src\services\teacherService.js
// ================================================================================

import api from './api';

const teacherService = {
  // Lessons
  async getLessons(params = {}) {
    const response = await api.get('/teacher/lessons', { params });
    return response.data;
  },
  async createLesson(lessonData) {
    const response = await api.post('/teacher/lessons', lessonData);
    return response.data;
  },
  async updateLesson(id, lessonData) {
    const response = await api.put(`/teacher/lessons/${id}`, lessonData);
    return response.data;
  },
  async deleteLesson(id) {
    const response = await api.delete(`/teacher/lessons/${id}`);
    return response.data;
  },

  // Assessments
  async getAssessments(params = {}) {
    const response = await api.get('/teacher/assessments', { params });
    return response.data;
  },
  async createAssessment(assessmentData) {
    const response = await api.post('/teacher/assessments', assessmentData);
    return response.data;
  },
  async getAssessmentById(id) {
    const response = await api.get(`/teacher/assessments/${id}`);
    return response.data;
  },
  async updateAssessment(id, assessmentData) {
    const response = await api.put(`/teacher/assessments/${id}`, assessmentData);
    return response.data;
  },
  async deleteAssessment(id) {
    const response = await api.delete(`/teacher/assessments/${id}`);
    return response.data;
  },

  // Classes
  async getClasses() {
    const response = await api.get('/teacher/classes');
    return response.data;
  }
};

export default teacherService;



// ================================================================================
// FILE: src\styles\globals.css
// ================================================================================

@custom-variant dark (&:is(.dark *));

:root {
  --font-size: 16px;
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);
  --card: #ffffff;
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: #dc2626;
  --primary-foreground: #ffffff;
  --secondary: #374151;
  --secondary-foreground: #ffffff;
  --muted: #ececf0;
  --muted-foreground: #717182;
  --accent: #e9ebef;
  --accent-foreground: #030213;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.1);
  --input: transparent;
  --input-background: #f3f3f5;
  --switch-background: #cbced4;
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --ring: #dc2626;
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: #1f2937;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #dc2626;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #374151;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: #374151;
  --sidebar-ring: #dc2626;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-input-background: var(--input-background);
  --color-switch-background: var(--switch-background);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/**
 * Base typography. This is not applied to elements which have an ancestor with a Tailwind text class.
 */
@layer base {
  :where(:not(:has([class*=' text-']), :not(:has([class^='text-'])))) {
    h1 {
      font-size: var(--text-2xl);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    h2 {
      font-size: var(--text-xl);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    h3 {
      font-size: var(--text-lg);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    h4 {
      font-size: var(--text-base);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    label {
      font-size: var(--text-base);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    button {
      font-size: var(--text-base);
      font-weight: var(--font-weight-medium);
      line-height: 1.5;
    }

    input {
      font-size: var(--text-base);
      font-weight: var(--font-weight-normal);
      line-height: 1.5;
    }
  }
}

html {
  font-size: var(--font-size);
}


// ================================================================================
// FILE: src\utils\constants.js
// ================================================================================

export const ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin',
}

export const API_ENDPOINTS = {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/otp/verify',
}

export const ROUTES = {
    LOGIN: '/login',
    SIGNUP: '/signup',
    STUDENT_DASHBOARD: '/student',
    TEACHER_DASHBOARD: '/teacher',
    ADMIN_DASHBOARD: '/admin',
}



// ================================================================================
// FILE: src\utils\helpers.js
// ================================================================================

export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
}

export const debounce = (func, wait) => {
    let timeout
    return (...args) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func.apply(this, args), wait)
    }
}



// ================================================================================
// FILE: src\utils\utils.js
// ================================================================================

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}



// ================================================================================
// FILE: src\utils\validators.js
// ================================================================================

export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
}

export const validatePassword = (password) => {
    return password.length >= 8
}

export const validateRequired = (value) => {
    return value !== null && value !== undefined && value.trim() !== ''
}



// ================================================================================
// FILE: vite.config.js
// ================================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})




// ================================================================================
// END OF EXPORT
// ================================================================================
