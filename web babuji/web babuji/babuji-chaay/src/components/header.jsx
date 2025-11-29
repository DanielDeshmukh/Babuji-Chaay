import React, { useState } from "react";
import { Link } from "react-router-dom";
import icon from "../assets/icon.png";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="w-full bg-[#0B3D2E] text-[#F1EBDC] fixed top-0 left-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* LOGO + NAME */}
          <Link to="/" className="flex items-center gap-2">
            <img src={icon} alt="logo" className="w-10 h-10" />
            <span className="text-xl font-extrabold tracking-wide">Babuji Chaay</span>
          </Link>

          {/* HAMBURGER */}
          <button
            className="text-3xl md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? "✖" : "☰"}
          </button>

          {/* DESKTOP MENU */}
          <nav className="hidden md:flex gap-8 text-lg font-medium">
            <Link to="/" className="hover:text-[#D6A756]">Home</Link>
            <Link to="/menu" className="hover:text-[#D6A756]">Menu</Link>
            <Link to="/franchise" className="hover:text-[#D6A756]">Franchise</Link>
            <Link to="/contact" className="hover:text-[#D6A756]">Contact</Link>
          </nav>
        </div>
      </header>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-[#0B3D2E] text-[#F1EBDC] w-full fixed top-[72px] left-0 z-40 shadow-lg">
          <nav className="flex flex-col text-center py-4 text-lg font-medium">
            <Link to="/" className="py-3" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/menu" className="py-3" onClick={() => setOpen(false)}>Menu</Link>
            <Link to="/franchise" className="py-3" onClick={() => setOpen(false)}>Franchise</Link>
            <Link to="/contact" className="py-3" onClick={() => setOpen(false)}>Contact</Link>
          </nav>
        </div>
      )}
    </>
  );
}
