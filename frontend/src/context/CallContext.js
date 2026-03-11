"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { getWebRTCService, resetWebRTCService } from "@/lib/webrtc";

// Call states
export const CALL_STATUS = {
  IDLE: "idle",
  INITIATING: "initiating",
  RINGING: "ringing",
  INCOMING: "incoming",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ENDED: "ended",
  DECLINED: "declined",
  MISSED: "missed",
  FAILED: "failed",
};

const CallContext = createContext({
  // State
  callStatus: CALL_STATUS.IDLE,
  currentCall: null,
  callType: null, // 'audio' | 'video'
  isMuted: false,
  isVideoOff: false,
  localStream: null,
  remoteStreams: new Map(),
  callDuration: 0,
  incomingCall: null,
  // Actions
  initiateCall: () => {},
  answerCall: () => {},
  declineCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleVideo: () => {},
  switchCamera: () => {},
});

export const CallProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  // Call state
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [currentCall, setCurrentCall] = useState(null);
  const [callType, setCallType] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  
  // Refs
  const webRTCRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const ringtoneRef = useRef(null);
  const currentCallRef = useRef(null); // Always holds the latest currentCall to avoid stale closures
  const callStatusRef = useRef(CALL_STATUS.IDLE);
  const callTypeRef = useRef(null);

  // Keep refs in sync with state to avoid stale closures in socket callbacks
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  // Initialize WebRTC service
  useEffect(() => {
    webRTCRef.current = getWebRTCService();
    
    // Set up WebRTC callbacks
    webRTCRef.current.onRemoteStream((userId, stream) => {
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.set(userId, stream);
        return updated;
      });
    });

    webRTCRef.current.onRemoteStreamRemoved((userId) => {
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    });

    return () => {
      resetWebRTCService();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Incoming call
    const handleIncomingCall = ({ call, caller, conversationId, callType: type }) => {
      console.log("Incoming call:", call);
      
      // Don't accept if already in a call — use ref for latest status
      if (callStatusRef.current !== CALL_STATUS.IDLE) {
        socket.emit("call:decline", { callId: call._id });
        return;
      }

      setIncomingCall({
        ...call,
        caller,
        conversationId,
      });
      setCallType(type);
      setCallStatus(CALL_STATUS.INCOMING);
      
      // Play ringtone
      playRingtone();
    };

    // Call initiated (for caller)
    const handleCallInitiated = ({ call, message }) => {
      console.log("Call initiated:", call);
      setCurrentCall(call);
      setCallStatus(CALL_STATUS.RINGING);
    };

    // Call answered — THIS runs on the CALLER side
    const handleCallAnswered = async ({ callId, userId: remoteUserId, user: remoteUser }) => {
      console.log("Call answered by:", remoteUser?.username, "callId:", callId);
      setCallStatus(CALL_STATUS.CONNECTING);
      
      // Create and send WebRTC offer to the answerer
      try {
        const offer = await webRTCRef.current.createOffer(remoteUserId);
        socket.emit("webrtc:offer", {
          callId,
          targetUserId: remoteUserId,
          offer,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
        setCallStatus(CALL_STATUS.FAILED);
        cleanupCall();
      }
    };

    // Call connected (for answerer — backend confirms the call is ongoing)
    const handleCallConnected = ({ call }) => {
      console.log("Call connected (backend confirmed):", call._id);
      setCurrentCall(call);
      // Don't start timer yet — wait until WebRTC media is actually connected
      stopRingtone();
    };

    // Call declined
    const handleCallDeclined = ({ callId, userId, allDeclined }) => {
      console.log("Call declined:", callId);
      if (allDeclined) {
        setCallStatus(CALL_STATUS.DECLINED);
        stopRingtone();
        cleanupCall();
      }
    };

    // Call ended
    const handleCallEnded = ({ callId, duration, endedBy }) => {
      console.log("Call ended:", callId);
      setCallStatus(CALL_STATUS.ENDED);
      stopRingtone();
      cleanupCall();
    };

    // Call missed
    const handleCallMissed = ({ callId }) => {
      console.log("Call missed:", callId);
      const status = callStatusRef.current;
      if (status === CALL_STATUS.RINGING || status === CALL_STATUS.INCOMING) {
        setCallStatus(CALL_STATUS.MISSED);
        stopRingtone();
        cleanupCall();
      }
    };

    // Participant left
    const handleParticipantLeft = ({ callId, userId }) => {
      console.log("Participant left:", userId);
      webRTCRef.current.closePeerConnection(userId);
    };

    // Participant disconnected
    const handleParticipantDisconnected = ({ callId, userId: disconnectedUserId }) => {
      console.log("Participant disconnected:", disconnectedUserId);
      webRTCRef.current.closePeerConnection(disconnectedUserId);
      
      // If it's a 1-on-1 call, end it — use ref for latest value
      if (!currentCallRef.current?.isGroupCall) {
        setCallStatus(CALL_STATUS.ENDED);
        cleanupCall();
      }
    };

    // Participant muted/unmuted
    const handleParticipantMuted = ({ userId, isMuted }) => {
      console.log(`Participant ${userId} ${isMuted ? "muted" : "unmuted"}`);
      // Update UI if needed
    };

    // Participant video toggled
    const handleParticipantVideo = ({ userId, isVideoOff }) => {
      console.log(`Participant ${userId} video ${isVideoOff ? "off" : "on"}`);
      // Update UI if needed
    };

    // WebRTC signaling: Offer received — THIS runs on the ANSWERER side
    const handleWebRTCOffer = async ({ callId, fromUserId, offer }) => {
      console.log("WebRTC offer received from:", fromUserId);
      
      try {
        // Ensure local stream is available before creating answer
        if (!webRTCRef.current.localStream) {
          const type = callTypeRef.current;
          await webRTCRef.current.getLocalStream({
            audio: true,
            video: type === "video",
          });
          setLocalStream(webRTCRef.current.localStream);
        }
        
        const answer = await webRTCRef.current.createAnswer(fromUserId, offer);
        socket.emit("webrtc:answer", {
          callId,
          targetUserId: fromUserId,
          answer,
        });
        
        setCallStatus(CALL_STATUS.CONNECTED);
        startDurationTimer();
      } catch (error) {
        console.error("Error handling offer:", error);
        setCallStatus(CALL_STATUS.FAILED);
        cleanupCall();
      }
    };

    // WebRTC signaling: Answer received — THIS runs on the CALLER side
    const handleWebRTCAnswer = async ({ callId, fromUserId, answer }) => {
      console.log("WebRTC answer received from:", fromUserId);
      
      try {
        await webRTCRef.current.handleAnswer(fromUserId, answer);
        setCallStatus(CALL_STATUS.CONNECTED);
        startDurationTimer();
      } catch (error) {
        console.error("Error handling answer:", error);
        setCallStatus(CALL_STATUS.FAILED);
        cleanupCall();
      }
    };

    // WebRTC signaling: ICE candidate
    const handleICECandidate = async ({ callId, fromUserId, candidate }) => {
      try {
        await webRTCRef.current.handleIceCandidate(fromUserId, candidate);
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    };

    // Call error
    const handleCallError = ({ message }) => {
      console.error("Call error:", message);
      setCallStatus(CALL_STATUS.FAILED);
      cleanupCall();
    };

    // Register event listeners
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:initiated", handleCallInitiated);
    socket.on("call:answered", handleCallAnswered);
    socket.on("call:connected", handleCallConnected);
    socket.on("call:declined", handleCallDeclined);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:missed", handleCallMissed);
    socket.on("call:participant-left", handleParticipantLeft);
    socket.on("call:participant-disconnected", handleParticipantDisconnected);
    socket.on("call:participant-muted", handleParticipantMuted);
    socket.on("call:participant-video", handleParticipantVideo);
    socket.on("webrtc:offer", handleWebRTCOffer);
    socket.on("webrtc:answer", handleWebRTCAnswer);
    socket.on("webrtc:ice-candidate", handleICECandidate);
    socket.on("call:error", handleCallError);

    // Set up ICE candidate callback — use ref to avoid stale closure
    webRTCRef.current.onIceCandidate((userId, candidate) => {
      const callId = currentCallRef.current?._id;
      if (callId) {
        socket.emit("webrtc:ice-candidate", {
          callId,
          targetUserId: userId,
          candidate,
        });
      }
    });

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:initiated", handleCallInitiated);
      socket.off("call:answered", handleCallAnswered);
      socket.off("call:connected", handleCallConnected);
      socket.off("call:declined", handleCallDeclined);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:missed", handleCallMissed);
      socket.off("call:participant-left", handleParticipantLeft);
      socket.off("call:participant-disconnected", handleParticipantDisconnected);
      socket.off("call:participant-muted", handleParticipantMuted);
      socket.off("call:participant-video", handleParticipantVideo);
      socket.off("webrtc:offer", handleWebRTCOffer);
      socket.off("webrtc:answer", handleWebRTCAnswer);
      socket.off("webrtc:ice-candidate", handleICECandidate);
      socket.off("call:error", handleCallError);
    };
  }, [socket, isConnected, cleanupCall, startDurationTimer]);

  // Ringtone functions
  const playRingtone = () => {
    try {
      // Try to use audio file first
      ringtoneRef.current = new Audio("/sounds/ringtone.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.5;
      
      const playPromise = ringtoneRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If audio file fails, use Web Audio API to generate a simple tone
          playGeneratedRingtone();
        });
      }
    } catch (error) {
      console.error("Error playing ringtone:", error);
      playGeneratedRingtone();
    }
  };

  // Fallback ringtone using Web Audio API
  const playGeneratedRingtone = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;
      
      // Create a pulsing effect
      const pulseRingtone = () => {
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.4);
      };
      
      oscillator.start();
      pulseRingtone();
      
      const intervalId = setInterval(pulseRingtone, 1000);
      
      // Store for cleanup
      ringtoneRef.current = {
        stop: () => {
          clearInterval(intervalId);
          oscillator.stop();
          audioContext.close();
        },
        pause: function() { this.stop(); },
        currentTime: 0,
      };
    } catch (error) {
      console.error("Error with fallback ringtone:", error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      try {
        if (typeof ringtoneRef.current.pause === 'function') {
          ringtoneRef.current.pause();
        }
        if (typeof ringtoneRef.current.stop === 'function') {
          ringtoneRef.current.stop();
        }
        ringtoneRef.current = null;
      } catch (error) {
        console.error("Error stopping ringtone:", error);
        ringtoneRef.current = null;
      }
    }
  };

  // Duration timer
  const startDurationTimer = useCallback(() => {
    // Clear any existing timer before starting a new one
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Cleanup call
  const cleanupCall = useCallback(() => {
    stopDurationTimer();
    stopRingtone();
    
    // Reset WebRTC
    if (webRTCRef.current) {
      webRTCRef.current.cleanup();
    }
    
    // Reset state with a delay for UI feedback
    setTimeout(() => {
      setCurrentCall(null);
      setIncomingCall(null);
      setCallType(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setLocalStream(null);
      setRemoteStreams(new Map());
      setCallDuration(0);
      setCallStatus(CALL_STATUS.IDLE);
    }, 2000);
  }, []);

  // Initiate a call
  const initiateCall = useCallback(async (conversationId, type) => {
    const socketReady = socket && (isConnected || socket.connected);
    if (!socketReady) {
      console.error("Socket not connected — please wait a moment and try again");
      return;
    }

    if (callStatus !== CALL_STATUS.IDLE) {
      console.error("Already in a call");
      return;
    }

    try {
      setCallStatus(CALL_STATUS.INITIATING);
      setCallType(type);

      // Get local media stream
      const stream = await webRTCRef.current.getLocalStream({
        audio: true,
        video: type === "video",
      });
      setLocalStream(stream);

      // Emit call initiation
      socket.emit("call:initiate", {
        conversationId,
        callType: type,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallStatus(CALL_STATUS.FAILED);
      cleanupCall();
    }
  }, [socket, isConnected, callStatus, cleanupCall]);

  // Answer a call
  const answerCall = useCallback(async () => {
    if (!socket || !socket?.connected || !incomingCall) return;

    try {
      setCallStatus(CALL_STATUS.CONNECTING);
      stopRingtone();

      // Get local media stream
      const stream = await webRTCRef.current.getLocalStream({
        audio: true,
        video: callType === "video",
      });
      setLocalStream(stream);

      // Emit answer
      socket.emit("call:answer", {
        callId: incomingCall._id,
      });

      setCurrentCall(incomingCall);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error answering call:", error);
      setCallStatus(CALL_STATUS.FAILED);
      cleanupCall();
    }
  }, [socket, incomingCall, callType, cleanupCall]);

  // Decline a call
  const declineCall = useCallback(() => {
    if (!socket) return;

    const callId = incomingCall?._id || currentCall?._id;
    if (!callId) return;

    socket.emit("call:decline", { callId });
    stopRingtone();
    cleanupCall();
  }, [socket, incomingCall, currentCall, cleanupCall]);

  // End a call
  const endCall = useCallback(() => {
    if (!socket) return;

    const callId = currentCall?._id || incomingCall?._id;
    if (!callId) return;

    socket.emit("call:end", { callId });
    setCallStatus(CALL_STATUS.ENDED);
    cleanupCall();
  }, [socket, currentCall, incomingCall, cleanupCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (webRTCRef.current) {
      webRTCRef.current.toggleAudio(newMuted);
    }

    if (socket && currentCall?._id) {
      socket.emit("call:toggle-mute", {
        callId: currentCall._id,
        isMuted: newMuted,
      });
    }
  }, [isMuted, socket, currentCall]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    
    if (webRTCRef.current) {
      webRTCRef.current.toggleVideo(newVideoOff);
    }

    if (socket && currentCall?._id) {
      socket.emit("call:toggle-video", {
        callId: currentCall._id,
        isVideoOff: newVideoOff,
      });
    }
  }, [isVideoOff, socket, currentCall]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (webRTCRef.current) {
      await webRTCRef.current.switchCamera();
    }
  }, []);

  // Format duration for display
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return (
    <CallContext.Provider
      value={{
        // State
        callStatus,
        currentCall,
        callType,
        isMuted,
        isVideoOff,
        localStream,
        remoteStreams,
        callDuration,
        incomingCall,
        // Actions
        initiateCall,
        answerCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
        // Helpers
        formatDuration,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

export default CallContext;
