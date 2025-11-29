export default function Footer() {
  return (
    <footer className="bg-[#0B3D2E] text-[#F1EBDC] mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center">
        <div className="text-center md:text-left">
          <p className="font-bold">Babuji Chaay</p>
          <p className="text-sm mt-1">Brewing Happiness • Fresh chai, fresh smiles</p>
        </div>

        <div className="mt-4 md:mt-0 text-sm text-[#D6A756]">
          © {new Date().getFullYear()} Babuji Chaay. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
