"use client";

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import VirtualKeyboard from "./VirtualKeyboard"; // We will create this next

// Define the different layouts
const defaultLayout = {
  default: [
    "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
    "{tab} q w e r t y u i o p [ ] \\",
    "{lock} a s d f g h j k l ; ' {enter}",
    "{shift} z x c v b n m , . / {shift}",
    ".com @ {space}",
  ],
  shift: [
    "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
    "{tab} Q W E R T Y U I O P { } |",
    '{lock} A S D F G H J K L : " {enter}',
    "{shift} Z X C V B N M < > ? {shift}",
    ".com @ {space}",
  ],
};

const numberLayout = {
  default: ["7 8 9", "4 5 6", "1 2 3", "0 . {bksp}"],
};

// 1. Create the context
const KeyboardContext = createContext({
  activeInput: null,
  setActiveInput: () => {},
  keyboardRef: null, // To pass the keyboard's wrapper ref
});

// 2. Create a helper hook (optional but clean)
export const useKeyboard = () => useContext(KeyboardContext);

// 3. Create the Provider component
export const KeyboardProvider = ({ children }) => {
  const [activeInput, setActiveInput] = useState(null); // The DOM element
  const [layoutConfig, setLayoutConfig] = useState(defaultLayout);
  const keyboardWrapperRef = useRef(null); // Ref for the keyboard's wrapper div

  const handleClose = useCallback(() => {
    if (activeInput) {
      activeInput.blur(); // Remove focus from the input
    }
    setActiveInput(null);
  }, [activeInput]);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      // Check if it's an input/textarea and doesn't have 'data-no-keyboard'
      if (
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !target.hasAttribute("data-no-keyboard")
      ) {
        setActiveInput(target);

        // Check input type to set layout
        const inputType = target.type;
        const inputMode = target.inputMode;
        if (
          inputType === "number" ||
          inputType === "tel" ||
          inputMode === "numeric" ||
          inputMode === "decimal"
        ) {
          setLayoutConfig(numberLayout);
        } else {
          setLayoutConfig(defaultLayout);
        }
      }
    };

    const handleFocusOut = (e) => {
      // Delay to see if focus moves to another input or the keyboard
      setTimeout(() => {
        const newActiveElement = document.activeElement;
        // If the new active element is not an input, close the keyboard
        if (
          newActiveElement.tagName !== "INPUT" &&
          newActiveElement.tagName !== "TEXTAREA"
        ) {
          // Check if the new active element is *inside* the keyboard
          if (
            !keyboardWrapperRef.current ||
            !keyboardWrapperRef.current.contains(newActiveElement)
          ) {
            setActiveInput(null);
          }
        }
      }, 100); // 100ms delay
    };

    // Add global event listeners
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    // Cleanup
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []); // Run only once

  return (
    <KeyboardContext.Provider
      value={{ activeInput, setActiveInput, keyboardWrapperRef }}
    >
      {children}
      <VirtualKeyboard
        activeInput={activeInput}
        onClose={handleClose}
        layoutConfig={layoutConfig}
        ref={keyboardWrapperRef} // Pass the ref to the component
      />
    </KeyboardContext.Provider>
  );
};