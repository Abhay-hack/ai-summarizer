import { motion } from "framer-motion";
import { Cpu, Zap, Globe, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold text-gray-900 mb-6 text-center"
      >
        About AI Summarizer
      </motion.h2>

      {/* Intro */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-gray-700 text-lg leading-relaxed max-w-3xl mx-auto text-center mb-12"
      >
        <b>AI Summarizer</b> is an open-source project designed to make information
        more accessible by converting lengthy text into concise and actionable
        summaries.  
        <br /><br />
        Powered by <span className="font-semibold text-blue-600">Hugging Face </span> 
        transformer models, a <span className="font-semibold text-blue-600">FastAPI backend</span>, 
        and a <span className="font-semibold text-blue-600">React + Vite frontend</span>, 
        this application demonstrates how AI can simplify knowledge without
        sacrificing clarity.
      </motion.p>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
        {[
          {
            icon: <Cpu size={36} className="mx-auto text-blue-600" />,
            title: "AI Powered",
            desc: "Leverages state-of-the-art NLP models for high-quality summaries.",
          },
          {
            icon: <Zap size={36} className="mx-auto text-purple-600" />,
            title: "Fast & Reliable",
            desc: "Optimized backend delivers results quickly and consistently.",
          },
          {
            icon: <Globe size={36} className="mx-auto text-green-600" />,
            title: "Accessible Anywhere",
            desc: "Works seamlessly across devices and browsers.",
          },
          {
            icon: <Lock size={36} className="mx-auto text-red-600" />,
            title: "Secure",
            desc: "Adheres to modern best practices to ensure data safety.",
          },
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05 }}
            className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition-shadow duration-300"
          >
            {feature.icon}
            <h3 className="font-semibold text-lg mt-4">{feature.title}</h3>
            <p className="text-gray-600 text-sm mt-2">{feature.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="mt-16 text-center"
      >
        <h3 className="text-2xl font-bold mb-3">Our Mission</h3>
        <p className="text-gray-700 max-w-2xl mx-auto mb-6">
          We believe AI should simplify knowledge, not complicate it. With AI Summarizer, 
          you can transform long articles, reports, and documents into concise summaries 
          that save time and boost productivity.
        </p>
        <Link
          to="/summarizer"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          Try Summarizer Now
        </Link>
      </motion.div>
    </div>
  );
}
