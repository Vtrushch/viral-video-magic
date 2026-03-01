import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type AuthMode = "signin" | "signup" | "reset" | "update-password";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "update-password" ? "update-password" as AuthMode : "signin" as AuthMode;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Listen for password recovery event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast({
          title: t('auth.checkEmail'),
          description: t('auth.confirmationSent'),
        });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        if (error) throw error;
        toast({
          title: t('auth.checkEmailReset'),
          description: t('auth.resetLinkSent'),
        });
      } else if (mode === "update-password") {
        if (password !== confirmPassword) {
          toast({
            title: t('auth.error'),
            description: t('auth.passwordsMismatch') || "Passwords do not match",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast({
          title: t('auth.passwordUpdated'),
          description: t('auth.passwordUpdatedDesc'),
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      console.error("Google sign-in error:", result.error);
      toast({
        title: t('auth.error'),
        description: result.error.message,
        variant: "destructive",
      });
    } else if (!result.redirected) {
      navigate("/dashboard");
    }
  };

  const isSignUp = mode === "signup";
  const isReset = mode === "reset";
  const isUpdatePassword = mode === "update-password";

  const getHeading = () => {
    if (isReset) return t('auth.resetPassword');
    if (isUpdatePassword) return t('auth.setNewPassword');
    if (isSignUp) return t('auth.createAccount');
    return t('auth.signIn');
  };

  const getSubtitle = () => {
    if (isReset) return t('auth.resetSubtitle');
    if (isUpdatePassword) return "";
    if (isSignUp) return t('auth.signUpSubtitle');
    return t('auth.signInSubtitle');
  };

  const getButtonLabel = () => {
    if (loading) return t('auth.loading');
    if (isReset) return t('auth.sendResetLink');
    if (isUpdatePassword) return t('auth.updatePassword');
    if (isSignUp) return t('auth.createAccountBtn');
    return t('auth.signInBtn');
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1A1A2E 0%, #2A2A3E 50%, #1A1A2E 100%)' }}>
      {/* Decorative orbs */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-secondary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-md mx-6">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToHome')}
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <Scissors className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {getHeading()}
          </h1>
          {getSubtitle() && (
            <p className="text-sm text-muted-foreground mt-1">
              {getSubtitle()}
            </p>
          )}
        </div>

        <div className="rounded-2xl p-8 backdrop-blur-xl border" style={{ background: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)', boxShadow: '0 8px 40px -12px rgba(255, 45, 85, 0.15), 0 0 80px -20px rgba(94, 92, 230, 0.1)' }}>
          {/* Google sign-in only for signin/signup */}
          {!isReset && !isUpdatePassword && (
            <>
              <Button
                variant="outline"
                className="w-full mb-6 h-11 bg-white text-gray-800 border-white/20 hover:bg-gray-100 hover:text-gray-900 font-medium"
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('auth.continueWithGoogle')}
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 text-white/50" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>{t('auth.orContinueWithEmail')}</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="name" className="text-sm" style={{ color: '#E5E5E5' }}>{t('auth.fullName')}</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 text-white placeholder:text-white/50 border-white/10 focus-visible:ring-primary/50"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email field — show for signin, signup, reset (not update-password) */}
            {!isUpdatePassword && (
              <div>
                <Label htmlFor="email" className="text-sm" style={{ color: '#E5E5E5' }}>{t('auth.email')}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 text-white placeholder:text-white/50 border-white/10 focus-visible:ring-primary/50"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password field — show for signin, signup, update-password */}
            {!isReset && (
              <div>
                <Label htmlFor="password" className="text-sm" style={{ color: '#E5E5E5' }}>
                  {isUpdatePassword ? t('auth.newPassword') : t('auth.password')}
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 text-white placeholder:text-white/50 border-white/10 focus-visible:ring-primary/50"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Confirm password — only for update-password */}
            {isUpdatePassword && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm" style={{ color: '#E5E5E5' }}>{t('auth.confirmPassword')}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 text-white placeholder:text-white/50 border-white/10 focus-visible:ring-primary/50"
                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Forgot password link — only on signin */}
            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-xs text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            <Button variant="hero" type="submit" className="w-full h-11" disabled={loading}>
              {getButtonLabel()}
            </Button>
          </form>

          {/* Footer links */}
          {isReset ? (
            <p className="text-sm text-center text-white/60 mt-6">
              <button
                onClick={() => setMode("signin")}
                className="text-primary hover:underline font-medium"
              >
                {t('auth.backToSignIn')}
              </button>
            </p>
          ) : isUpdatePassword ? null : (
            <p className="text-sm text-center text-white/60 mt-6">
              {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}{" "}
              <button
                onClick={() => setMode(isSignUp ? "signin" : "signup")}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? t('auth.signInLink') : t('auth.signUpLink')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
