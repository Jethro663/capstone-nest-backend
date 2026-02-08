
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from './components/SplashScreen';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { EmailVerificationPage } from './pages/auth/EmailVerificationPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import  DashboardLayout  from './layouts/DashboardLayout';
import  StudentDashboard  from './pages/dashboard/StudentDashboard';
import CoursesPage from './pages/student/CoursesPage';
import  TeacherDashboard  from './pages/dashboard/TeacherDashboard';
import ClassesPage from './pages/teacher/ClassesPage';
import  AdminDashboard  from './pages/dashboard/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import SubjectManagementPage from './pages/admin/SubjectManagementPage';
import SectionManagementPage from './pages/admin/SectionManagementPage';
import ClassManagementPage from './pages/admin/ClassManagementPage';
import ProfilePage from './pages/student/ProfilePage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import  NotificationsPage  from './pages/NotificationsPage';
import MessagesPage  from './pages/MessagesPage';
import profilesService from './services/profilesService';
import { Toaster } from './components/ui/sonner';

function App() {

    // Auth state from context
    const { user, logout, loading: authLoading } = useAuth();

    // Navigation state

    // Current page (simple state-based routing)
    const [currentPage, setCurrentPage] = useState('splash');

    // Selected role for forms
    const [selectedRole, setSelectedRole] = useState('student');

    // Temporary email used during signup/verification
    const [tempEmail, setTempEmail] = useState('');

    // Track when auth is ready (loading complete, user data available)
    const [authReady, setAuthReady] = useState(false);

    // Effect 1: Wait for auth to finish loading, THEN allow profile check
    useEffect(() => {
        if (!authLoading) {
            setAuthReady(true);
        }
    }, [authLoading]);

    // Redirect logged-in users to dashboard or complete profile
    // Only runs once auth is complete and user is loaded
    const checkProfileCompletion = async () => {
        if (!user) {
            console.log('checkProfileCompletion: no user available');
            return false;
        }
        if(user.roles?.includes('admin') || user.roles?.includes('teacher')) {
            return false;
        }

        try {
        
            const res = await profilesService.getProfileByUserId(user.id);
      
            const profile = res?.data || res || null;
       

            // Check basic user fields (firstName, lastName)
            const requiredUserFields = ['firstName', 'lastName'];
            const missingUserChecks = {};
            requiredUserFields.forEach((f) => {
                const val = user[f];
                const present = val !== undefined && val !== null && !(typeof val === 'string' && !val.toString().trim());
                missingUserChecks[f] = !present;
               
            });
            const missingUser = requiredUserFields.some((f) => missingUserChecks[f]);

            // Check profile fields
            const profileFields = ['dateOfBirth', 'gender', 'phone', 'address', 'familyName', 'familyRelationship', 'familyContact'];
            const missingProfileChecks = {};

            profileFields.forEach((f) => {
                let v;
                if (f === 'dateOfBirth') {
                    v = profile?.dateOfBirth ?? profile?.dob ?? user.dateOfBirth ?? user.dob;
                } else {
                    v = profile?.[f] ?? user[f];
                }

                const present = v !== undefined && v !== null && !(typeof v === 'string' && !v.toString().trim());
                missingProfileChecks[f] = !present;
               
            });

            const missingProfile = profileFields.some((f) => missingProfileChecks[f]);

    
            return missingUser || missingProfile;
        } catch (err) {
            console.log('Profile check failed:', err);
            return true;
        }
    };

    // Effect 2: Check profile completion only AFTER auth is ready
    useEffect(() => {
        if (!authReady || !user) return;

        let mounted = true;

        (async () => {
            const needs = await checkProfileCompletion();
            if (!mounted) return;

            if (needs) {
                console.log('User needs to complete profile');
                setCurrentPage('completeProfile');
                return;
            }

            if (currentPage === 'splash' || currentPage === 'login' || currentPage === 'signup') {
                setCurrentPage('dashboard');
            }
        })();

        return () => {
            mounted = false;
        };
    }, [authReady, user, currentPage]);

    // Navigation handlers

    // Handle splash actions (login/signup)
    const handleRoleSelection = (role, action) => {
        setCurrentPage(action);
    };

    // Store signup email and go to verification
    const handleSignUp = (data) => {
        setTempEmail(data.email || data.data?.user?.email);
        setCurrentPage('emailVerification');
    }; 

    // Clear temp email and go to login
    const handleEmailVerification = () => {
        setTempEmail('');
        setCurrentPage('login');
    }; 

    // Redirect to login after password reset
    const handlePasswordReset = () => {
        setCurrentPage('login');
    }; 

    // Logout via context and go to splash
    const handleLogout = async () => {
        await logout();
        setCurrentPage('splash');
    }; 

    // Show profile
    const handleProfileClick = () => {
        setCurrentPage('profile');
    }; 

    // Profile save: updates context (TODO: persist to backend)

    // General navigation
    const handleNavigation = (page) => {
        setCurrentPage(page);
    }; 

    // Render dashboard/other pages based on user role
    const renderDashboardContent = () => {
        if (!user) return null;

        // Get user's primary role
        // Backend returns roles as array: ["student"] or ["teacher"]
        const primaryRole = user.roles?.[0];

        if (currentPage === 'dashboard') {

            switch (primaryRole) {
                case 'student':
                    return <StudentDashboard />;
                case 'teacher':
                    return <TeacherDashboard />;
                case 'admin':
                    return <AdminDashboard />;
                default:
                    return <StudentDashboard />;
            }
        }

        if (currentPage === 'classes') {
            if (primaryRole === 'admin') return <ClassManagementPage />;
            return <ClassesPage />;
        }

        if (currentPage === 'courses') {
            return <CoursesPage />;
        }

        if (currentPage === 'notifications') {
            return <NotificationsPage />;
        }

        if (currentPage === 'messages') {
            return <MessagesPage />;
        }

        if (currentPage === 'users') {
            return <UserManagementPage />;
        }

        if (currentPage === 'subjects') {
            return <SubjectManagementPage />;
        }

        if (currentPage === 'sections') {
            return <SectionManagementPage />;
        }

        // Placeholder for other pages (courses, settings, etc.)
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
    };

    // Page routing

    // Render current page
    const renderPage = () => {
        switch (currentPage) {

            // Public pages

            case 'splash':
                return <SplashScreen onSelectRole={handleRoleSelection} />;

            case 'login':
                return (
                    <LoginPage
                        role={selectedRole}
                        onBack={() => setCurrentPage('splash')}
                        onForgotPassword={() => setCurrentPage('forgotPassword')}
                        onSignUp={() => setCurrentPage('signup')}
                        onUnverified={(email) => {
                            // Store email for verification page and navigate
                            setTempEmail(email);
                            setCurrentPage('emailVerification');
                        }}
                        // onLogin handled by context
                    />
                );

            case 'signup':
                return (
                    <SignUpPage
                        role={selectedRole}
                        onBack={() => setCurrentPage('splash')}
                        onLogin={() => setCurrentPage('login')}
                        // Add callback to handle signup success
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

            // Protected pages

            case 'profile':
                // Check if user is logged in
                if (!user) {
                    setCurrentPage('splash');
                    return null;
                }

                return (
                    <DashboardLayout
                        role={user.roles?.[0] || 'student'}  // Get role from user object
                        userName={`${user.firstName || ''} ${user.lastName || user.email}`}
                        currentPage="profile"
                        onNavigate={handleNavigation}
                        onProfile={handleProfileClick}
                        onNotifications={() => setCurrentPage('notifications')}
                        onMessages={() => setCurrentPage('messages')}
                    >
                        <ProfilePage />
                    </DashboardLayout>
                );

            case 'completeProfile':
                if (!user) {
                    setCurrentPage('splash');
                    return null;
                }

                return (
                    <DashboardLayout
                        role={user.roles?.[0] || 'student'}
                        userName={`${user.firstName || ''} ${user.lastName || user.email}`}
                        currentPage="complete-profile"
                        onNavigate={handleNavigation}
                        onProfile={handleProfileClick}
                        onNotifications={() => setCurrentPage('notifications')}
                        onMessages={() => setCurrentPage('messages')}
                    >
                        <CompleteProfilePage onComplete={() => setCurrentPage('dashboard')} />
                    </DashboardLayout>
                );

            case 'notifications':
            case 'messages':
            case 'dashboard':
            default:
                // Check if user is logged in
                if (!user) {
                    setCurrentPage('splash');
                    return null;
                }

                return (
                    <DashboardLayout
                        role={user.roles?.[0] || 'student'}
                        userName={`${user.firstName || ''} ${user.lastName || user.email}`}
                        currentPage={currentPage}
                        onNavigate={handleNavigation}
                        onProfile={handleProfileClick}
                        onNotifications={() => setCurrentPage('notifications')}
                        onMessages={() => setCurrentPage('messages')}
                    >
                        {renderDashboardContent()}
                    </DashboardLayout>
                );
        }
    };

    // App render

    return (
        <>
            {renderPage()}
            <Toaster position="top-right" richColors />
        </>
    );
}

export default App;