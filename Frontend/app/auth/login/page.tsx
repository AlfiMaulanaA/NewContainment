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
        }, 2000); // 4 seconds of animation
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
    <div className="flex min-h-screen font-sans bg-[#9e9e9e] dark:bg-black relative">
      {/* Kiri: Gambar dan informasi */}
      <div
        className="flex-1 relative bg-cover bg-center overflow-hidden hidden lg:block"
      >
        {/* Overlay tambahan untuk dark mode */}
        <div
          className="absolute inset-0 bg-[#9e9e9e] dark:bg-black/40 transition-opacity duration-500 ease-in-out"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)" }}
        ></div>

        <div
          className="absolute inset-0 bg-black/50 dark:bg-white/20 p-8 m-8 rounded-2xl flex flex-col justify-between animate-fadeInLeft transition-all duration-500 ease-in-out"
          style={{ clipPath: "polygon(0% 0, 100% 0, 85% 100%, 0% 100%)" }}
        >
          {/* Info Produksi */}
          <div className="absolute top-6 left-6 z-10 text-white">
            <div className="text-sm font-medium mb-2">Production By</div>
            <div className="flex items-center gap-2 animate-fadeInUp">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold leading-tight">
                  PT Graha Sumber Prima Elektronik
                </p>
                <p className="text-white/70 text-sm leading-tight">
                  Manufactur Electrical Panel & Internet Of Things
                </p>
              </div>
            </div>
          </div>

          {/* Gambar Utama */}
          <div className="flex flex-1 justify-center items-center mr-6">
            <img
              src={currentImage}
              alt="Device"
              className="w-100 h-100 lg:w-96 lg:h-96 object-contain rounded-md animate-fadeIn transition-all duration-1000"
            />
          </div>

          {/* Deskripsi tambahan di bagian bawah gambar */}
          <div className="absolute bottom-6 left-6 right-6 text-white/90 text-center">
            <p className="text-sm font-medium mb-2 fw-bold animate-fadeInUp">
              Advanced IoT Containment Solution
            </p>
            <p className="text-xs text-white animate-fadeInUp">
              Industrial-grade IoT containment monitoring with real-time data acquisition
            </p>
            <p className="text-xs text-white animate-fadeInUp mt-2">
              Experience robust connectivity with our cutting-edge containment technology that enables real-time data acquisition,
              secure communication, and comprehensive facility monitoring.
            </p>
          </div>

        </div>
      </div>

      {/* Kanan: Form Login */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950 px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out border-l-2 border-primary/10 shadow-xl shadow-black/5" style={{ clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)" }}>
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle Theme"
            className="flex items-center gap-2"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === "light" ? "Dark" : "Light"}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-6 animate-slideIn py-12">
          <div>
            <h2 className="text-3xl font-bold text-center text-foreground animate-fadeInUp">
              Hi, Welcome Back.
            </h2>
            <p className="text-center text-muted-foreground mt-2 text-sm">
              <span className="inline-block overflow-hidden whitespace-nowrap">
                Welcome to IoT Containment Monitoring System
              </span>
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
          </form>
        </div>
      </div>

      {/* Versi Aplikasi */}
      <div className="absolute bottom-2 right-4 text-xs text-muted-foreground border border-border px-3 py-1 rounded-full bg-card/70 backdrop-blur-sm shadow-sm">
        Version {appVersion}
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

      {/* Simple Login Animation Overlay */}
      {loginAnimation && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="text-center max-w-md mx-auto px-8">
            {/* Simple Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Server className="h-8 w-8 text-primary animate-pulse" />
            </div>

            {/* Simple Message */}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to <span className="text-primary">IoT Containment</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Establishing secure connection...
            </p>

            {/* Simple Loading Dots */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
