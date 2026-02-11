"use client"
import React from 'react';
import { Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const QuickUpload = () => {
  const router = useRouter();
  const handleDragClick = () => {
    router.push("/upload-image");
  }
  return (
    <div className="rounded-xl bg-card border border-border p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-foreground">Quick Upload</h3>
      <div onClick={handleDragClick} className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/30">
        <div className="p-2 sm:p-3 bg-muted rounded-lg mb-3 sm:mb-4">
          <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-2">Drag and drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground/70">PNG, JPG, SVG, WEBP up to 10MB</p>
      </div>
      <div className="mt-3 sm:mt-4">
        <Link href={"/upload-image"} className="block text-center w-full py-2 sm:py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300">
          Upload New Image
        </Link>
      </div>
    </div>
  );
};

export default QuickUpload; 