import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import Logo from "../assets/Logo.png";
import supabase from "../lib/supabaseClient"; // ensure correct import
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // Added for consistent error/success messages
  const navigate = useNavigate();

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message); // Use message state
    } else {
      navigate("/home");
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
    setLoading(true);

    // Using 'resetPasswordForEmail' is clearer for this flow
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/update-password", // You'll need a page for this
    });
    setLoading(false);

    if (error) {
      setMessage(error.message); // Use message state
    } else {
      setMessage("Password reset link sent to your email!");
      // You might not need OTP mode if you use the reset link flow
      // If you still want OTP login, keep your original 'signInWithOtp' logic
      // and setMode("otp")
    }
  };

  // Handle OTP Login (if you keep it)
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "magiclink", // or 'email' depending on your setup
    });
    setLoading(false);

    if (error) {
      setMessage(error.message); // Use message state
    } else {
      navigate("/home");
    }
  };

  // Added from Register.jsx
  const handleGoogleSignIn = async () => {
    setMessage(""); // Clear previous messages
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "http://localhost:5173/splashscreen",
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err.message);
    }
  };

  // Helper to render the correct form
  const renderForm = () => {
    if (mode === "forgot") {
      return (
        <form onSubmit={handleForgotPassword} className="space-y-4 mt-6">
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>
      );
    }

    if (mode === "otp") {
      return (
        <form onSubmit={handleOtpLogin} className="space-y-4 mt-6">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      );
    }

    // Default: mode === "login"
    return (
      <form onSubmit={handleLogin} className="space-y-4 mt-6">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    );
  };

  return (
    // Aligned main container
    <div className="w-full h-[630px] flex flex-col lg:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Left Section - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 py-8">
        <div className="w-full max-w-md">
          {/* Aligned mobile logo */}
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img
              src={Logo}
              alt="Babuji Chaay"
              className="h-28 w-28 rounded-full object-contain"
            />
          </div>

          {/* Aligned h1 */}
          <h1 className="text-xl font-bold mb-6 text-foreground">
            Babuji Chaay
          </h1>

          {/* Aligned h2 */}
          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            {mode === "login"
              ? "Welcome Back"
              : mode === "forgot"
              ? "Forgot Password"
              : "Enter OTP"}
          </h2>

          {renderForm()}

          {/* Aligned message display */}
          {message && (
            <p className="text-center text-sm text-destructive mt-4">
              {message}
            </p>
          )}

          {/* Links for forgot password / back to login */}
          <div className="text-center mt-4">
            {mode === "login" && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode("forgot");
                  setMessage("");
                }}
                className="text-sm text-secondary font-medium hover:underline"
              >
                Forgot password?
              </a>
            )}
            {(mode === "forgot" || mode === "otp") && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode("login");
                  setMessage("");
                }}
                className="text-sm text-secondary font-medium hover:underline"
              >
                Back to Login
              </a>
            )}
          </div>

          {/* Aligned "or" separator */}
          <div className="flex items-center my-6">
            <hr className="flex-grow border-border" />
            <span className="px-2 text-muted-foreground text-sm">or</span>
            <hr className="flex-grow border-border" />
          </div>

          {/* Aligned Google button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center border border-border rounded-lg p-3 hover:bg-muted transition"
          >
            <FcGoogle size={20} className="mr-2" /> Continue with Google
          </button>

          {/* Aligned bottom link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <a
              href="/register" // Assuming '/register' is your register route
              className="text-secondary font-medium hover:underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>

      {/* Right Section - Branding (Aligned) */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground flex-col items-center justify-center">
        <img
          src={Logo}
          alt="Babuji Chaay"
          className="h-56 w-56 object-contain drop-shadow-xl" // Added drop-shadow
        />
      </div>
    </div>
  );
};

export default Login;