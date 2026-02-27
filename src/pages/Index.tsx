import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyHookCut from "@/components/landing/Features";
import ComparisonAndCTA from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

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
