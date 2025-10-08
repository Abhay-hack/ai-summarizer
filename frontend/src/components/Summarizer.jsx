import { useState } from "react";

export default function Summarizer() {
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleSummarize = async () => {
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch(`${API_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setSummary(data.summary || data.error);
    } catch (err) {
      setSummary("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  const handleClear = () => {
    setText("");
    setSummary("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 rounded-xl shadow-xl bg-white transition-all duration-300">
      <h1 className="text-4xl font-extrabold mb-6 text-blue-800 text-center">
        AI Summarizer
      </h1>

      <textarea
        className="w-full p-4 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 resize-none"
        rows={8}
        placeholder="✍️ Paste or type your text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex justify-between items-center mb-4 text-gray-500 text-sm">
        <span>Word Count: {text.split(" ").filter(Boolean).length}</span>
        <button
          onClick={handleClear}
          className="text-red-500 hover:underline disabled:opacity-50 transition"
          disabled={!text && !summary}
        >
          Clear
        </button>
      </div>

      <button
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 transition-all duration-200"
        onClick={handleSummarize}
        disabled={loading || !text}
      >
        {loading ? "⏳ Summarizing..." : "✨ Summarize"}
      </button>

      {summary && (
        <div className="mt-6 p-5 rounded-lg bg-blue-50 border border-blue-100 relative transition-all duration-300">
          <h2 className="font-semibold mb-2 text-lg text-blue-800">📌 Summary:</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>

          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 px-3 py-1 text-sm bg-blue-200 hover:bg-blue-300 rounded-lg transition"
          >
            {copied ? "✅ Copied" : "📋 Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
