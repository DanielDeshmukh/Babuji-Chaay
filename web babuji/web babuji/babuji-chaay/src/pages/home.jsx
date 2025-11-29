import { Link } from "react-router-dom";
import icon from "../assets/icon.png";
import picture from "../assets/picture.png";

export default function Home() {
  return (
    <main className="w-full bg-[#F1EBDC] min-h-screen flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="relative w-full bg-[#0B3D2E] text-[#F1EBDC] pt-24 pb-40 px-4 overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto text-center md:text-left">

          {/* CENTER ICON */}
          <img
            src={icon}
            alt="Babuji Chaay Icon"
            className="mx-auto md:mx-0 drop-shadow-xl animate-zoomFade w-20 h-20 md:w-32 md:h-32"
          />

          {/* BRAND NAME */}
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-wide mt-6 opacity-0 animate-slideUp">
            <div className="flex items-center justify-center md:justify-start">
              <img
                src={icon}
                alt="B icon"
                className="drop-shadow-md relative z-10 w-6 h-6 md:w-14 md:h-14"
                style={{ marginBottom: "3px" }}
              />
              <span className="flex items-center -ml-[6px] md:-ml-2">
                <span className="text-[#F1EBDC] font-extrabold tracking-wide">abuji</span>
                <span className="text-[#D6A756] font-extrabold tracking-wide ml-1">Chaay</span>
              </span>
            </div>
          </h1>

          {/* TAGLINE */}
          <p className="text-base md:text-xl mt-4 opacity-0 animate-slideUp delay-200">
            Brewing Happiness, One Cup at a Time
          </p>

          {/* GOLD LINE */}
          <div className="opacity-0 animate-slideUp delay-300 flex justify-center md:justify-start">
            <div className="h-[3px] w-32 bg-gradient-to-r from-[#D6A756] to-[#F1EBDC] mt-5 rounded-full"></div>
          </div>

          {/* CTA BUTTON */}
          <div className="flex justify-center md:justify-start">
            <Link
              to="/menu"
              className="mt-8 inline-block bg-[#D6A756] hover:bg-[#c99740] text-[#0B3D2E] font-semibold px-7 py-3 rounded-full shadow-lg transition-all opacity-0 animate-slideUp delay-500"
            >
              View Menu
            </Link>
          </div>

          {/* MOBILE IMAGE: shown only on small screens, placed below CTA to avoid overlap */}
          <div className="md:hidden mt-8 flex justify-center">
            <img
              src={picture}
              alt="Chai mobile"
              className="w-[70%] max-w-[300px] rounded-lg shadow-xl animate-fadeInSlow"
            />
          </div>
        </div>

        {/* DESKTOP IMAGE: absolutely positioned to the right, does not touch footer */}
        <div className="hidden md:block">
          <img
            src={picture}
            alt="Chai desktop"
            className="absolute right-8 bottom-10 w-[45%] max-w-[520px] rounded-lg shadow-xl opacity-0 animate-fadeInSlow"
            style={{ transform: "translateZ(0)" }}
          />
        </div>
      </section>

      {/* ABOUT / BRAND STORY */}
      <section className="max-w-5xl text-center mt-16 px-6 opacity-0 animate-fadeInSlow delay-700">
        <h2 className="text-3xl font-bold text-[#0B3D2E]">The Taste of Authentic Chai</h2>
        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          At Babuji Chaay, we believe in rich flavors, fresh ingredients,
          and the warmth of tradition in every sip. From hand-crafted chai
          to classic snacks, we bring you a café experience that feels like home.
        </p>
      </section>

      {/* OFFERS LINE */}
      <section className="mt-16 px-6 text-center opacity-0 animate-fadeInSlow delay-[900ms]">
        <p className="text-gray-700 italic">
          We offer exciting daily, weekly & special combos — visit in-store to enjoy!
        </p>
      </section>
    </main>
  );
}
