import React from "react";
import { useEffect, useState } from "react";
import useUserData from "../hooks/useUserData";
import logo from "../assets/DIYA_Logo.png";

// Define the users collection
const SCHEMA_QUALIFIER = `${process.env.REACT_APP_DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_USERS =  SCHEMA_QUALIFIER + "users"; 

console.log('table users is', TABLE_USERS)

const Navbar = () => {
  const { user, userData, handleGoogleAuth, handleSignOut, loading } = useUserData();

  return (
    <nav style={{ width: "100%" }} 
    className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <a href="https://diya-research.org" target="_blank" rel="noopener noreferrer"> 
          <img
          src={logo}
          alt="Logo"
          style={{ height: "113px", width: "90px" }}
          />
        </a> 
      </div>

      <div className="space-x-4 text-white">
        <a
          href="https://curriculum-portal-1ce8f.web.app/" // Added a link to DIYA Ed Portal 
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{
            fontSize: "18px",
            fontWeight: "400",
            fontFamily: "Open Sans, sans-serif",
            letterSpacing: "1.5px",
            textUnderlineOffset: "20px", 
            padding: "0px 20px",
          }}
        >
          Home 
        </a>
        <div className="relative group inline-block">
          <a
            href="#"
            className="hover:underline group-hover:underline"
            style={{
              fontSize: "18px",
              fontWeight: "400",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1.5px",
              textUnderlineOffset: "20px",
              padding: "0px 20px",
            }}
          >
            For Educators
          </a>
          {/* Dropdown menu */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 mt-0 hidden group-hover:block hover:block"
            style={{
              padding: "20px 0px",
              margin: "auto",
              zIndex: 20,
              overflow: "hidden",
              minWidth: "180px"
            }}
          >
            <a
              href="https://diya-research.org/2025-teacher-nomination-form/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Nominations
            </a>
            <a
              href="https://diya-research.org/professional-development-workshop/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              PD Workshop
            </a>
            <a
              href="https://diya-research.org/ai-ambassador-program/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Ambassador
            </a>
          </div>
        </div>
        <div className="relative group inline-block">
          <a
            href="#"
            className="hover:underline group-hover:underline"
            style={{
              fontSize: "18px",
              fontWeight: "400",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1.5px",
              textUnderlineOffset: "20px",
              padding: "0px 20px",
            }}
          >
            For Students
          </a>
          <div
            className="absolute left-1/2 transform -translate-x-1/2 mt-0 hidden group-hover:block hover:block"
            style={{
              padding: "20px 0px",
              margin: "auto",
              zIndex: 20,
              overflow: "hidden",
              minWidth: "180px"
            }}
          >
            <a
              href="https://diya-research.org/ai-exploration/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Exploration
            </a>
            <a
              href="https://diya-research.org/python-for-ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Python for AI
            </a>
            <a
              href="https://diya-research.org/ai-insights/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Insights
            </a>
            <a
              href="https://diya-research.org/ai-forge/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Forge
            </a>
            <a
              href="https://diya-research.org/ai-research/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              AI Research
            </a>
            <a
              href="https://diya-research.org/student-showcases/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              Showcases
            </a>
            <a
              href="https://diya-research.org/diya-club-for-high-school/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-white bg-[#1C418A] hover:bg-gray-500"
              style={{
                fontSize: "18px",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              DIYA Club
            </a>
          </div>
        </div>
        <a
          href="https://diya-research.org/contact-us/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{
            fontSize: "18px",
            fontWeight: "400",
            fontFamily: "Open Sans, sans-serif",
            letterSpacing: "1.5px",
            textUnderlineOffset: "20px", 
            padding: "0px 20px",
          }}
        >
          Contact Us
        </a>
      </div>

      <div>
        {!user ? (
          <>
            <button
              onClick={handleGoogleAuth}
              className="bg-white text-gray-800 px-4 py-2 rounded mr-2"
            >
              Sign in
            </button>
            <button
              onClick={handleGoogleAuth}
              className="bg-white text-gray-800 px-4 py-2 rounded"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            <span className="text-white mr-4">
              Welcome {userData?.fullName}, logged in as{" "}
              {userData?.role}.
            </span>
            <button
              onClick={handleSignOut}
              className="bg-white text-gray-800 px-4 py-2 rounded"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
