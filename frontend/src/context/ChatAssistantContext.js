"use client";
import React, { createContext, useContext, useState } from 'react';

const ChatAssistantContext = createContext();

export const useChatAssistant = () => {
  const context = useContext(ChatAssistantContext);
  if (!context) {
    throw new Error('useChatAssistant must be used within a ChatAssistantProvider');
  }
  return context;
};

export const ChatAssistantProvider = ({ children }) => {
  const [currentImageId, setCurrentImageId] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Set current image context (call this from image detail pages)
  const setImageContext = (imageId, imageUrl = null) => {
    setCurrentImageId(imageId);
    setCurrentImageUrl(imageUrl);
  };

  // Clear image context (call when leaving image detail pages)
  const clearImageContext = () => {
    setCurrentImageId(null);
    setCurrentImageUrl(null);
  };

  return (
    <ChatAssistantContext.Provider value={{
      currentImageId,
      currentImageUrl,
      setImageContext,
      clearImageContext
    }}>
      {children}
    </ChatAssistantContext.Provider>
  );
};

export default ChatAssistantContext;
