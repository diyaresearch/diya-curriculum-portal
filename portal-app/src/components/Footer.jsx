import React from "react";

const Footer = () => {
    return (
      <footer
        style={{
          backgroundColor: "#1f2937",
          width: "100%",
          color: "white",
          textAlign: "center",
          padding: "20px 10px",
          fontFamily: "Open Sans, sans-serif",
          fontSize: "14px",
        }}
      >
        <div style={{padding: "10px 10px"}}>DIYA Research Inc is a 501(c)(3) nonprofit organization</div>
        <div style={{padding: "10px 10px"}}>Tax ID# 85-3774771</div>
        <div style={{padding: "10px 10px"}}>© Copyright 2023 DIYA Research Inc. All Rights Reserved.</div>
      </footer>
    );
  };
  
  export default Footer;