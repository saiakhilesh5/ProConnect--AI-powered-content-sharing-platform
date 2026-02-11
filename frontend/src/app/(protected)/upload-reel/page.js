"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  { value: "other", label: "Other" },
];

export default function UploadReelPage() {
  const router = useRouter();
  const { uploadReel, loading } = useReels();
  const videoInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [formData, setFormData] = useState({
    caption: "",
    category: "other",
    tags: "",
    visibility: "public",
    commentsAllowed: true,
  });

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be less than 100MB");
      return;
    }

    setVideoFile(file);
    
    // Create preview
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    // Get video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      // Check duration (max 60 seconds)
      if (video.duration > 60) {
        toast.error("Video must be 60 seconds or less");
        setVideoFile(null);
        setVideoPreview(null);
        return;
      }
      
      setVideoDuration(Math.round(video.duration));
    };
    video.src = url;
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
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

      await uploadReel(uploadData);
      toast.success("Reel uploaded successfully!");
      router.push("/reels");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload reel");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/reels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Upload Reel</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {/* Video Upload Section */}
          <div>
            {!videoPreview ? (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="aspect-[9/16] bg-card border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted transition-all"
              >
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-foreground font-medium mb-2">Upload Video</p>
                <p className="text-muted-foreground text-sm text-center px-4">
                  MP4, WebM, or MOV. Max 60 seconds, 100MB.
                </p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden">
                <video
                  ref={videoPreviewRef}
                  src={videoPreview}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  onClick={togglePlayPause}
                />
                
                {/* Play/Pause Overlay */}
                <div
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                >
                  {!isPlaying && (
                    <div className="bg-black/50 rounded-full p-4">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70"
                >
                  <X className="h-5 w-5 text-white" />
                </button>

                {/* Duration Badge */}
                <div className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded text-white text-sm">
                  {videoDuration}s
                </div>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            {/* Caption */}
            <div>
              <Label htmlFor="caption" className="text-foreground mb-2 block">
                Caption
              </Label>
              <textarea
                id="caption"
                name="caption"
                value={formData.caption}
                onChange={handleInputChange}
                placeholder="Write a caption for your reel..."
                rows={4}
                maxLength={500}
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none resize-none"
              />
              <p className="text-muted-foreground text-sm mt-1">
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
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="text-foreground hover:bg-muted"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags" className="text-foreground mb-2 block">
                <Hash className="h-4 w-4 inline mr-1" /> Tags
              </Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="dance, funny, viral (comma separated)"
                className="bg-card border-border text-foreground"
              />
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
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-muted"
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
                <span className="text-foreground">Allow comments</span>
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
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-6 text-lg font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                "Post Reel"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
