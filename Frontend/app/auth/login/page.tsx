//app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api-service";
import { AuthNotifications } from "@/lib/auth-notifications";
import {
  Facebook,
  Twitter,
  Instagram,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Container,
} from "lucide-react";
import { useTheme } from "next-themes";
import { setCookie } from "cookies-next";
import ThemeAvatar from "@/components/theme-avatar";

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

  const images = [
    "/images/Containment-AsBuilt.png",
    // "/images/images-node-2.png",
    // "/images/images-node-1.png",
    // "/images/images-node-3.png",
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

        // Wait a bit for the auth state to update, then navigate
        setTimeout(() => {
          router.push("/dashboard-overview");
        }, 100);
      } else {
        const errorMessage = result.message || "Login failed";
        setError(errorMessage);
        AuthNotifications.loginError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network error occurred";
      setError(errorMessage);
      AuthNotifications.connectionError(errorMessage);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen font-sans relative bg-background text-foreground">
      {/* Kiri: Gambar dan informasi */}
      <div
        className="flex-1 relative bg-cover bg-center overflow-hidden hidden lg:block"
        style={{ backgroundImage: "url(/images/border-device.png)" }}
      >
        <div
          className="absolute inset-0 bg-black/60 dark:bg-black/80 p-8 m-8 rounded-2xl flex flex-col justify-between animate-fadeInLeft"
          style={{ clipPath: "polygon(0 0, 80% 0, 100% 100%, 0% 100%)" }}
        >
          {/* Info Produksi */}
          <div className="absolute top-6 left-6 z-10 text-white">
            <div className="text-sm font-medium mb-2">Production By</div>
            <div className="flex items-center gap-2 animate-fadeInUp">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 backdrop-blur-sm flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700">
                <Container className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold leading-tight text-white">
                  IoT Containment Monitoring
                </p>
                <p className="text-white/70 text-sm leading-tight">
                  Advanced Containment & Sensor Monitoring System
                </p>
              </div>
            </div>
          </div>

          {/* Gambar Utama */}
          <div className="flex justify-start items-end h-full pb-12 pl-12">
            <img
              src={currentImage}
              alt="MQTT Device"
              width={500}
              height={500}
              key={currentImage}
              className="rounded-md animate-fadeIn transition-all duration-1000"
            />
          </div>
        </div>
      </div>

      {/* Kanan: Form Login */}
      <div className="bg-background flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="default"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle Theme"
            className="flex items-center gap-2 text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          </Button>
        </div>

        <div className="w-full max-w-md space-y-6 animate-slideIn py-12">
          <div>
            <h2 className="text-3xl font-bold text-center animate-fadeInUp text-foreground">
              Hi, Welcome Back.
            </h2>
            <p className="text-center mt-2 text-sm text-muted-foreground">
              <span
                className="inline-block border-r-2 border-blue-500 pr-2 animate-typing overflow-hidden whitespace-nowrap"
                style={{
                  animation:
                    "typing 2.5s steps(30, end), blink-caret .75s step-end infinite",
                }}
              >
                Welcome to IOT Containment System
              </span>
            </p>
          </div>

          {/* Form Input */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                  tabIndex={-1}
                >
                  {passwordVisible ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="accent-blue-600 dark:accent-blue-400"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Tombol Login */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </Button>

            {/* Error Message */}
            {error && (
              <div className="text-center text-red-500 text-sm mt-2">
                {error}
              </div>
            )}

            {/* Daftar */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a
                href="/auth/register"
                className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Sign up
              </a>
            </p>
          </form>

          {/* Sosial Media */}
          <div className="text-center mt-6 space-x-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Facebook className="w-5 h-5 inline" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
            >
              <Twitter className="w-5 h-5 inline" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
            >
              <Instagram className="w-5 h-5 inline" />
            </a>
          </div>
        </div>
      </div>

      {/* Versi Aplikasi */}
      <div className="absolute bottom-2 right-4 text-xs px-3 py-1 rounded-full backdrop-blur-sm shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md text-muted-foreground border border-border bg-background/70 hover:bg-accent/80">
        Version {appVersion}
      </div>
    </div>
  );
};

export default LoginPage;
