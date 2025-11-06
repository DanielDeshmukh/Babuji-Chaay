"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
// Make sure this path is correct for your project
import "../Keyboard.css"; // Or wherever you placed the CSS

// Use forwardRef to pass the ref from the Provider to the DOM element
const VirtualKeyboard = forwardRef(
  ({ activeInput, onClose, layoutConfig }, ref) => {
    const [layoutName, setLayoutName] = useState("default");
    const keyboardRef = useRef(null);

    // This effect syncs the virtual keyboard's display
    // with the input's value (e.g., from physical typing)
    useEffect(() => {
      if (activeInput) {
        // Function to update the keyboard's internal input
        const syncKeyboardInput = () => {
          if (keyboardRef.current && activeInput.value !== keyboardRef.current.getInput()) {
            keyboardRef.current.setInput(activeInput.value);
          }
        };

        // Set initial value
        syncKeyboardInput();

        // Add listener for physical key presses
        activeInput.addEventListener("input", syncKeyboardInput);

        // Cleanup
        return () => {
          activeInput.removeEventListener("input", syncKeyboardInput);
        };
      }
    }, [activeInput]);

    // Handle virtual key presses
    const onChange = (input) => {
      if (activeInput) {
        // Update the DOM element's value
        activeInput.value = input;
        
        // Dispatch an 'input' event to notify React
        // This is the key to making it work with controlled components
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    const onKeyPress = (button) => {
      if (button === "{shift}" || button === "{lock}") {
        setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
      }
      
      if (button === "{enter}") {
        onClose(); // Close keyboard on enter
      }
    };

    const isVisible = !!activeInput;

    return (
      <div
        ref={ref} // Attach the forwarded ref here
        className={`fixed bottom-0 left-0 w-full transition-transform duration-300 ease-in-out z-[9999] ${
          isVisible ? "translate-y-0" : "translate-y-[100%]"
        }`}
        aria-hidden={!isVisible}
        // Prevent focusout when clicking on the keyboard
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="bg-card border-t border-border shadow-2xl p-2 rounded-t-2xl">
          <Keyboard
            keyboardRef={(r) => (keyboardRef.current = r)}
            onChange={onChange}
            onKeyPress={onKeyPress}
            layout={layoutConfig} // Use the layout from props
            layoutName={layoutName}
            theme="hg-theme-default hg-layout-default"
            display={{
              "{bksp}": "⌫",
              "{enter}": "⏎",
              "{shift}": "⇧",
              "{lock}": "⇪",
              "{tab}": "⇥",
              "{space}": "Space",
            }}
          />
          <button
            onClick={onClose}
            className="mt-2 w-full bg-primary text-background rounded-xl py-2 text-sm font-semibold"
          >
            Close Keyboard
          </button>
        </div>
      </div>
    );
  }
);

VirtualKeyboard.displayName = "VirtualKeyboard"; // for React DevTools
export default VirtualKeyboard;