import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoCall from "./components/VideoCall";
import Doctor from "./components/Doctor";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoCall />} />
        <Route path="/Doctor" element={<Doctor />} />
      </Routes>
    </Router>
  );
}

export default App;
