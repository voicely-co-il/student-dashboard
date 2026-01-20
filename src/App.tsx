import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import StudentProtectedRoute from "@/components/auth/StudentProtectedRoute";
import TeacherProtectedRoute from "@/components/auth/TeacherProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";

// Pages
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentChat from "./pages/student/StudentChat";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherChat from "./pages/TeacherChat";
import ChatPage from "./pages/ChatPage";
import LiveChat from "./pages/LiveChat";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminResources from "./pages/admin/AdminResources";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminMemoryDebug from "./pages/admin/AdminMemoryDebug";
import ShortLinkResolver from "./pages/ShortLinkResolver";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

/**
 * Smart redirect based on user role
 * - Students → /student
 * - Teachers → /teacher
 * - Admins → /admin
 * - Not logged in → /auth
 */
const RoleBasedRedirect = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-voicely-green" />
          <span className="text-muted-foreground">טוען...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  switch (role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/chat" element={<ChatPage />} />

            {/* Root redirect based on role */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* ===================== */}
            {/* STUDENT ROUTES */}
            {/* ===================== */}
            <Route
              path="/student"
              element={
                <StudentProtectedRoute>
                  <AdminLayout>
                    <StudentDashboard />
                  </AdminLayout>
                </StudentProtectedRoute>
              }
            />
            <Route
              path="/student/chat"
              element={
                <StudentProtectedRoute>
                  <AdminLayout>
                    <StudentChat />
                  </AdminLayout>
                </StudentProtectedRoute>
              }
            />

            {/* ===================== */}
            {/* TEACHER ROUTES */}
            {/* ===================== */}
            <Route
              path="/teacher"
              element={
                <TeacherProtectedRoute>
                  <AdminLayout>
                    <TeacherDashboard />
                  </AdminLayout>
                </TeacherProtectedRoute>
              }
            />
            <Route
              path="/teacher/chat"
              element={
                <TeacherProtectedRoute>
                  <AdminLayout>
                    <TeacherChat />
                  </AdminLayout>
                </TeacherProtectedRoute>
              }
            />
            <Route
              path="/teacher/students"
              element={
                <TeacherProtectedRoute>
                  <AdminLayout>
                    <div>רשימת תלמידים - בקרוב</div>
                  </AdminLayout>
                </TeacherProtectedRoute>
              }
            />
            <Route
              path="/teacher/search"
              element={
                <TeacherProtectedRoute>
                  <AdminLayout>
                    <div>חיפוש AI - בקרוב</div>
                  </AdminLayout>
                </TeacherProtectedRoute>
              }
            />

            {/* ===================== */}
            {/* ADMIN ROUTES */}
            {/* ===================== */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <Navigate to="/admin/analytics" replace />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminAnalytics />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/live-chat"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <LiveChat />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/resources"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminResources />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/marketing"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminMarketing />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/memory"
              element={
                <AdminProtectedRoute>
                  <AdminLayout>
                    <AdminMemoryDebug />
                  </AdminLayout>
                </AdminProtectedRoute>
              }
            />

            {/* Legacy redirects for old routes */}
            <Route path="/teacher-chat" element={<Navigate to="/teacher/chat" replace />} />
            <Route path="/live-chat" element={<Navigate to="/admin/live-chat" replace />} />
            <Route path="/student/live" element={<Navigate to="/admin/live-chat" replace />} />

            {/* ===================== */}
            {/* SHORT LINKS */}
            {/* ===================== */}
            <Route path="/short/:slug" element={<ShortLinkResolver />} />
            <Route path="/s/:slug" element={<ShortLinkResolver />} />
            <Route path="/l/:slug" element={<ShortLinkResolver />} />
            <Route path="/r/:slug" element={<ShortLinkResolver />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
