
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
import  ProfilePage  from './pages/ProfilePage';
import  NotificationsPage  from './pages/NotificationsPage';
import MessagesPage  from './pages/MessagesPage';
import { Toaster } from './components/ui/sonner';

function App() {

    // ================================================================================
    // AUTH STATE - From Context
    // ================================================================================
    const { user, logout } = useAuth();

    // ================================================================================
    // NAVIGATION STATE - Unchanged
    // ================================================================================

    /**
     * Current page/route
     * Still using simple state-based routing
     * Could be replaced with React Router later
     */
    const [currentPage, setCurrentPage] = useState('splash');

    /**
     * Selected role for login/signup
     * Determines which form to show
     */
    const [selectedRole, setSelectedRole] = useState('student');

    /**
     * Temporary data for verification flow
     * Stores email during signup → verification process
     */
    const [tempEmail, setTempEmail] = useState('');

    // ================================================================================
    // AUTO-REDIRECT AUTHENTICATED USERS
    // ================================================================================

    /**
     * If user is logged in, auto-redirect to dashboard
     *
     * WHY:
     * - Logged-in users shouldn't see splash/login pages
     * - Better UX - go straight to their dashboard
     */
    useEffect(() => {
        if (user && (currentPage === 'splash' || currentPage === 'login' || currentPage === 'signup')) {
            setCurrentPage('dashboard');
        }
    }, [user, currentPage]);

    // ================================================================================
    // NAVIGATION HANDLERS
    // ================================================================================

    /**
     * Handle action selection from splash screen
     *
     * @param {String} role - Not used for login (null)
     * @param {String} action - Action (login/signup)
     *
     * UPDATED: Removed role selection for login
     */
    const handleRoleSelection = (role, action) => {
        setCurrentPage(action);
    };

    /**
     * Handle successful signup
     * Redirect to email verification
     *
     * @param {Object} data - Registration response data
     *
     * CHANGED:
     * - No longer creates user immediately
     * - Stores email for verification
     * - Redirects to verification page
     */
    const handleSignUp = (data) => {
        // Store email for verification page
        setTempEmail(data.email || data.data?.user?.email);

        // Redirect to verification
        setCurrentPage('emailVerification');
    };

    /**
     * Handle successful email verification
     * Redirect to login
     *
     * CHANGED:
     * - No longer manually creates user
     * - Backend already activated account
     * - Just redirect to login
     */
    const handleEmailVerification = () => {
        // Clear temp email
        setTempEmail('');

        // Redirect to login
        setCurrentPage('login');
    };

    /**
     * Handle successful password reset
     * Redirect to login
     *
     * UNCHANGED from original
     */
    const handlePasswordReset = () => {
        setCurrentPage('login');
    };

    /**
     * Handle logout
     *
     * CHANGED:
     * - Calls real logout API
     * - Clears tokens
     * - Redirects to splash
     */
    const handleLogout = async () => {
        await logout();  // Calls API + clears state
        setCurrentPage('splash');
    };

    /**
     * Handle profile click
     *
     * UNCHANGED from original
     */
    const handleProfileClick = () => {
        setCurrentPage('profile');
    };

    /**
     * Handle profile save
     *
     * CHANGED:
     * - Updates user in contexts
     * - In real app, would call backend API to persist
     * - For now, just updates local state
     *
     * TODO: Add API call to update user profile
     * await api.patch('/users/profile', profileData)
     */

    /**
     * Handle general navigation
     *
     * UNCHANGED from original
     */
    const handleNavigation = (page) => {
        setCurrentPage(page);
    };

    // ================================================================================
    // RENDER DASHBOARD CONTENT
    // ================================================================================

    /**
     * Render appropriate dashboard based on user role
     *
     * CHANGED:
     * - Uses real user.roles array from backend
     * - Checks roles[0] instead of role string
     */
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

    // ================================================================================
    // MAIN RENDER - Page Routing
    // ================================================================================

    /**
     * Render current page based on state
     *
     * CHANGES:
     * - Removed onLogin/onSignUp props (handled by contexts)
     * - Added handleSignUp callback
     * - Updated user role checking
     */
    const renderPage = () => {
        switch (currentPage) {

            // ============================
            // PUBLIC PAGES (No Auth Required)
            // ============================

            case 'splash':
                return <SplashScreen onSelectRole={handleRoleSelection} />;

            case 'login':
                return (
                    <LoginPage
                        role={selectedRole}
                        onBack={() => setCurrentPage('splash')}
                        onForgotPassword={() => setCurrentPage('forgotPassword')}
                        onSignUp={() => setCurrentPage('signup')}
                        // onLogin removed - handled by LoginPage via useAuth()
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
                        onBack={() => setCurrentPage('signup')}
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

            // ============================
            // PROTECTED PAGES (Auth Required)
            // ============================

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

    // ================================================================================
    // RENDER APP
    // ================================================================================

    return (
        <>
            {renderPage()}
            <Toaster position="top-right" richColors />
        </>
    );
}

export default App;