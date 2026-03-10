"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useReels } from "@/context/ReelsContext";
import {
  Upload,
  X,
  Play,
  Pause,
  Music,
  Hash,
  Globe,
  Lock,
  Users,
  MessageSquare,
  ArrowLeft,
  Camera,
  Video,
  Square,
  RotateCcw,
  Sparkles,
  ImageIcon,
  Volume2,
  VolumeX,
  Check,
  Clock,
  Scissors,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import Link from "next/link";

const categories = [
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "art", label: "Art" },
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "fitness", label: "Fitness" },
  { value: "sports", label: "Sports" },
  { value: "gaming", label: "Gaming" },
  { value: "tech", label: "Technology" },
  { value: "beauty", label: "Beauty" },
  { value: "fashion", label: "Fashion" },
  { value: "pets", label: "Pets" },
  { value: "other", label: "Other" },
];

// Sample music tracks (in production, fetch from API)
const musicTracks = [
  { id: "none", name: "No Music", artist: "" },
  { id: "trending1", name: "Trending Beat", artist: "Popular Artist" },
  { id: "trending2", name: "Viral Sound", artist: "TikTok Sounds" },
  { id: "trending3", name: "Lo-Fi Chill", artist: "Study Beats" },
  { id: "trending4", name: "Upbeat Pop", artist: "Chart Toppers" },
  { id: "trending5", name: "Dramatic Reveal", artist: "Cinematic" },
];

export default function UploadReelPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { uploadReel, analyzeReelWithAI, loading } = useReels();
  const videoInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const hiddenVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);

  // Upload mode: 'upload' or 'record'
  const [mode, setMode] = useState("upload");
  const [step, setStep] = useState(1); // 1: Select/Record, 2: Edit, 3: Details

  // Video state
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Camera recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
  const [cameraReady, setCameraReady] = useState(false);

  // Cover image state
  const [coverImage, setCoverImage] = useState(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [coverTimestamp, setCoverTimestamp] = useState(0);

  // Music state
  const [selectedMusic, setSelectedMusic] = useState(musicTracks[0]);
  const [showMusicSelector, setShowMusicSelector] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  
  const [formData, setFormData] = useState({
    caption: "",
    category: "other",
    tags: "",
    visibility: "public",
    commentsAllowed: true,
  });

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Initialize camera
  const initCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      
      setCameraReady(true);
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Could not access camera. Please check permissions.");
      setMode("upload");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraReady(false);
  };

  // Switch camera
  const switchCamera = async () => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (mode === "record" && step === 1) {
      initCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [mode, facingMode, step]);

  // Start recording
  const startRecording = () => {
    if (!cameraStreamRef.current) return;

    recordedChunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(cameraStreamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const file = new File([blob], "recorded-reel.webm", { type: "video/webm" });
      
      setVideoFile(file);
      setVideoPreview(url);
      setVideoDuration(recordingTime);
      setStep(2);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be less than 100MB");
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > 60) {
        toast.error("Video must be 60 seconds or less");
        setVideoFile(null);
        setVideoPreview(null);
        return;
      }
      
      setVideoDuration(Math.round(video.duration));
      setStep(2);
    };
    video.src = url;
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setCoverImage(null);
    setStep(1);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const togglePlayPause = () => {
    if (videoPreviewRef.current) {
      if (isPlaying) {
        videoPreviewRef.current.pause();
      } else {
        videoPreviewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Generate cover image from video frame
  const captureCoverImage = () => {
    if (!videoPreviewRef.current || !canvasRef.current) return;

    const video = videoPreviewRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCoverImage(imageDataUrl);
    setCoverTimestamp(video.currentTime);
    setShowCoverSelector(false);
    toast.success("Cover image selected!");
  };

  // AI Auto-fill functionality
  const handleAIAutoFill = async () => {
    if (!videoPreview) {
      toast.error("Please select a video first");
      return;
    }

    setAiLoading(true);
    try {
      toast.loading("AI is analyzing your reel...", { id: "ai-analysis" });

      // Step 1: Capture a frame from the video for AI analysis
      const video = hiddenVideoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        throw new Error("Video not ready. Please wait a moment and try again.");
      }

      // Seek to a good frame (2 seconds in or midpoint)
      video.currentTime = Math.min(2, videoDuration / 2);
      await new Promise((resolve) => {
        video.onseeked = resolve;
        setTimeout(resolve, 1000); // Fallback timeout
      });

      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Step 2: Convert canvas to blob and upload to Cloudinary as temp image
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.85);
      });

      if (!blob) {
        throw new Error("Failed to capture video frame");
      }

      const formData = new FormData();
      formData.append("image", blob, "reel-thumbnail.jpg");

      const token = session?.backendToken;
      if (!token) {
        throw new Error("Not authenticated. Please log in again.");
      }

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000"}/api/images/upload-temp`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload thumbnail for analysis");
      }

      const uploadData = await uploadRes.json();
      const thumbnailUrl = uploadData.data.imageUrl;

      // Step 3: Call the real AI analyze endpoint
      const result = await analyzeReelWithAI(thumbnailUrl, thumbnailUrl);

      if (result?.suggestions) {
        setAiSuggestions(result.suggestions);

        // Auto-fill the form with real AI suggestions
        setFormData((prev) => ({
          ...prev,
          caption: result.suggestions.caption || prev.caption,
          category: result.suggestions.category || prev.category,
          tags: result.suggestions.hashtags?.join(", ") || prev.tags,
        }));

        toast.success("AI filled in the details!", { id: "ai-analysis" });
      } else {
        toast.error("AI couldn't analyze the reel. Please fill manually.", { id: "ai-analysis" });
      }

      // Clean up the temp thumbnail from Cloudinary
      if (uploadData.data.publicId) {
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000"}/api/images/cloudinary/${uploadData.data.publicId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }
        ).catch(() => {}); // Fire and forget cleanup
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error(error.message || "AI analysis failed. Please fill manually.", { id: "ai-analysis" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      toast.error("Please select a video");
      return;
    }

    if (!formData.caption.trim()) {
      toast.error("Please add a caption");
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append("video", videoFile);
      uploadData.append("caption", formData.caption.trim());
      uploadData.append("category", formData.category);
      uploadData.append("tags", formData.tags);
      uploadData.append("visibility", formData.visibility);
      uploadData.append("commentsAllowed", formData.commentsAllowed.toString());
      uploadData.append("duration", videoDuration.toString());
      
      if (selectedMusic.id !== "none") {
        uploadData.append("music", JSON.stringify({
          name: selectedMusic.name,
          artist: selectedMusic.artist,
        }));
      }

      await uploadReel(uploadData);
      toast.success("Reel uploaded successfully!");
      router.push("/reels");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload reel");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden canvas for cover image capture */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Hidden video element for AI frame capture (always mounted) */}
      {videoPreview && (
        <video
          ref={hiddenVideoRef}
          src={videoPreview}
          className="hidden"
          preload="auto"
          muted
          playsInline
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reels">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Create Reel</h1>
          </div>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all ${
                  s === step
                    ? "w-6 bg-violet-500"
                    : s < step
                    ? "bg-violet-500"
                    : "bg-secondary"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Step 1: Select or Record Video */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            {/* Mode Toggle */}
            <div className="flex bg-zinc-800 p-1 rounded-xl mb-8">
              <button
                onClick={() => setMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  mode === "upload"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Upload className="h-5 w-5" />
                Upload
              </button>
              <button
                onClick={() => setMode("record")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                  mode === "record"
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Video className="h-5 w-5" />
                Record
              </button>
            </div>

            {/* Upload Mode */}
            {mode === "upload" && (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="aspect-[9/16] bg-card border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:bg-secondary transition-all"
              >
                <div className="w-20 h-20 bg-violet-600/20 rounded-full flex items-center justify-center mb-6">
                  <Upload className="h-10 w-10 text-violet-500" />
                </div>
                <p className="text-white font-semibold text-lg mb-2">
                  Upload Video
                </p>
                <p className="text-zinc-400 text-sm text-center px-8 mb-4">
                  Drag and drop or click to select
                </p>
                <div className="flex flex-wrap justify-center gap-2 px-4">
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    MP4, WebM, MOV
                  </span>
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    Max 60 seconds
                  </span>
                  <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                    Max 100MB
                  </span>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Record Mode */}
            {mode === "record" && (
              <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative">
                {/* Camera Preview */}
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                />

                {/* Camera Loading */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
                  </div>
                )}

                {/* Recording Timer */}
                {isRecording && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="text-white font-mono font-bold">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Recording Progress Bar */}
                {isRecording && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
                    <div
                      className="h-full bg-red-500 transition-all duration-1000"
                      style={{ width: `${(recordingTime / 60) * 100}%` }}
                    />
                  </div>
                )}

                {/* Camera Controls */}
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8">
                  {/* Switch Camera */}
                  <button
                    onClick={switchCamera}
                    disabled={isRecording}
                    className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 disabled:opacity-50"
                  >
                    <RotateCcw className="h-6 w-6 text-white" />
                  </button>

                  {/* Record Button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!cameraReady}
                    className="w-20 h-20 flex items-center justify-center border-4 border-white rounded-full disabled:opacity-50"
                  >
                    {isRecording ? (
                      <Square className="h-8 w-8 text-red-500 fill-red-500" />
                    ) : (
                      <div className="w-14 h-14 bg-red-500 rounded-full" />
                    )}
                  </button>

                  {/* Placeholder for symmetry */}
                  <div className="w-12 h-12" />
                </div>

                {/* Duration Indicator */}
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-white/60 text-sm">
                  {isRecording ? "Tap to stop" : "Tap to start recording"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Edit Video */}
        {step === 2 && videoPreview && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden max-h-[70vh] mx-auto md:mx-0">
              <video
                ref={videoPreviewRef}
                src={videoPreview}
                className="w-full h-full object-cover"
                loop
                playsInline
                muted={isMuted}
                onClick={togglePlayPause}
              />

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
              )}

              {/* Top Controls */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <button
                  onClick={handleRemoveVideo}
                  className="w-10 h-10 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-white" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/70" />
                  <span className="text-white text-sm font-mono">
                    {videoDuration}s
                  </span>
                </div>
              </div>

              {/* Cover Image Badge */}
              {coverImage && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 px-3 py-1 rounded-full text-xs text-white flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Cover selected
                </div>
              )}
            </div>

            {/* Editing Tools */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Edit Your Reel</h2>

              {/* Cover Image Selector */}
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-violet-400" />
                    <span className="font-medium">Cover Image</span>
                  </div>
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.pause();
                        setIsPlaying(false);
                        setShowCoverSelector(true);
                      }
                    }}
                    className="text-violet-400 text-sm hover:text-violet-300"
                  >
                    {coverImage ? "Change" : "Select"}
                  </button>
                </div>
                
                {showCoverSelector && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Scrub through the video and click "Capture" to set cover image
                    </p>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={coverTimestamp}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        setCoverTimestamp(time);
                        if (videoPreviewRef.current) {
                          videoPreviewRef.current.currentTime = time;
                        }
                      }}
                      className="w-full"
                    />
                    <Button
                      onClick={captureCoverImage}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Capture This Frame
                    </Button>
                  </div>
                )}

                {coverImage && !showCoverSelector && (
                  <div className="flex items-center gap-3">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="w-16 h-28 object-cover rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Frame at {coverTimestamp.toFixed(1)}s
                    </p>
                  </div>
                )}
              </div>

              {/* Music Selector */}
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-violet-400" />
                    <span className="font-medium">Add Music</span>
                  </div>
                  <button
                    onClick={() => setShowMusicSelector(!showMusicSelector)}
                    className="text-violet-400 text-sm hover:text-violet-300"
                  >
                    {selectedMusic.id === "none" ? "Browse" : "Change"}
                  </button>
                </div>

                {selectedMusic.id !== "none" && !showMusicSelector && (
                  <div className="flex items-center gap-3 bg-input rounded-lg p-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                      <Music className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedMusic.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMusic.artist}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMusic(musicTracks[0])}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {showMusicSelector && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {musicTracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setSelectedMusic(track);
                          setShowMusicSelector(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          selectedMusic.id === track.id
                            ? "bg-violet-600"
                            : "bg-secondary hover:bg-secondary-hover"
                        }`}
                      >
                        <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                          {track.id === "none" ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Music className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{track.name}</p>
                          {track.artist && (
                            <p className="text-xs text-muted-foreground">{track.artist}</p>
                          )}
                        </div>
                        {selectedMusic.id === track.id && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <Button
                onClick={() => setStep(3)}
                className="w-full bg-violet-600 hover:bg-violet-700 py-6 text-lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Add Details */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden max-h-[60vh] mx-auto md:mx-0">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={videoPreview}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              )}
              
              {selectedMusic.id !== "none" && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                  <Music className="h-5 w-5 text-violet-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{selectedMusic.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMusic.artist}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              {/* AI Auto-fill Button */}
              <button
                type="button"
                onClick={handleAIAutoFill}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-xl font-medium text-white hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    AI Auto-fill Details
                  </>
                )}
              </button>
              
              {aiSuggestions && (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-violet-300">
                    AI suggestions applied! Feel free to edit.
                  </span>
                </div>
              )}

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="caption" className="text-foreground">
                    Caption
                  </Label>
                  {aiSuggestions?.caption && (
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Generated
                    </span>
                  )}
                </div>
                <textarea
                  id="caption"
                  name="caption"
                  value={formData.caption}
                  onChange={handleInputChange}
                  placeholder="Write a caption for your reel..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
                <p className="text-zinc-500 text-sm mt-1">
                  {formData.caption.length}/500
                </p>
              </div>

              {/* Category */}
              <div>
                <Label className="text-foreground mb-2 block">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-input border-border">
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat.value}
                        value={cat.value}
                        className="text-foreground hover:bg-secondary"
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="tags" className="text-foreground">
                    <Hash className="h-4 w-4 inline mr-1" /> Hashtags
                  </Label>
                  {aiSuggestions?.hashtags && (
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Suggested
                    </span>
                  )}
                </div>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="fyp, viral, trending (comma separated)"
                  className="bg-input border-border text-foreground"
                />
                <p className="text-zinc-500 text-xs mt-1">
                  Add hashtags to help people discover your reel
                </p>
              </div>

              {/* Visibility */}
              <div>
                <Label className="text-foreground mb-2 block">Visibility</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "public", label: "Public", icon: Globe },
                    { value: "followers", label: "Followers", icon: Users },
                    { value: "private", label: "Private", icon: Lock },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, visibility: option.value }))
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                        formData.visibility === option.value
                          ? "border-violet-500 bg-violet-500/20 text-violet-400"
                          : "border-border bg-input text-muted-foreground hover:border-border"
                      }`}
                    >
                      <option.icon className="h-5 w-5" />
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Toggle */}
              <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span>Allow comments</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="commentsAllowed"
                    checked={formData.commentsAllowed}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!videoFile || loading}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white py-6 text-lg font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Post Reel
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

