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