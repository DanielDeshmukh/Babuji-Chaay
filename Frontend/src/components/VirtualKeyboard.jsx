"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import "../Keyboard.css"; // Custom themed keyboard styling

const VirtualKeyboard = forwardRef(
  ({ activeInput, onClose, layoutConfig }, ref) => {
    const [layoutName, setLayoutName] = useState("default");
    const keyboardRef = useRef(null);

    // 🔹 Sync virtual keyboard with active input
    useEffect(() => {
      if (activeInput) {
        const syncKeyboardInput = () => {
          if (
            keyboardRef.current &&
            activeInput.value !== keyboardRef.current.getInput()
          ) {
            keyboardRef.current.setInput(activeInput.value);
          }
        };
        syncKeyboardInput();
        activeInput.addEventListener("input", syncKeyboardInput);
        return () => {
          activeInput.removeEventListener("input", syncKeyboardInput);
        };
      }
    }, [activeInput]);

    // 🔹 Highlight keys when physical keyboard pressed
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (!e?.key) return; // ✅ Prevent undefined key crash
        const key = e.key.toLowerCase();
        const button = keyboardRef.current?.keyboardDOM?.querySelector(
          `.hg-button[data-skbtn="${key}"]`
        );
        if (button) button.classList.add("key-active");
      };

      const handleKeyUp = (e) => {
        if (!e?.key) return; // ✅ Prevent undefined key crash
        const key = e.key.toLowerCase();
        const button = keyboardRef.current?.keyboardDOM?.querySelector(
          `.hg-button[data-skbtn="${key}"]`
        );
        if (button) button.classList.remove("key-active");
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    // 🔹 Handle input change via keyboard
    const onChange = (input) => {
      if (activeInput) {
        activeInput.value = input;
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    // 🔹 Handle layout toggles and enter
    const onKeyPress = (button) => {
      if (button === "{shift}" || button === "{lock}") {
        setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
      }
      if (button === "{enter}") {
        onClose();
      }
    };

    const isVisible = !!activeInput;

    // 🧠 Prevent blur when clicking inside keyboard
    const handleMouseDown = (e) => {
      if (ref.current && ref.current.contains(e.target)) {
        e.stopPropagation();
      }
    };

    return (
      <div
        ref={ref}
        className={`fixed bottom-0 left-0 w-full transition-transform duration-300 ease-in-out z-[9999] ${
          isVisible ? "translate-y-0" : "translate-y-[100%]"
        }`}
        aria-hidden={!isVisible}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-[var(--card)] shadow-2xl p-3 rounded-t-2xl backdrop-blur-md bg-opacity-90">
          <Keyboard
            keyboardRef={(r) => (keyboardRef.current = r)}
            onChange={onChange}
            onKeyPress={onKeyPress}
            layout={layoutConfig}
            layoutName={layoutName}
            theme="hg-theme-default hg-layout-default glassy-theme"
            display={{
              "{bksp}": "⌫",
              "{enter}": "⏎",
              "{shift}": "⇧",
              "{lock}": "⇪",
              "{tab}": "⇥",
              "{space}": "Space",
            }}
          />
        </div>
      </div>
    );
  }
);

VirtualKeyboard.displayName = "VirtualKeyboard";
export default VirtualKeyboard;
