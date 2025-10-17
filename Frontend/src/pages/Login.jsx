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

  const navigate = useNavigate();

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      navigate("/home");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("OTP sent to your email!");
      setMode("otp");
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "magiclink" });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row overflow-hidden">
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center px-6 sm:px-10 py-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img src={Logo} alt="Babuji Chaay" className="h-20 rounded-full w-20 object-contain" />
          </div>

          <div className="flex items-center justify-center lg:justify-start mb-6">
            <h1 className="text-xl font-bold text-gray-800">Babuji Chaay</h1>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center lg:text-left">
            {mode === "login"
              ? "Welcome Back"
              : mode === "forgot"
              ? "Forgot Password"
              : "Enter OTP"}
          </h2>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4 mt-6">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
              />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E4B2E] text-white p-3 rounded-lg hover:bg-[#163a23] transition"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>

              <p
                className="text-sm text-[#1E4B2E] cursor-pointer mt-2"
                onClick={() => setMode("forgot")}
              >
                Forgot password?
              </p>
              <p
                className="text-sm text-[#1E4B2E] cursor-pointer mt-2"
                onClick={() => { navigate('/')} }
              >
                New User?
              </p>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-6">
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E4B2E] text-white p-3 rounded-lg hover:bg-[#163a23] transition"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>

              <p
                className="text-sm text-gray-600 cursor-pointer mt-2"
                onClick={() => setMode("login")}
              >
                Back to Login
              </p>
            </form>
          ) : (
            <form onSubmit={handleOtpLogin} className="space-y-4 mt-6">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#1E4B2E]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E4B2E] text-white p-3 rounded-lg hover:bg-[#163a23] transition"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <p
                className="text-sm text-gray-600 cursor-pointer mt-2"
                onClick={() => setMode("login")}
              >
                Back to Login
              </p>
            </form>
          )}

          {mode === "login" && (
            <>
              <div className="flex items-center my-6">
                <hr className="flex-grow border-gray-300" />
                <span className="px-2 text-gray-500 text-sm">or</span>
                <hr className="flex-grow border-gray-300" />
              </div>

              <button className="w-full flex items-center justify-center border rounded-lg p-3 hover:bg-gray-100 transition">
                <FcGoogle size={20} className="mr-2" /> Google
              </button>
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-[#1E4B2E] text-white flex-col items-center justify-center">
        <img src={Logo} alt="Babuji Chaay" className="h-56 w-56 object-contain" />
      </div>
    </div>
  );
};

export default Login;
