import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages — each becomes its own chunk
const Index = lazy(() => import("./pages/Index"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminApprovals = lazy(() => import("./pages/AdminApprovals"));
const AdminAudit = lazy(() => import("./pages/AdminAudit"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const ImportCourses = lazy(() => import("./pages/ImportCourses"));
const Settings = lazy(() => import("./pages/Settings"));
const CourseCalendar = lazy(() => import("./pages/CourseCalendar"));
const ClassGroups = lazy(() => import("./pages/ClassGroups"));
const GlobalDashboard = lazy(() => import("./pages/GlobalDashboard"));
const QuickMessages = lazy(() => import("./pages/QuickMessages"));
const CursosPlanilha = lazy(() => import("./pages/CursosPlanilha"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/turmas" element={<ProtectedRoute><ClassGroups /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><GlobalDashboard /></ProtectedRoute>} />
                <Route path="/mensagens" element={<ProtectedRoute><QuickMessages /></ProtectedRoute>} />
                <Route path="/cursos-planilha" element={<ProtectedRoute><CursosPlanilha /></ProtectedRoute>} />
                <Route path="/admin/approvals" element={<ProtectedRoute adminOnly><AdminApprovals /></ProtectedRoute>} />
                <Route path="/admin/audit" element={<ProtectedRoute adminOnly><AdminAudit /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
