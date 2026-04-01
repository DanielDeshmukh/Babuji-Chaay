"use client";

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import VirtualKeyboard from "./VirtualKeyboard";

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

const KeyboardContext = createContext({
  activeInput: null,
  setActiveInput: () => {},
  keyboardRef: null,
});

export const useKeyboard = () => useContext(KeyboardContext);

export const KeyboardProvider = ({ children }) => {
  const [activeInput, setActiveInput] = useState(null);
  const [layoutConfig, setLayoutConfig] = useState(defaultLayout);
  const keyboardWrapperRef = useRef(null);

  const handleClose = useCallback(() => {
    if (activeInput) activeInput.blur();
    setActiveInput(null);
  }, [activeInput]);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;

      if (!(target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (target.hasAttribute("data-no-keyboard")) return;

      // 🚫 Skip calendar/date-like inputs
      const skipTypes = ["date", "datetime-local", "month", "time", "week"];
      if (skipTypes.includes(target.type)) return;

      setActiveInput(target);

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
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const newActive = document.activeElement;
        if (
          !keyboardWrapperRef.current?.contains(newActive) &&
          newActive.tagName !== "INPUT" &&
          newActive.tagName !== "TEXTAREA"
        ) {
          setActiveInput(null);
        }
      }, 100);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    // 🧩 Prevent blur when clicking inside keyboard
    const handleGlobalMouseDown = (e) => {
      if (
        keyboardWrapperRef.current &&
        keyboardWrapperRef.current.contains(e.target)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("mousedown", handleGlobalMouseDown, true);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("mousedown", handleGlobalMouseDown, true);
    };
  }, []);

  return (
    <KeyboardContext.Provider
      value={{ activeInput, setActiveInput, keyboardWrapperRef }}
    >
      {children}
      <VirtualKeyboard
        activeInput={activeInput}
        onClose={handleClose}
        layoutConfig={layoutConfig}
        ref={keyboardWrapperRef}
      />
    </KeyboardContext.Provider>
  );
};
