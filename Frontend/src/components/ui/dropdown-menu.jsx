import { useState } from "react"

export function DropdownMenu({ children }) {
  return <div className="relative inline-block">{children}</div>
}

export function DropdownMenuTrigger({ children, onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-lg bg-[#afa4e9] hover:opacity-90 transition">
      {children}
    </button>
  )
}

export function DropdownMenuContent({ children }) {
  return (
    <div className="absolute mt-2 w-40 rounded-lg bg-[#1c1c1c] border border-[#333] shadow-lg p-2 z-50">
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick }) {
  return (
    <div
      onClick={onClick}
      className="px-3 py-2 rounded-md hover:bg-[#2b2b2b] cursor-pointer text-[#f7e592]"
    >
      {children}
    </div>
  )
}
