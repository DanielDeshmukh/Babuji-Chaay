import React from "react";

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-primary text-primary-foreground text-sm shadow-inner border-t border-muted/40 transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col sm:flex-row items-center justify-around">
        <p className="text-center sm:text-left tracking-wide font-medium">
          &copy; {new Date().getFullYear()} <span className="font-semibold">Babuji Chaay</span>. All rights reserved.
        </p>
        
      </div>
    </footer>
  );
};

export default Footer;
