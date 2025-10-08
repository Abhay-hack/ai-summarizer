import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Scissors, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="text-center mt-16 px-6">
      {/* Hero Section */}
      <motion.h2
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text"
      >
        Welcome to AI Summarizer
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mb-8 text-lg text-gray-700 max-w-2xl mx-auto"
      >
        Save time and focus on what matters. Paste your long text and get{" "}
        <span className="font-semibold text-indigo-600">instant AI-powered summaries</span> in seconds.
      </motion.p>

      {/* CTA Button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link
          to="/summarizer"
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
        >
          🚀 Try Summarizer
        </Link>
      </motion.div>

      {/* Highlights */}
      <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-6 bg-gray-50 rounded-xl shadow-md"
        >
          <FileText className="mx-auto text-blue-600" size={40} />
          <h3 className="font-bold text-lg mt-4">Handle Long Texts</h3>
          <p className="text-gray-600 text-sm mt-2">
            Upload articles, reports, or documents — AI Summarizer condenses them quickly.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-6 bg-gray-50 rounded-xl shadow-md"
        >
          <Scissors className="mx-auto text-indigo-600" size={40} />
          <h3 className="font-bold text-lg mt-4">Concise Summaries</h3>
          <p className="text-gray-600 text-sm mt-2">
            Get clear, focused, and to-the-point summaries without losing key details.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="p-6 bg-gray-50 rounded-xl shadow-md"
        >
          <Sparkles className="mx-auto text-pink-600" size={40} />
          <h3 className="font-bold text-lg mt-4">AI Powered</h3>
          <p className="text-gray-600 text-sm mt-2">
            Built with cutting-edge NLP models from Hugging Face and FastAPI backend.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
