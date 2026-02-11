"use client";
import React, { useState, useEffect } from 'react';
import { IoServerOutline } from "react-icons/io5";
import { BiLoaderAlt } from "react-icons/bi";
import { BsLightningFill } from "react-icons/bs";

const messages = [
  "Waking up the server...",
  "Getting things ready for you...",
  "Brewing some coffee...",
  "Almost there! Spinning up resources...",
  "Finalizing server startup...",
  "Making it snappy. Just a sec...",
  "Thanks for your patience!"
];

const RunningServer = () => {
  const [messageIdx, setMessageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx((idx) => (idx + 1) % messages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center min-h-screen z-50">
      <div className="flex flex-col items-center gap-6 shadow-xl px-10 py-8 rounded-3xl backdrop-blur-sm bg-card border border-border">
        <div className="relative flex items-center justify-center group">
          <IoServerOutline className="w-20 h-20 text-primary animate-pulse drop-shadow-xl transition-transform duration-300 scale-105 group-hover:scale-110 group-hover:text-primary-hover" />
          <span className="absolute -bottom-4 -right-4 animate-spin">
            <BiLoaderAlt className="w-9 h-9 text-primary drop-shadow-xl" />
          </span>
          <span className="absolute -top-4 -left-4 animate-flicker text-yellow-400 text-2xl drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]">
            <BsLightningFill />
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-extrabold text-foreground tracking-wide drop-shadow">
            Starting Server
            <span className="ml-2 inline-block animate-bounce text-primary text-3xl">.</span>
            <span className="inline-block animate-bounce2 text-primary/80 text-3xl">.</span>
            <span className="inline-block animate-bounce3 text-primary/60 text-3xl">.</span>
          </h2>
          <p className="text-muted-foreground font-medium min-h-[1.5em] transition-all duration-300 text-lg" key={messageIdx}>
            {messages[messageIdx]}
          </p>
        </div>

        <div className="w-60 h-2 bg-muted rounded-full overflow-hidden mt-4 border border-border shadow-inner">
          <div className="h-full bg-gradient-to-r from-primary via-primary/70 to-accent rounded-full animate-[loading_dark_1.8s_ease-out_infinite]" />
        </div>
      </div>
      <style jsx>{`
        @keyframes loading_dark {
          0% { width: 0%; margin-left: 0; }
          45% { width: 100%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px #fde04780); }
          50% { opacity: 0.55; filter: drop-shadow(0 0 18px #fde047cc); }
        }
        @keyframes bounce2 {
          0%, 100% { transform: translateY(0);}
          50% { transform: translateY(-0.36em);}
        }
        @keyframes bounce3 {
          0%, 100% { transform: translateY(0);}
          40% { transform: translateY(-0.18em);}
        }
      `}</style>
    </div>
  );
};

export default RunningServer;