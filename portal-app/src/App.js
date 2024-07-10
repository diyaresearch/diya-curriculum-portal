import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import "./index.css";
import Home from "./pages/Home";
import { UploadContent } from "./pages/upload-content";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" exact element={<Home />} />
        <Route path="/upload-content" element={<UploadContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
