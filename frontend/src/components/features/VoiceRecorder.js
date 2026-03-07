"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, Trash2, Pause, Play, X } from 'lucide-react';

// Audio visualizer bar component
function AudioBar({ height, isActive }) {
  return (
    <motion.div
      className={`w-1 rounded-full ${isActive ? 'bg-blue-500' : 'bg-zinc-600'}`}
      animate={{ height: `${height}%` }}
      transition={{ duration: 0.1 }}
    />
  );
}

// Waveform display
function Waveform({ audioData, isPlaying, currentTime, duration }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !audioData?.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    const barWidth = 3;
    const gap = 2;
    const barCount = Math.floor(width / (barWidth + gap));
    const step = Math.ceil(audioData.length / barCount);
    
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressBar = Math.floor(barCount * progress);
    
    for (let i = 0; i < barCount; i++) {
      const dataIndex = i * step;
      const value = audioData[dataIndex] || 0;
      const barHeight = Math.max(4, (value / 255) * height * 0.8);
      
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      
      ctx.fillStyle = i < progressBar ? '#3b82f6' : '#71717a';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }
  }, [audioData, currentTime, duration]);
  
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="w-full h-10"
    />
  );
}

// Format time in mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({ onSend, onCancel, maxDuration = 120 }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioData, setAudioData] = useState([]);
  const [error, setError] = useState(null);
  const [visualizerData, setVisualizerData] = useState(Array(20).fill(20));
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioUrl]);
  
  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Create audio element for playback
        analyzeAudio(blob);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Start visualizer
      updateVisualizer();
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied');
    }
  };
  
  // Update visualizer bars
  const updateVisualizer = () => {
    if (!analyserRef.current || !isRecording) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Sample 20 values for visualization
    const samples = [];
    const step = Math.floor(dataArray.length / 20);
    for (let i = 0; i < 20; i++) {
      const value = dataArray[i * step];
      samples.push(Math.max(10, (value / 255) * 100));
    }
    setVisualizerData(samples);
    
    animationRef.current = requestAnimationFrame(updateVisualizer);
  };
  
  // Analyze audio for waveform display
  const analyzeAudio = async (blob) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get channel data
      const channelData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(channelData.length / samples);
      const data = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        data.push((sum / blockSize) * 255 * 3);
      }
      
      setAudioData(data);
    } catch (err) {
      console.error('Failed to analyze audio:', err);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsRecording(false);
  };
  
  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      updateVisualizer();
    } else {
      mediaRecorderRef.current.pause();
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsPaused(!isPaused);
  };
  
  // Play/Pause recorded audio
  const togglePlayback = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.ontimeupdate = () => {
        setPlaybackTime(audioRef.current.currentTime);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  // Delete recording
  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioData([]);
    setPlaybackTime(0);
    setIsPlaying(false);
  };
  
  // Send voice message
  const handleSend = async () => {
    if (!audioBlob) return;
    
    try {
      await onSend?.(audioBlob, duration);
      deleteRecording();
    } catch (err) {
      setError('Failed to send voice message');
    }
  };
  
  // Cancel recording/playback
  const handleCancel = () => {
    stopRecording();
    deleteRecording();
    setDuration(0);
    onCancel?.();
  };
  
  return (
    <div className="flex items-center gap-3 w-full">
      <AnimatePresence mode="wait">
        {/* Not recording state */}
        {!isRecording && !audioUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 w-full"
          >
            <button
              onClick={startRecording}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>
            <span className="text-sm text-zinc-400">Tap to record voice message</span>
          </motion.div>
        )}
        
        {/* Recording state */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 w-full bg-zinc-800/50 p-2 rounded-xl"
          >
            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            {/* Visualizer */}
            <div className="flex-1 flex items-center justify-center gap-0.5 h-10">
              {visualizerData.map((height, i) => (
                <AudioBar key={i} height={height} isActive={!isPaused} />
              ))}
            </div>
            
            {/* Timer */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: isPaused ? 0.5 : 1 }}
                className="flex items-center gap-1"
              >
                <motion.div
                  animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 bg-red-500 rounded-full"
                />
                <span className="text-sm text-white font-mono min-w-[40px]">
                  {formatTime(duration)}
                </span>
              </motion.div>
              
              {/* Pause button */}
              <button
                onClick={togglePause}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              
              {/* Stop & Send */}
              <button
                onClick={stopRecording}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Preview state */}
        {audioUrl && !isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 w-full bg-zinc-800/50 p-2 rounded-xl"
          >
            {/* Delete button */}
            <button
              onClick={handleCancel}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            {/* Play/Pause button */}
            <button
              onClick={togglePlayback}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            {/* Waveform */}
            <div className="flex-1">
              <Waveform
                audioData={audioData}
                isPlaying={isPlaying}
                currentTime={playbackTime}
                duration={duration}
              />
            </div>
            
            {/* Duration */}
            <span className="text-sm text-zinc-400 font-mono min-w-[40px]">
              {formatTime(isPlaying ? playbackTime : duration)}
            </span>
            
            {/* Send button */}
            <button
              onClick={handleSend}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full mb-2 left-0 right-0 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Voice message player for received messages
export function VoiceMessagePlayer({ voiceUrl, duration, className = '' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);
  
  useEffect(() => {
    audioRef.current = new Audio(voiceUrl);
    
    audioRef.current.onloadedmetadata = () => {
      setAudioDuration(audioRef.current.duration);
    };
    
    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current.currentTime);
    };
    
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    return () => {
      audioRef.current?.pause();
    };
  }, [voiceUrl]);
  
  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  
  return (
    <div className={`flex items-center gap-3 min-w-[180px] ${className}`}>
      <button
        onClick={togglePlay}
        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/60 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Duration */}
        <span className="text-xs opacity-70">
          {formatTime(isPlaying ? currentTime : audioDuration)}
        </span>
      </div>
    </div>
  );
}

export default VoiceRecorder;
