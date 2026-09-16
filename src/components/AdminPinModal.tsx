"use client";

import { useState, useEffect, useCallback } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const ADMIN_PIN = "6969";

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminPinModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminPinModalProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleVerify = useCallback(() => {
    if (pin.length !== 4) {
      setMessage("PIN must be 4 digits.");
      return;
    }

    setLoading(true);
    setMessage("");

    setTimeout(() => {
      if (pin === ADMIN_PIN) {
        setMessage("Access granted!");
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else {
        setMessage("Incorrect PIN. Try again.");
        setPin("");
      }
      setLoading(false);
    }, 300);
  }, [pin, onSuccess]);

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

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const buttonClass = (key: string) =>
    `py-4 rounded-xl text-xl font-bold shadow-md active:scale-95 transition ${
      activeKey === key ? "bg-yellow-500 text-green-900" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm bg-card rounded-2xl p-5 sm:p-8 shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition"
        >
          ✕
        </button>

        <h2 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-4 sm:mb-6">
          Enter Admin PIN
        </h2>

        <div className="relative w-full border border-primary rounded-lg py-3 px-10 text-center text-2xl tracking-[1rem] bg-background text-foreground">
          {showPin ? pin : pin.replace(/./g, "•")}
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground hover:text-primary transition"
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
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${buttonClass(
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
            className="bg-muted hover:bg-muted/80 text-foreground text-lg font-semibold rounded-xl py-4 shadow-md active:scale-95 transition"
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
            className="bg-yellow-500 hover:bg-yellow-600 text-green-900 text-lg font-semibold rounded-xl py-4 shadow-md active:scale-95 transition disabled:opacity-50"
            disabled={loading || pin.length !== 4}
          >
            {loading ? "..." : "Enter"}
          </button>
        </div>

        {message && (
          <p
            className={`mt-4 text-center text-sm ${
              message === "Incorrect PIN. Try again."
                ? "text-red-500"
                : "text-green-500"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
