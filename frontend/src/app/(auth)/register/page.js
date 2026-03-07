"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Camera, 
  Image, 
  Heart, 
  Award,
  Aperture,
  ChevronRight,
  User,
  CheckCircle,
  ChevronLeft,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { FaGoogle } from "react-icons/fa";

export default function RegisterPage() {
  const router = useRouter();
  const { register, checkUserExists, googleLogin } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const shapes = document.querySelectorAll('.floating-shape');
      shapes.forEach(shape => {
        const newX = Math.random() * 10 - 5;
        const newY = Math.random() * 10 - 5;
        shape.style.transform = `translate(${newX}px, ${newY}px)`;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const userData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };

      const { success, error } = await register(userData);

      if (success) {
        toast.success("Registration successful!");
        router.push("/feed");
      } else {
        toast.error(error || "Registration failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (error) {
      toast.error("Google login failed. Please try again.");
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4 transition-all duration-300 bg-background relative">
      {/* Floating background elements - using static values to prevent hydration mismatch */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          // Pre-defined static values to avoid SSR/client mismatch
          const staticShapes = [
            { width: 280, height: 350, top: 10, left: 5 },
            { width: 420, height: 280, top: 60, left: 80 },
            { width: 180, height: 220, top: 30, left: 45 },
            { width: 320, height: 400, top: 75, left: 20 },
            { width: 250, height: 300, top: 45, left: 70 },
            { width: 380, height: 260, top: 85, left: 35 },
          ];
          const shape = staticShapes[i];
          return (
            <div
              key={i}
              className="floating-shape absolute rounded-full transition-transform duration-3000 ease-in-out bg-primary/10"
              style={{
                width: `${shape.width}px`,
                height: `${shape.height}px`,
                top: `${shape.top}%`,
                left: `${shape.left}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${15 + i * 3}s`
              }}
            ></div>
          );
        })}
      </div>
      
      {/* Main container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-screen-xl mx-auto flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl bg-card border border-border"
      >
        {/* Left side - Register form */}
        <div className="w-full lg:w-5/12 p-8 lg:p-12 bg-card flex flex-col justify-center relative">
          <div className="mb-8 flex justify-start">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
              <Camera className="h-7 w-7 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            Create your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              account
            </span>
          </h1>
          
          <p className="mb-8 text-base text-muted-foreground">
            Join our creative community and start sharing your visual stories with the world.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <div className="text-muted-foreground flex-shrink-0">
                  <User size={18} />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <div className="text-muted-foreground flex-shrink-0">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="block text-sm font-medium text-foreground">
                Username
              </label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <div className="text-muted-foreground flex-shrink-0">
                  <User size={18} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <div className="text-muted-foreground flex-shrink-0">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                <div className="text-muted-foreground flex-shrink-0">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-medium text-white bg-primary hover:bg-primary/90 focus:ring-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Create Account
                    <UserPlus className="ml-2 h-5 w-5" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <button
            onClick={handleGoogleLogin}
            className="flex justify-center items-center py-2.5 px-4 border border-border rounded-lg hover:bg-secondary transition-colors w-full text-foreground gap-2 cursor-pointer mt-6"
          >
            <FaGoogle className="size-4" />
            <span>Continue with Google</span>
          </button>
          
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
        
        {/* Right side - Photography showcase */}
        <div className="w-full lg:w-7/12 relative overflow-hidden bg-secondary">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full" style={{
                backgroundImage: `
                  linear-gradient(to right, var(--primary) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40"></div>
          </div>
          
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="w-full max-w-md px-8 py-12 text-foreground">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-extrabold mb-4">Join Our Creative Community</h2>
                <p className="text-lg text-muted-foreground">Start your journey as a creator and share your unique vision with the world.</p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {[
                  {
                    icon: <Image className="h-8 w-8" />,
                    title: "Create",
                    description: "Generate stunning visuals with AI tools"
                  },
                  {
                    icon: <Heart className="h-8 w-8" />,
                    title: "Share",
                    description: "Showcase your work to a global audience"
                  },
                  {
                    icon: <Aperture className="h-8 w-8" />,
                    title: "Grow",
                    description: "Build your following and get discovered"
                  },
                  {
                    icon: <Award className="h-8 w-8" />,
                    title: "Earn",
                    description: "Monetize your creativity and skills"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * index + 0.3 }}
                    className="p-5 rounded-xl bg-card backdrop-blur-sm hover:bg-card/80 transition-all duration-300 border border-border"
                  >
                    <div className="mb-3 text-primary">{feature.icon}</div>
                    <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="text-center"
              >
                <div className="flex justify-center space-x-2 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Join 3M+ creators worldwide</p>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute inset-0 z-0 overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              // Pre-defined static values to avoid SSR/client mismatch
              const staticElements = [
                { size: 120, x: 100, y: 80, delay: 0, duration: 18, opacity: 0.4, rotate: 5 },
                { size: 180, x: 300, y: 200, delay: 1, duration: 22, opacity: 0.35, rotate: -3 },
                { size: 100, x: 500, y: 120, delay: 2, duration: 16, opacity: 0.5, rotate: 8 },
                { size: 160, x: 200, y: 350, delay: 0.5, duration: 20, opacity: 0.3, rotate: -5 },
                { size: 140, x: 450, y: 280, delay: 1.5, duration: 24, opacity: 0.45, rotate: 4 },
                { size: 110, x: 350, y: 450, delay: 2.5, duration: 19, opacity: 0.35, rotate: -7 },
                { size: 130, x: 150, y: 500, delay: 3, duration: 21, opacity: 0.4, rotate: 6 },
                { size: 170, x: 400, y: 380, delay: 3.5, duration: 17, opacity: 0.3, rotate: -4 },
              ];
              const el = staticElements[i];

              return (
                <motion.div
                  key={i}
                  initial={{
                    x: el.x,
                    y: el.y,
                    opacity: 0,
                    rotate: el.rotate
                  }}
                  animate={{
                    x: [el.x, el.x + 50, el.x - 50, el.x],
                    y: [el.y, el.y - 50, el.y + 50, el.y],
                    opacity: el.opacity,
                    rotate: [el.rotate, el.rotate + 5, el.rotate - 5, el.rotate]
                  }}
                  transition={{
                    duration: el.duration,
                    delay: el.delay,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="absolute rounded-lg overflow-hidden shadow-lg"
                  style={{
                    width: el.size,
                    height: el.size * 1.25,
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/30 to-primary/30 flex items-center justify-center">
                      <Image className="w-1/3 h-1/3 text-foreground/20" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProConnect. All rights reserved.</p>
        <div className="mt-2 flex justify-center space-x-4">
          <Link href="/terms" className="hover:underline hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:underline hover:text-foreground">Privacy</Link>
          <Link href="/help" className="hover:underline hover:text-foreground">Help Center</Link>
        </div>
      </div>
    </div>
  );
}
