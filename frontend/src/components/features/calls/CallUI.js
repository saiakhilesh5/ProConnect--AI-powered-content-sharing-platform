"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import Image from "next/image";
import { useCall, CALL_STATUS } from "@/context/CallContext";
import { useAuth } from "@/context/AuthContext";

// Incoming Call Modal - shows when receiving a call
export function IncomingCallModal() {
  const { callStatus, incomingCall, callType, answerCall, declineCall } = useCall();

  if (callStatus !== CALL_STATUS.INCOMING || !incomingCall) {
    return null;
  }

  const caller = incomingCall.caller;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="flex flex-col items-center p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl max-w-sm w-full mx-4"
        >
          {/* Caller Avatar with Pulse Animation */}
          <div className="relative mb-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl"
            />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-lg shadow-purple-500/20">
              {caller?.profilePicture ? (
                <Image
                  src={caller.profilePicture}
                  alt={caller.fullName || "Caller"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {(caller?.fullName?.[0] || "?").toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Call Type Icon */}
            <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-purple-600 shadow-lg">
              {callType === "video" ? (
                <Video className="w-4 h-4 text-white" />
              ) : (
                <Phone className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          {/* Caller Info */}
          <h2 className="text-xl font-semibold text-white mb-1">
            {caller?.fullName || "Unknown"}
          </h2>
          <p className="text-zinc-400 text-sm mb-2">@{caller?.username || "unknown"}</p>
          
          {/* Call Type Label */}
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-purple-400 font-medium mb-8"
          >
            Incoming {callType === "video" ? "Video" : "Voice"} Call...
          </motion.p>

          {/* Action Buttons */}
          <div className="flex items-center gap-8">
            {/* Decline Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={declineCall}
              className="flex flex-col items-center gap-2"
            >
              <div className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                <PhoneOff className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm text-zinc-400">Decline</span>
            </motion.button>

            {/* Answer Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={answerCall}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="p-5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
              >
                {callType === "video" ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </motion.div>
              <span className="text-sm text-zinc-400">Answer</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Video Call Screen
export function VideoCallScreen() {
  const {
    callStatus,
    currentCall,
    callType,
    isMuted,
    isVideoOff,
    localStream,
    remoteStreams,
    callDuration,
    toggleMute,
    toggleVideo,
    endCall,
    switchCamera,
    formatDuration,
  } = useCall();
  const { user: currentUser } = useAuth();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((e) => {
        console.warn("Local video play failed:", e);
      });
    }
  }, [localStream]);

  // Set remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.size > 0) {
      const [, stream] = Array.from(remoteStreams)[0];
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch((e) => {
        console.warn("Remote video play failed:", e);
      });
    }
  }, [remoteStreams]);

  // Only show for video calls in active states
  if (
    callType !== "video" ||
    ![CALL_STATUS.RINGING, CALL_STATUS.CONNECTING, CALL_STATUS.CONNECTED].includes(callStatus)
  ) {
    return null;
  }

  const getOtherParticipant = () => {
    if (!currentCall?.participants) return null;
    const currentUserId = currentUser?._id?.toString();
    return currentCall.participants.find(
      (p) => p.user?._id?.toString() !== currentUserId
    )?.user || currentCall.participants[0]?.user;
  };

  const participant = getOtherParticipant();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${callStatus === CALL_STATUS.CONNECTED && remoteStreams.size > 0 ? "" : "hidden"}`}
        />
        {(callStatus !== CALL_STATUS.CONNECTED || remoteStreams.size === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
            <div className="text-center">
              {/* Participant Avatar */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl"
                />
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-purple-500/30">
                  {participant?.profilePicture ? (
                    <Image
                      src={participant.profilePicture}
                      alt={participant.fullName || ""}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {(participant?.fullName?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">
                {participant?.fullName || "Unknown"}
              </h2>
              
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-purple-400"
              >
                {callStatus === CALL_STATUS.RINGING && "Ringing..."}
                {callStatus === CALL_STATUS.CONNECTING && "Connecting..."}
              </motion.p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className="absolute top-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoOff || !localStream ? "hidden" : ""}`}
          style={{ transform: "scaleX(-1)" }}
        />
        {(!localStream || isVideoOff) && (
          <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-zinc-500" />
          </div>
        )}
      </motion.div>

      {/* Call Duration */}
      {callStatus === CALL_STATUS.CONNECTED && (
        <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-white font-mono">{formatDuration(callDuration)}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-4 px-6 py-4 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          {/* Switch Camera */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={switchCamera}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.button>

          {/* Toggle Video */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* Toggle Mute */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* End Call */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={endCall}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Audio Call Screen
export function AudioCallScreen() {
  const {
    callStatus,
    currentCall,
    callType,
    isMuted,
    callDuration,
    toggleMute,
    endCall,
    formatDuration,
  } = useCall();
  const { user: currentUser } = useAuth();

  // Only show for audio calls in active states
  if (
    callType !== "audio" ||
    ![CALL_STATUS.RINGING, CALL_STATUS.CONNECTING, CALL_STATUS.CONNECTED].includes(callStatus)
  ) {
    return null;
  }

  const getOtherParticipant = () => {
    if (!currentCall?.participants) return null;
    const currentUserId = currentUser?._id?.toString();
    return currentCall.participants.find(
      (p) => p.user?._id?.toString() !== currentUserId
    )?.user || currentCall.participants[0]?.user;
  };

  const participant = getOtherParticipant();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-purple-900 via-zinc-900 to-black"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/30 blur-3xl"
        />
      </div>

      {/* Call Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4">
        {/* Participant Avatar */}
        <div className="relative mb-8">
          {/* Sound Wave Animation */}
          {callStatus === CALL_STATUS.CONNECTED && !isMuted && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-4 border-purple-500/50"
            />
          )}
          
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl"
          />
          
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-2xl shadow-purple-500/20">
            {participant?.profilePicture ? (
              <Image
                src={participant.profilePicture}
                alt={participant.fullName || ""}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                <span className="text-5xl font-bold text-white">
                  {(participant?.fullName?.[0] || "?").toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Participant Info */}
        <h2 className="text-2xl font-semibold text-white mb-2">
          {participant?.fullName || "Unknown"}
        </h2>
        <p className="text-zinc-400 text-sm mb-4">@{participant?.username || "unknown"}</p>

        {/* Call Status / Duration */}
        {callStatus === CALL_STATUS.CONNECTED ? (
          <p className="text-xl font-mono text-white mb-12">{formatDuration(callDuration)}</p>
        ) : (
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-purple-400 mb-12"
          >
            {callStatus === CALL_STATUS.RINGING && "Ringing..."}
            {callStatus === CALL_STATUS.CONNECTING && "Connecting..."}
          </motion.p>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-6">
          {/* Toggle Mute */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`p-5 rounded-full transition-colors ${
              isMuted ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </motion.button>

          {/* End Call */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={endCall}
            className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </motion.button>

          {/* Speaker (placeholder) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Call Ended Screen (Brief feedback)
export function CallEndedScreen() {
  const { callStatus, callDuration, formatDuration } = useCall();

  if (![CALL_STATUS.ENDED, CALL_STATUS.DECLINED, CALL_STATUS.MISSED].includes(callStatus)) {
    return null;
  }

  const getMessage = () => {
    switch (callStatus) {
      case CALL_STATUS.ENDED:
        return callDuration > 0 ? `Call ended • ${formatDuration(callDuration)}` : "Call ended";
      case CALL_STATUS.DECLINED:
        return "Call declined";
      case CALL_STATUS.MISSED:
        return "Call missed";
      default:
        return "Call ended";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="text-center text-white"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
          <PhoneOff className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-xl">{getMessage()}</p>
      </motion.div>
    </motion.div>
  );
}

// Main Call UI Component - renders appropriate screen based on state
export function CallUI() {
  return (
    <>
      <IncomingCallModal />
      <VideoCallScreen />
      <AudioCallScreen />
      <CallEndedScreen />
    </>
  );
}

export default CallUI;
