"use client";

import { useEffect, useState, useCallback } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (pin.length !== 4) {
      setMessage("PIN must be 4 digits.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/profile");
      const data = await res.json();

      if (data.profile?.pin?.toString() === pin) {
        setMessage("Verification successful!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        setMessage("Incorrect PIN. Try again.");
        setPin("");
      }
    } catch {
      setMessage("An error occurred during verification.");
    } finally {
      setLoading(false);
    }
  }, [pin, onSuccess, onClose]);

  const handleKeyPress = useCallback(
    (value: string) => {
      if (value === "clear") {
        setPin("");
      } else if (value === "enter") {
        handleVerify();
      } else if (pin.length < 4 && value >= "0" && value <= "9") {
        setPin((prev) => prev + value);
      }
    },
    [pin, handleVerify]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let key: string | null = null;
      if (e.key >= "0" && e.key <= "9") key = e.key;
      else if (e.key === "Enter") key = "enter";
      else if (e.key === "Backspace" || e.key === "Delete") key = "clear";

      if (key) {
        setActiveKey(key);
        handleKeyPress(key);
        setTimeout(() => setActiveKey(null), 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyPress]);

  if (!isOpen) return null;

  const buttonClass = (key: string) =>
    `py-4 rounded-xl text-xl font-bold shadow-md active:scale-95 transition ${
      activeKey === key ? "bg-yellow-500 text-green-900" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition"
        >
          &#x2715;
        </button>

        <h2 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-4 sm:mb-6">
          Enter Verification PIN
        </h2>

        <div className="relative w-full border border-primary rounded-lg py-3 px-10 text-center text-2xl tracking-[1rem] bg-background text-foreground">
          {showPin ? pin : pin.replace(/./g, "\u2022")}
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground hover:text-accent transition"
          >
            {showPin ? <FiEyeOff size={22} /> : <FiEye size={22} />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => {
                setActiveKey(num.toString());
                handleKeyPress(num.toString());
                setTimeout(() => setActiveKey(null), 150);
              }}
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${buttonClass(num.toString())}`}
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
            className={`bg-gray-400 hover:bg-gray-500 text-white text-lg font-semibold ${buttonClass("clear")}`}
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
            className={`bg-primary hover:bg-primary/90 text-primary-foreground ${buttonClass("0")}`}
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
            className={`bg-yellow-500 hover:bg-yellow-600 text-green-900 text-lg font-semibold ${buttonClass("enter")}`}
            disabled={loading || pin.length !== 4}
          >
            {loading ? "..." : "Enter"}
          </button>
        </div>

        {message && (
          <p
            className={`mt-4 text-center text-sm ${
              message.includes("Incorrect") ? "text-red-500" : "text-foreground"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
