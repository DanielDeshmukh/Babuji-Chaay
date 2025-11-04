"use client";

import { useEffect, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import supabase from "../lib/supabaseClient";

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [user, setUser] = useState(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchUser = async () => {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!error && user) setUser(user);
      };
      fetchUser();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      let key = null;
      if (e.key >= "0" && e.key <= "9") key = e.key;
      else if (e.key === "Enter") key = "enter";
      else if (e.key === "Backspace") key = "clear";

      if (key) {
        setActiveKey(key);
        handleKeyPress(key);
        setTimeout(() => setActiveKey(null), 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin]);

  const handleVerify = async () => {
    if (!pin.trim()) {
      setMessage("Please enter your PIN.");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("pin")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.pin?.toString() === pin) {
        setMessage("Verification successful!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        setMessage("Incorrect PIN. Try again.");
        setPin("");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (value) => {
    if (value === "clear") setPin("");
    else if (value === "enter") handleVerify();
    else if (pin.length < 4) setPin((prev) => prev + value);
  };

  if (!isOpen) return null;

  const buttonClass = (key) =>
    `py-4 rounded-xl text-xl font-bold shadow-md active:scale-95 transition ${
      activeKey === key ? "bg-yellow-500 text-green-900" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-4 sm:mb-6">
          Enter Verification PIN
        </h2>

        {user ? (
          <>
            {/* PIN Input */}
            <div className="relative w-full border border-primary rounded-lg py-3 px-10 text-center text-2xl tracking-[1rem] bg-background text-foreground">
              {showPin ? pin : pin.replace(/./g, "•")}
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground hover:text-accent"
              >
                {showPin ? <FiEyeOff size={22} /> : <FiEye size={22} />}
              </button>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setActiveKey(num.toString());
                    handleKeyPress(num.toString());
                    setTimeout(() => setActiveKey(null), 150);
                  }}
                  className={`bg-primary hover:bg-accent text-background ${buttonClass(
                    num.toString()
                  )}`}
                  disabled={loading}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => {
                  setActiveKey("clear");
                  handleKeyPress("clear");
                  setTimeout(() => setActiveKey(null), 150);
                }}
                className={`bg-gray-400 hover:bg-gray-500 text-background text-lg font-semibold ${buttonClass(
                  "clear"
                )}`}
                disabled={loading}
              >
                Clear
              </button>

              <button
                onClick={() => {
                  setActiveKey("0");
                  handleKeyPress("0");
                  setTimeout(() => setActiveKey(null), 150);
                }}
                className={`bg-primary hover:bg-accent text-background ${buttonClass("0")}`}
                disabled={loading}
              >
                0
              </button>

              <button
                onClick={() => {
                  setActiveKey("enter");
                  handleKeyPress("enter");
                  setTimeout(() => setActiveKey(null), 150);
                }}
                className={`bg-yellow-500 hover:bg-yellow-600 text-green-900 text-lg font-semibold ${buttonClass(
                  "enter"
                )}`}
                disabled={loading}
              >
                {loading ? "..." : "Enter"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-foreground">
            Please log in to continue.
          </p>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-foreground">{message}</p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
