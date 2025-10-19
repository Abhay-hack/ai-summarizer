import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import About from "../pages/About";
import Summarizer from "../components/Summarizer";
import YoutubeSummarizer from "../pages/YoutubeSummarizer";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/summarizer" element={<Summarizer />} />
      <Route path="/youtube-summarizer" element={<YoutubeSummarizer />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
