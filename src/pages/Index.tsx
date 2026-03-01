import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyHookCut from "@/components/landing/Features";
import ComparisonAndCTA from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Only handle simple anchor hashes (e.g. #pricing), skip OAuth tokens like #access_token=...
    if (location.hash && /^#[a-zA-Z][\w-]*$/.test(location.hash)) {
      const el = document.getElementById(location.hash.substring(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen dark">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyHookCut />
      <ComparisonAndCTA />
      <Footer />
    </div>
  );
};

export default Index;
