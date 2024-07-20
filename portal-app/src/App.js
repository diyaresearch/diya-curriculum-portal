import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import "./index.css";
import { EditContent } from "./pages/edit_content";
import Home from "./pages/home";
import { UploadContent } from "./pages/upload-content";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload-content" element={<UploadContent />} />
        <Route path="/edit-content/:id" element={<EditContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
