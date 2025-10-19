import React, { useState, useCallback, memo } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = import.meta.env.VITE_API_URL;

const YoutubeSummarizer = memo(() => {
  const [url, setUrl] = useState("");
  const [segments, setSegments] = useState([]);
  const [originalLang, setOriginalLang] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);  // For loading bar
  const [expandedSegments, setExpandedSegments] = useState(new Set());  // Track expanded segments
  const [videoId, setVideoId] = useState("");  // Store video ID for timestamps and thumbnail

  const validateYouTubeUrl = useCallback((inputUrl) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(inputUrl);
  }, []);

  const extractVideoId = useCallback((inputUrl) => {
    const match = inputUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!url) {
      setError("Please enter a YouTube video link");
      return;
    }
    if (!validateYouTubeUrl(url)) {
      setError("Please enter a valid YouTube video link");
      return;
    }
    setLoading(true);
    setSegments([]);
    setOriginalLang("");
    setError("");
    setProgress(0);
    setExpandedSegments(new Set());  // Reset expanded state
    const extractedId = extractVideoId(url);
    setVideoId(extractedId || "");
    try {
      // Simulate progress (update in real app with backend websocket if needed)
      const interval = setInterval(() => setProgress((p) => Math.min(p + 20, 80)), 500);
      const res = await axios.post(`${API_URL}/youtube-summarize`, { url });
      clearInterval(interval);
      setProgress(100);
      if (res.data.segments) {
        setSegments(res.data.segments);
      } else if (res.data.summary) {
        setSegments([{ start_time: "0:00", end_time: "End", summary: res.data.summary }]);
      }
      if (res.data.original_lang) {
        setOriginalLang(res.data.original_lang.toUpperCase());
        if (res.data.original_lang !== 'en') {
          setError(
            `Summary generated from ${res.data.original_lang.toUpperCase()} transcript. ` +
            `Results may vary since the summarizer is English-focused—consider translating for better accuracy.`
          );
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Failed to fetch video captions or summary";
      setError(errorMsg);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);  // Fade out progress
    }
  }, [url, validateYouTubeUrl, extractVideoId]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleSummarize();
      }
    },
    [handleSummarize]
  );

  const clearError = useCallback(() => setError(""), []);

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!", {
        position: "bottom-left",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    });
  }, []);

  const toggleSegment = useCallback((index) => {
    setExpandedSegments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const jumpToTimestamp = useCallback((startTimeStr) => {
    if (!videoId) return;
    const [minutes, seconds] = startTimeStr.split(':').map(Number);
    const timestampSeconds = minutes * 60 + seconds;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&t=${timestampSeconds}s`;
    window.open(videoUrl, '_blank');
  }, [videoId]);

  return (
    <div className="overflow-auto">
      <div className="w-full h-full flex flex-col p-4">
        {/* Header */}
        <header className="text-center py-8 flex-shrink-0">
          <h1 className="text-4xl  font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700 bg-clip-text text-transparent mb-4">
            YouTube Video Summarizer
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Paste a link to get instant, structured summaries with timestamps.
          </p>
        </header>

        {/* Input Form */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <div className="w-full max-w-3xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="Paste YouTube video link here..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    clearError();
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full border-2 border-gray-200 rounded-lg px-5 py-4 text-lg focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                  aria-label="YouTube video URL"
                  disabled={loading}
                />
                {videoId && (
                  <div className="flex justify-center">
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="rounded-xl shadow-lg max-w-xs mx-auto transform hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <button
                  onClick={handleSummarize}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
                  aria-label="Summarize video"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Get Summary
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-center text-xs text-white"
                      style={{ width: `${progress}%` }}
                    >
                      {progress === 100 ? "Complete!" : `${progress}%`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error/Warning */}
        {error && (
          <div className="mx-4 mb-6 p-5 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-yellow-800 rounded-2xl text-base shadow-md">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {segments.length > 0 && (
          <div className="flex-1 px-4 pb-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Structured Summary</h2>
                <button
                  onClick={() => handleCopy(segments.map(s => `${s.start_time}-${s.end_time}: ${s.summary}`).join('\n'))}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm flex items-center transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  📋 Copy All
                </button>
              </div>
              {originalLang && (
                <p className="text-sm text-gray-600 italic bg-gray-50/50 p-3 rounded-lg backdrop-blur-sm">
                  Original transcript language: <span className="font-bold text-indigo-600">{originalLang}</span>
                </p>
              )}
              <div className="grid gap-6">
                {segments.map((segment, index) => (
                  <div
                    key={index}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="p-8">
                      <h3 className="font-bold text-xl text-gray-900 mb-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => jumpToTimestamp(segment.start_time)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center transition-all duration-200"
                            title={`Jump to ${segment.start_time}`}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {segment.start_time} - {segment.end_time}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(segment.summary);
                            }}
                            className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all duration-200"
                            title="Copy summary"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => toggleSegment(index)}
                            className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all duration-200"
                            title={expandedSegments.has(index) ? "Collapse" : "Expand"}
                          >
                            {expandedSegments.has(index) ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </h3>
                      <div className={expandedSegments.has(index) ? "block" : "hidden"}>
                        <p className="text-gray-700 leading-relaxed text-lg">{segment.summary}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="bottom-left"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
});

YoutubeSummarizer.displayName = "YoutubeSummarizer";

export default YoutubeSummarizer;