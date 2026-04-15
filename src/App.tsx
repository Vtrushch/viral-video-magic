import { Helmet } from "react-helmet-async";
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
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://hookcut.com/#organization",
            "name": "HookCut",
            "alternateName": "HookCut AI",
            "url": "https://hookcut.com",
            "logo": {
              "@type": "ImageObject",
              "@id": "https://hookcut.com/#logo",
              "url": "https://hookcut.com/logo.png",
              "contentUrl": "https://hookcut.com/logo.png",
              "width": 512,
              "height": 512,
              "caption": "HookCut"
            },
            "image": { "@id": "https://hookcut.com/#logo" },
            "description": "HookCut is an AI-powered video repurposing tool that automatically clips long-form videos into short viral clips for TikTok, Instagram Reels, and YouTube Shorts. Features include AI clip extraction with viral scoring, automatic word-by-word captions, face tracking for vertical reframing, and preview before rendering.",
            "foundingDate": "2025",
            "slogan": "Turn long videos into viral clips in minutes",
            "sameAs": [
              "https://twitter.com/hookcut",
              "https://www.linkedin.com/company/hookcut",
              "https://www.youtube.com/@hookcut",
              "https://www.tiktok.com/@hookcut",
              "https://www.producthunt.com/products/hookcut"
            ],
            "knowsAbout": [
              "video repurposing",
              "short-form video creation",
              "AI video editing",
              "automatic video captions",
              "TikTok content creation",
              "Instagram Reels creation",
              "YouTube Shorts creation",
              "face tracking video reframing",
              "viral clip extraction",
              "content repurposing for social media",
              "podcast video repurposing",
              "webinar clip extraction"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "HookCut Plans",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "name": "Free Plan",
                  "description": "3 clips free, no credit card required, no watermarks",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                {
                  "@type": "Offer",
                  "name": "Starter Plan",
                  "description": "For individual content creators",
                  "price": "9",
                  "priceCurrency": "USD",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "billingDuration": "P1M",
                    "billingIncrement": 1
                  }
                },
                {
                  "@type": "Offer",
                  "name": "Pro Plan",
                  "description": "For active creators and agencies",
                  "price": "19",
                  "priceCurrency": "USD",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "billingDuration": "P1M",
                    "billingIncrement": 1
                  }
                }
              ]
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer support",
              "availableLanguage": ["English", "Spanish", "Ukrainian"],
              "url": "https://hookcut.com/contact"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://hookcut.com/#website",
            "url": "https://hookcut.com",
            "name": "HookCut",
            "description": "AI-powered video repurposing tool — turn long videos into viral short clips",
            "publisher": {
              "@id": "https://hookcut.com/#organization"
            },
            "inLanguage": ["en", "es", "uk"],
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://hookcut.com/blog?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      </Helmet>
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
