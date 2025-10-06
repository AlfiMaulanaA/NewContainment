//app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api-service";
import { AuthNotifications } from "@/lib/auth-notifications";
import {
  Eye,
  EyeOff,
  Sun,
  Moon,
  Server,
  Shield,
  Zap,
  Cpu,
  Activity,
  Lock,
  Building,
  Thermometer,
  Waves,
  Cloud,
  Mail,
  ChevronRight,
  Database,
  HardDrive,
  Globe,
} from "lucide-react";
import { useTheme } from "next-themes";
import { setCookie } from "cookies-next";

const LoginPage = () => {
  const { theme, setTheme } = useTheme();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  // const [currentImage, setCurrentImage] = useState("/images/images-node-2.png");
  const [currentImage, setCurrentImage] = useState(
    "/images/Containment-AsBuilt.png"
  );
  const [loading, setLoading] = useState(false);
  const [loginAnimation, setLoginAnimation] = useState(false);

  const images = [
    "/images/Containment-AsBuilt.png",
    // "/images/images-node-2.png",
    // "/images/images-node-1.png",
    // "/images/images-node-3.cpp",
  ];

  useEffect(() => {
    let imageIndex = 0;
    const intervalId = setInterval(() => {
      imageIndex = (imageIndex + 1) % images.length;
      setCurrentImage(images[imageIndex]);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [images]);

  // Load saved credentials if remember me was enabled
  useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberedCredentials");
    if (savedCredentials) {
      const { email: savedEmail, rememberMe: wasRemembered } =
        JSON.parse(savedCredentials);
      if (wasRemembered) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // Fungsi untuk menyimpan token di cookie (backup untuk compatibility)
  const saveCookieToken = (token: string, remember: boolean = false) => {
    const maxAge = remember ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 1; // 1 tahun jika remember me, 1 hari jika tidak
    setCookie("authToken", token, { path: "/", maxAge });
  };

  // Fungsi untuk menyimpan/menghapus credentials yang diingat
  const handleRememberCredentials = (email: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(
        "rememberedCredentials",
        JSON.stringify({
          email,
          rememberMe: true,
        })
      );
    } else {
      localStorage.removeItem("rememberedCredentials");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and Password are required.");
      setLoading(false);
      return;
    }

    try {
      const result = await authApi.login({ email, password, rememberMe });

      if (result.success && result.data) {
        // Handle remember me functionality
        handleRememberCredentials(email, rememberMe);

        // Token is automatically stored in localStorage by authApi
        // Also save to cookie for compatibility
        saveCookieToken(result.data.token, rememberMe);

        // Show success notification
        AuthNotifications.loginSuccess(result.data.user.name);

        console.log(
          "🔍 Login successful, token stored:",
          result.data.token ? "YES" : "NO"
        );

        // Trigger the beautiful login animation
        setLoginAnimation(true);
        setLoading(false);

        // Delay before redirecting to show the animation
        setTimeout(() => {
          router.push("/dashboard-overview");
        }, 4000); // 4 seconds of animation
      } else {
        const errorMessage = result.message || "Login failed";
        setError(errorMessage);
        AuthNotifications.loginError(errorMessage);
        setLoading(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error occurred";
      setError(errorMessage);
      AuthNotifications.connectionError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Data Center Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="data-center-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="none"/>
                <circle cx="25" cy="25" r="1" fill="currentColor" opacity="0.6"/>
                <rect x="10" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#data-center-grid)"/>
          </svg>
        </div>

        {/* Floating Containment Icons */}
        <div className="absolute top-20 left-20 animate-float opacity-10">
          <Server className="h-8 w-8 text-blue-600" />
        </div>
        <div className="absolute top-40 right-32 animate-float-delayed opacity-8">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="absolute bottom-40 left-40 animate-float opacity-6">
          <Database className="h-7 w-7 text-emerald-600" />
        </div>
        <div className="absolute bottom-20 right-20 animate-float-delayed opacity-8">
          <Building className="h-6 w-6 text-purple-600" />
        </div>
        <div className="absolute top-60 left-1/2 animate-bounce-pulse opacity-5">
          <Cpu className="h-5 w-5 text-cyan-600" />
        </div>
        <div className="absolute bottom-60 right-1/4 animate-float opacity-7">
          <HardDrive className="h-6 w-6 text-orange-600" />
        </div>
      </div>

      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="backdrop-blur-md bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-slate-700/30 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-all duration-300 rounded-full px-4 py-2"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 mr-2" />
          ) : (
            <Sun className="h-4 w-4 mr-2" />
          )}
          <span className="text-sm font-medium">
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 relative z-10">
        <div className="w-full max-w-7xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 rounded-3xl shadow-2xl overflow-hidden">

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

            {/* Left Side - Login Form */}
            <div className="order-2 lg:order-1 p-8 lg:p-12 flex flex-col justify-center bg-white/70 dark:bg-slate-900/70">
              <div className="max-w-md mx-auto w-full space-y-6">

                {/* Welcome Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl mb-4 shadow-lg">
                    <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Access Portal
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Secure login to your containment management system
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email address..."
                        className="pl-10 h-11 bg-white/80 dark:bg-slate-800/80 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="password"
                        type={passwordVisible ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password..."
                        className="pl-10 pr-10 h-11 bg-white/80 dark:bg-slate-800/80 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 focus:outline-none focus:text-blue-500 transition-colors duration-200"
                      >
                        {passwordVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Remember me</span>
                    </label>
                    <a href="/auth/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                      Forgot password?
                    </a>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {!loading && <ChevronRight className="h-4 w-4" />}
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span className="text-sm">Authenticating...</span>
                      </>
                    ) : (
                      <span className="text-sm">Access System</span>
                    )}
                  </Button>
                </form>

                {/* Footer Status */}
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      <span>v{appVersion}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span>Online</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-blue-500" />
                        <span>Secure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Hero Section */}
            <div className="order-1 lg:order-2 bg-gradient-to-br from-blue-600/95 to-indigo-700/95 dark:from-blue-700 dark:to-indigo-800 relative overflow-hidden">

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-8">
                <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <defs>
                    <pattern id="hero-grid" patternUnits="userSpaceOnUse" width="30" height="30">
                      <rect width="30" height="30" fill="none"/>
                      <circle cx="15" cy="15" r="1" fill="white" opacity="0.4"/>
                      <rect x="8" y="8" width="14" height="14" fill="none" stroke="white" strokeWidth="0.3" opacity="0.2"/>
                    </pattern>
                  </defs>
                  <rect width="300" height="300" fill="url(#hero-grid)"/>
                </svg>
              </div>

              {/* Content Container with Image */}
              <div className="h-full flex flex-col items-center justify-center p-8 lg:p-12 relative z-10">
                <div className="text-center text-white space-y-6">
                  {/* Brand */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Server className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-wide">
                        IoT Containment Monitoring
                      </h3>
                      <p className="text-white/80 text-xs">
                        Enterprise Data Center Solution
                      </p>
                    </div>
                  </div>

                  {/* Main Headline */}
                  <h1 className="text-2xl lg:text-3xl font-bold leading-tight animate-fadeInLeft">
                    Advanced <span className="text-blue-200">Containment</span>
                    <br />Monitoring System
                  </h1>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4 animate-fadeInLeft animation-delay-400">
                    <Badge className="bg-white/20 text-white border-white/30 text-xs hover:bg-white/30 transition-colors">
                      <Activity className="h-3 w-3 mr-1" />
                      Real-time Monitoring
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 text-xs hover:bg-white/30 transition-colors">
                      <Shield className="h-3 w-3 mr-1" />
                      Secure Access
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 text-xs hover:bg-white/30 transition-colors">
                      <Zap className="h-3 w-3 mr-1" />
                      High Performance
                    </Badge>
                  </div>
                </div>

                {/* Centered Containment Image - Larger */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="relative group max-w-md w-full">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>

                    {/* Image Container */}
                    <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-xl group-hover:shadow-blue-500/20 transition-all duration-500">
                      <img
                        src="/images/Containment-AsBuilt.png"
                        alt="Advanced Containment System"
                        className="w-full h-64 lg:h-72 object-contain rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-10px) translateX(5px); }
          66% { transform: translateY(5px) translateX(-3px); }
        }

        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes bounce-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-fadeInLeft {
          animation: fadeInLeft 0.8s ease-out;
        }

        .animate-bounce-pulse {
          animation: bounce-pulse 3s ease-in-out infinite;
        }

        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }

        @keyframes pulse-3d {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.6); }
        }

        @keyframes data-flow {
          0% { width: 0%; background-position: 0% 50%; }
          50% { width: 100%; background-position: 100% 50%; }
          100% { width: 100%; background-position: 200% 50%; }
        }

        @keyframes server-rack-pulse {
          0%, 100% { opacity: 0.7; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.1); }
        }

        @keyframes network-nodes {
          0% { transform: rotate(0deg) scale(1); opacity: 0.6; }
          25% { transform: rotate(90deg) scale(1.1); opacity: 1; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 0.8; }
          75% { transform: rotate(270deg) scale(1.1); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.6; }
        }

        @keyframes security-shield {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.5)); }
          50% { transform: scale(1.2); filter: drop-shadow(0 0 20px rgba(34, 197, 94, 0.8)); }
        }

        .animate-pulse-3d { animation: pulse-3d 2s ease-in-out infinite; }
        .animate-data-flow { animation: data-flow 3s linear infinite; }
        .animate-server-rack { animation: server-rack-pulse 1.5s ease-in-out infinite; }
        .animate-network-nodes { animation: network-nodes 4s linear infinite; }
        .animate-security-shield { animation: security-shield 2.5s ease-in-out infinite; }
      `}</style>

      {/* Elegant Login Animation Overlay */}
      {loginAnimation && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-muted to-muted/80 dark:from-background dark:via-muted dark:to-muted/80 flex items-center justify-center">

          {/* Subtle Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="subtle-grid" patternUnits="userSpaceOnUse" width="60" height="60">
                  <circle cx="30" cy="30" r="1.5" className="fill-muted-foreground" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#subtle-grid)" />
            </svg>
          </div>

          {/* Minimal Animated Elements */}
          <div className="absolute top-20 right-20 animate-float">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <div className="absolute bottom-20 left-20 animate-float-delayed">
            <Shield className="h-7 w-7 text-primary" />
          </div>

          {/* Main Content */}
          <div className="text-center text-foreground relative z-10 max-w-2xl mx-auto px-8">

            {/* Brand Header */}
            <div className="mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted/20 rounded-2xl mb-6 animate-pulse-3d">
                <Server className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                Welcome to <span className="text-primary">IoT Containment</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Establishing Secure Connection...
              </p>
            </div>

            {/* Clean Progress Elements */}
            <div className="space-y-12">

              {/* Large Progress Ring */}
              <div className="flex justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-muted/20"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="url(#progress-gradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="314"
                      className="animate-data-flow"
                    >
                      <defs>
                        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="25%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" />
                        </linearGradient>
                      </defs>
                    </circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Simple Server Rack */}
              <div className="flex justify-center">
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-12 bg-gradient-to-t from-muted/30 to-primary/20 rounded border border-border/20 relative"
                    >
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sequential Status Messages */}
              <div className="space-y-3 text-center">
                <div className="text-primary font-medium animate-fadeInLeft">
                  ✓ Authentication Verified
                </div>
                <div className="text-primary font-medium animate-fadeInLeft flex items-center justify-center gap-2" style={{ animationDelay: '0.5s' }}>
                  <Shield className="h-4 w-4" />
                  Initializing Session
                </div>
                <div className="text-primary font-medium animate-fadeInLeft flex items-center justify-center gap-2" style={{ animationDelay: '1s' }}>
                  <Zap className="h-4 w-4" />
                  Connecting to Dashboard
                </div>
              </div>
            </div>

            {/* Minimal Footer */}
            <div className="mt-16 text-center text-muted-foreground/60">
              <div className="text-sm">
                Please wait while we prepare your workspace...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
