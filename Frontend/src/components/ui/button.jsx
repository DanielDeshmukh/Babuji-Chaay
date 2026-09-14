export function Button({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg bg-[#64dcff] hover:opacity-90 transition ${className}`}
    >
      {children}
    </button>
  )
}
