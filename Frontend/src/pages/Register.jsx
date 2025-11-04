import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import { FcGoogle } from "react-icons/fc";
import Logo from "../assets/Logo.png";

const Register = () => {
  const [form, setForm] = useState({ email: "", password: "", terms: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.terms) {
      setMessage("You must agree to the Terms & Conditions.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: "http://localhost:5173/splashscreen",
        },
      });

      if (error) throw error;

      setMessage(
        "Registration successful! Please check your email to confirm your account."
      );
      console.log("User registered:", data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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

  return (
    <div className="w-full h-[630px] flex flex-col lg:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Left Section - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 py-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img
              src={Logo}
              alt="Babuji Chaay"
              className="h-28 w-28 rounded-full object-contain"
            />
          </div>

          <h1 className="text-xl font-bold mb-6 text-foreground">
            Babuji Chaay
          </h1>

          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            Create an account
          </h2>

          <form onSubmit={handleRegister} className="space-y-4 mt-6">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full border border-border rounded-lg p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                checked={form.terms}
                onChange={handleChange}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="terms" className="text-muted-foreground text-sm">
                I agree to all the Terms & Conditions
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          {message && (
            <p className="text-center text-sm text-destructive mt-4">
              {message}
            </p>
          )}

          <div className="flex items-center my-6">
            <hr className="flex-grow border-border" />
            <span className="px-2 text-muted-foreground text-sm">or</span>
            <hr className="flex-grow border-border" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center border border-border rounded-lg p-3 hover:bg-muted transition"
          >
            <FcGoogle size={20} className="mr-2" /> Continue with Google
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-secondary font-medium hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>

      {/* Right Section - Branding */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground flex-col items-center justify-center">
        <img
          src={Logo}
          alt="Babuji Chaay"
          className="h-56 w-56 object-contain drop-shadow-xl"
        />
      </div>
    </div>
  );
};

export default Register;
