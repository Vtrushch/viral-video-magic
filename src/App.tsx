import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClipsLibrary from "./pages/ClipsLibrary";
import VideoDetail from "./pages/VideoDetail";
import VideoConfig from "./pages/VideoConfig";

const VideoReviewRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/dashboard/videos/${id}`} replace />;
};

import Settings from "./pages/Settings";
import ClipEdit from "./pages/ClipEdit";
import Admin from "./pages/Admin";
import Upgrade from "./pages/Upgrade";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import HighlightReelPage from "./pages/HighlightReelPage";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import ComparisonPage from "./pages/ComparisonPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/es/:slug" element={<BlogArticle />} />
            <Route path="/blog/ua/:slug" element={<BlogArticle />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/vs/:competitor" element={<ComparisonPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="videos/configure/:id" element={<VideoConfig />} />
              <Route path="videos/review/:id" element={<VideoReviewRedirect />} />
              <Route path="videos/:id" element={<VideoDetail />} />
              <Route path="videos/edit/:clipId" element={<ClipEdit />} />
              <Route path="settings" element={<Settings />} />
              <Route path="clips" element={<ClipsLibrary />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="admin" element={<Admin />} />
              <Route path="highlight-reel/new/:videoId" element={<HighlightReelPage />} />
              <Route path="highlight-reel/edit/:reelId" element={<HighlightReelPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
