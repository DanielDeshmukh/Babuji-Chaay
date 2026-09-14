"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Invalid credentials");
      } else {
        router.push("/home");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Left Section - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 py-8 min-h-screen">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <img
              src="/Logo.png"
              alt="Babuji Chaay"
              className="h-28 w-28 rounded-full object-contain"
            />
          </div>

          <h1 className="text-xl font-bold mb-6 text-foreground">
            Babuji Chaay
          </h1>

          <h2 className="text-2xl font-semibold mb-2 text-foreground">
            Welcome Back
          </h2>

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          {message && (
            <p className="text-center text-sm text-destructive mt-4">
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Right Section - Branding */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground flex-col items-center justify-center">
        <img
          src="/Logo.png"
          alt="Babuji Chaay"
          className="h-56 w-56 object-contain drop-shadow-xl"
        />
      </div>
    </div>
  );
}
