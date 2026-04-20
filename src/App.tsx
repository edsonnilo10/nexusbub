import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import PendingApproval from "./pages/PendingApproval.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AdminApprovals from "./pages/AdminApprovals.tsx";
import AdminAudit from "./pages/AdminAudit.tsx";
import CourseDetail from "./pages/CourseDetail.tsx";
import CourseEditor from "./pages/CourseEditor.tsx";
import ImportCourses from "./pages/ImportCourses.tsx";
import Settings from "./pages/Settings.tsx";
import CourseCalendar from "./pages/CourseCalendar.tsx";
import GlobalDashboard from "./pages/GlobalDashboard.tsx";
import QuickMessages from "./pages/QuickMessages.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/courses/new" element={<ProtectedRoute><CourseEditor /></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/courses/:id/edit" element={<ProtectedRoute><CourseEditor /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><ImportCourses /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CourseCalendar /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><GlobalDashboard /></ProtectedRoute>} />
            <Route path="/mensagens" element={<ProtectedRoute><QuickMessages /></ProtectedRoute>} />
            <Route path="/admin/approvals" element={<ProtectedRoute adminOnly><AdminApprovals /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute adminOnly><AdminAudit /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
