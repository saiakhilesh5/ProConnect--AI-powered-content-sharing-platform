"use client";
import { useState, useEffect } from "react";
import { X, Code, Github, Linkedin, Mail } from "lucide-react";

const DeveloperInfo = () => {
  // Component disabled
  return null;
  
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main floating button */}
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Developer info card - appears on hover */}
        {isHovered && (
          <div className="absolute bottom-16 right-0 w-80 bg-card border border-border rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <img src="https://lh3.googleusercontent.com/a/ACg8ocKCAYmMcwVhDp7ZrneUw-H0m-pftFUMeA6a7fvw0j5WSDiaRtIh=s120-c-no" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Abdul Rehman</h3>
                  <p className="text-zinc-400 text-xs">Built with ❤️</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-white font-medium text-sm mb-2">About This Project</h4>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Pixora is a modern image sharing platform built with Next.js by Abdul Rehman
                </p>
              </div>

              <div>
                <h4 className="text-white font-medium text-sm mb-2">Connect</h4>
                <div className="flex space-x-3">
                  <a
                    href="https://github.com/rehmanNRY/SocialMediaApp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors text-xs"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/rehman-nry/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors text-xs"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href="mailto:rehman.contact9@gmail.com"
                    className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors text-xs"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating action button */}
        <div className="p-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
          <img
            src="https://lh3.googleusercontent.com/a/ACg8ocKCAYmMcwVhDp7ZrneUw-H0m-pftFUMeA6a7fvw0j5WSDiaRtIh=s120-c-no"
            className="w-10 h-10 rounded-full border-2 border-white"
            aria-label="Developer Info"
          />
        </div>
      </div>
    </div>
  );
};

export default DeveloperInfo;
