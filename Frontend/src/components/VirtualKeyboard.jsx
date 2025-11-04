"use client";
import React, { useState, useEffect, useRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

const VirtualKeyboard = ({ activeInput, setActiveInput }) => {
  const [layoutName, setLayoutName] = useState("default");
  const keyboardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeInput) {
      keyboardRef.current?.setInput(activeInput.value);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [activeInput]);

  const onChange = (input) => {
    if (activeInput) {
      activeInput.value = input;
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const onKeyPress = (button) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
    }
    if (button === "{enter}") setVisible(false);
  };

  // Map real keyboard keypresses to the virtual keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeInput) return;
      if (e.key === "Shift") {
        setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
      }
      keyboardRef.current?.setInput(activeInput.value);
    };
    const handleKeyUp = () => {
      if (layoutName === "shift") setLayoutName("default");
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeInput, layoutName]);

  return (
    <div
      className={`fixed bottom-0 left-0 w-full transition-transform duration-500 z-50 
        ${visible ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] shadow-2xl p-2">
        <Keyboard
          keyboardRef={(r) => (keyboardRef.current = r)}
          onChange={onChange}
          onKeyPress={onKeyPress}
          layoutName={layoutName}
          theme="hg-theme-default hg-layout-default"
        />
        <button
          onClick={() => {
            setVisible(false);
            setActiveInput(null);
          }}
          className="mt-2 w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl py-2 text-sm font-semibold"
        >
          Close Keyboard
        </button>
      </div>
    </div>
  );
};

export default VirtualKeyboard;
