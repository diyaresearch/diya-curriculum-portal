import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import "./index.css";
import { EditContent } from "./pages/edit_content";
import Home from "./pages/home";
import { UploadContent } from "./pages/upload-content";
import ViewContent from "./pages/view-content";
import LessonGenerator from "./pages/lesson_generator";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload-content" element={<UploadContent />} />
        <Route path="/edit-content/:id" element={<EditContent />} />
        <Route path="/view-content/:UnitID" element={<ViewContent />} />
        <Route path="/lesson-generator" element={<LessonGenerator />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
