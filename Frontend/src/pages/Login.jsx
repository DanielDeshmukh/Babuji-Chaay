import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import Logo from "../assets/Logo.png";
import supabase from "../lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
    else navigate("/home");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_REDIRECT_URL}splashscreen`,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage("Password reset link sent to your email!");
  };

  const handleGoogleSignIn = async () => {
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Pointing to splashscreen helps the App.jsx listener catch the session
          redirectTo: `${import.meta.env.VITE_REDIRECT_URL}splashscreen`,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err.message);
    }
  };

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
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>
      );
    }
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
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 py-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img src={Logo} alt="Logo" className="h-28 w-28 rounded-full object-contain" />
          </div>
          <h1 className="text-xl font-bold mb-6">Babuji Chaay</h1>
          <h2 className="text-2xl font-semibold mb-2">
            {mode === "login" ? "Welcome Back" : "Forgot Password"}
          </h2>
          {renderForm()}
          {message && <p className="text-center text-sm text-destructive mt-4">{message}</p>}
          <div className="text-center mt-4">
            <button
              onClick={() => setMode(mode === "login" ? "forgot" : "login")}
              className="text-sm text-secondary font-medium hover:underline"
            >
              {mode === "login" ? "Forgot password?" : "Back to Login"}
            </button>
          </div>
          <div className="flex items-center my-6">
            <hr className="flex-grow border-border" />
            <span className="px-2 text-muted-foreground text-sm">or</span>
            <hr className="flex-grow border-border" />
          </div>
          <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center border border-border rounded-lg p-3 hover:bg-muted transition">
            <FcGoogle size={20} className="mr-2" /> Continue with Google
          </button>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account? <Link to="/" className="text-secondary font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground flex-col items-center justify-center">
        <img src={Logo} alt="Logo" className="h-56 w-56 object-contain drop-shadow-xl" />
      </div>
    </div>
  );
};

export default Login;