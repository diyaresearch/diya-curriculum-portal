import React from "react";

const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="text-white text-xl">DIYA Curriculum Portal</div>
      <div className="space-x-4 text-white">
        <a href="#about" className="hover:underline">
          About Us
        </a>
        <a href="#resources" className="hover:underline">
          Resources
        </a>
        <a href="#contact" className="hover:underline">
          Contact Us
        </a>
      </div>
      <button className="bg-white text-gray-800 px-4 py-2 rounded">
        Sign in with Google
      </button>
    </nav>
  );
};

export default Navbar;
