import React, { useState, useEffect } from "react";
import "./AILoader.css";

const STATUS_MESSAGES = [
  "SYNCHRONIZING WITH NEURAL NETWORKS",
  "ANALYZING CROP PARAMETERS",
  "PROCESSING SOIL DATA MATRIX",
  "QUERYING MARKET INTELLIGENCE",
  "CALCULATING YIELD PROJECTIONS",
  "CONSULTING WEATHER MODELS",
  "CROSS-REFERENCING AGRI DATABASE",
  "GENERATING PRECISION INSIGHTS",
];

const STATUS_LOGS = [
  "> AGRIBRIDGE-AI v2.6 // INFERENCE ENGINE",
  "> DEEPSEEK-CHAT // VECTOR PROTOCOL",
  "> OPENROUTER // LLAMA-3.3-70B LOADED",
  "> KIMI-32K // CONTEXT WINDOW ACTIVE",
  "> GROQ // LLAMA-3.3-70B STANDBY",
  "> MODEL ENSEMBLE // INITIALIZED",
];

export default function AILoader({
  message = "AI PROCESSING",
  subtitle = "",
  fullPage = false,
}) {
  const [subIndex, setSubIndex] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [latency, setLatency] = useState(14);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const subTimer = setInterval(() => {
      setSubIndex((i) => (i + 1) % STATUS_MESSAGES.length);
      setLatency(Math.floor(Math.random() * 60) + 8);
    }, 2200);
    const logTimer = setInterval(() => {
      setLogIndex((i) => (i + 1) % STATUS_LOGS.length);
    }, 1500);
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => {
      clearInterval(subTimer);
      clearInterval(logTimer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div className={`ai-loader-wrap ${fullPage ? "ai-loader-fullpage" : ""}`}>
      {/* Top-right latency indicator */}
      <div className="ai-loader-latency">
        <span className="ai-loader-latency-icon">⬡</span>
        <span>LATENCY: {latency}MS</span>
      </div>

      {/* Central animated element */}
      <div className="ai-loader-center">
        {/* Speed streaks */}
        <div className="ai-loader-streaks">
          <span className="streak streak-1" />
          <span className="streak streak-2" />
          <span className="streak streak-3" />
          <span className="streak streak-4" />
        </div>

        {/* Flying leaf icon */}
        <div className="ai-loader-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Leaf body */}
            <path
              d="M8 40 C8 40 12 20 28 12 C40 6 44 8 44 8 C44 8 42 14 36 22 C28 32 14 36 8 40Z"
              fill="currentColor"
              opacity="0.9"
            />
            {/* Leaf vein */}
            <path
              d="M8 40 C16 30 28 20 40 10"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Small stem */}
            <path
              d="M8 40 C6 43 5 46 5 46"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Text block */}
      <div className="ai-loader-text">
        <h2 className="ai-loader-title">{message}{dots}</h2>
        <p className="ai-loader-subtitle">
          {subtitle || STATUS_MESSAGES[subIndex]}
        </p>
        {/* Progress bar */}
        <div className="ai-loader-bar">
          <div className="ai-loader-bar-fill" />
        </div>
      </div>

      {/* Bottom-left system status */}
      <div className="ai-loader-status">
        <div className="ai-loader-status-dot" />
        <div>
          <div className="ai-loader-status-label">SYSTEMS NOMINAL</div>
          <div className="ai-loader-status-log">{STATUS_LOGS[logIndex]}</div>
        </div>
      </div>
    </div>
  );
}
