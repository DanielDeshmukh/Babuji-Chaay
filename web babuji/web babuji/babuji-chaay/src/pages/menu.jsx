export default function Menu() {
  const menuItems = [
    "Special Chai",
    "Masala Chai",
    "Elaichi Chai",
    "Lemon Tea",
    "Cold Coffee",
    "Pasta",
    "Burger",
    "Sandwich",
    "Maggie",
    "Rolls",
    "Snacks",
  ];

  return (
    <main className="pt-24 bg-[#F1EBDC] min-h-screen px-6">

      <h1 className="text-3xl font-bold text-center text-[#0B3D2E] mb-10">
        Our Menu
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-6xl mx-auto">

        {menuItems.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center text-center hover:shadow-xl transition"
          >
            <div className="w-full h-28 bg-gray-200 rounded-lg mb-3">
              {/* placeholder for future images */}
            </div>
            <p className="font-semibold text-[#0B3D2E]">{item}</p>
          </div>
        ))}

      </div>

    </main>
  );
}
