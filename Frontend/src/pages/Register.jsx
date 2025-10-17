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
          emailRedirectTo: "http://localhost:5173/splashscreen", // redirect after confirm
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
    <div className="w-full h-[630px]   flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col justify-center  items-center px-6 sm:px-10 py-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img
              src={Logo}
              alt="Babuji Chaay"
              className="h-28 w-28 rounded-full object-contain"
            />
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-6">
            Babuji Chaay
          </h1>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
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
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                checked={form.terms}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label htmlFor="terms" className="text-gray-600 text-sm">
                I agree to all the Terms & Conditions
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E4B2E] text-white p-3 rounded-lg hover:bg-[#163a23] transition disabled:opacity-50"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          {message && (
            <p className="text-center text-sm text-red-600 mt-4">{message}</p>
          )}

          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-300" />
            <span className="px-2 text-gray-500 text-sm">or</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center border rounded-lg p-3 hover:bg-gray-100 transition"
          >
            <FcGoogle size={20} className="mr-2" /> Continue with Google
          </button>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-[#1E4B2E] font-medium">
              Log in
            </a>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-[#1E4B2E] text-white flex-col  items-center justify-center">
        <img src={Logo} alt="Babuji Chaay" className="h-56 w-56 object-contain" />
      </div>
    </div>
  );
};

export default Register;
