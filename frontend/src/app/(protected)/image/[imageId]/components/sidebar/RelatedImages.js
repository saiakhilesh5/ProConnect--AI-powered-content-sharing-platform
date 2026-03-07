import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAIFeatures } from '@/hooks/useAIFeatures';

const RelatedImages = ({ image, relatedImages }) => {
  const { findSimilarImages } = useAIFeatures();
  const [similarImages, setSimilarImages] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarFetched, setSimilarFetched] = useState(false);

  const fetchSimilar = async () => {
    if (!image?.imageUrl || loadingSimilar) return;
    setLoadingSimilar(true);
    try {
      const results = await findSimilarImages(image.imageUrl);
      // Filter out the current image
      setSimilarImages((results || []).filter(img => img._id !== image._id).slice(0, 6));
    } catch (err) {
      // silently fail - it's a nice-to-have feature
    } finally {
      setLoadingSimilar(false);
      setSimilarFetched(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* More from this creator */}
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="text-lg font-bold mb-4">More from this creator</h3>

        <div className="grid grid-cols-2 gap-3">
          {relatedImages && relatedImages.length > 0 ? (
            relatedImages
              .filter(relImg => relImg._id !== image._id)
              .slice(0, 4)
              .map((relatedImage) => (
                <div key={relatedImage._id} className="group cursor-pointer">
                  <Link href={`/image/${relatedImage._id}`}>
                    <div className="rounded-lg overflow-hidden mb-2 relative">
                      <img
                        src={relatedImage.imageUrl}
                        alt={relatedImage.title}
                        className="w-full aspect-[4/5] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <div>
                          <h4 className="text-sm font-medium text-white">{relatedImage.title}</h4>
                          <p className="text-xs text-gray-300">{relatedImage.user?.username}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-400">
              No other images from this creator
            </div>
          )}
        </div>

        <Link href={`/profile/${image.user.username}`} className="w-full py-2 text-center bg-white/5 hover:bg-white/10 rounded-lg text-violet-400 transition-colors mt-4 block">
          View all by this creator
        </Link>
      </div>

      {/* AI Similar Images */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-lg font-bold">AI Similar Images</h3>
          </div>
          {!similarFetched && !loadingSimilar && (
            <button
              onClick={fetchSimilar}
              className="text-xs text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
            >
              Find Similar
            </button>
          )}
          {loadingSimilar && (
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          )}
        </div>

        {!similarFetched && !loadingSimilar && (
          <p className="text-sm text-muted-foreground">
            Discover visually similar images across the platform using AI.
          </p>
        )}

        {similarFetched && similarImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {similarImages.slice(0, 6).map((img) => (
              <div key={img._id} className="group cursor-pointer">
                <Link href={`/image/${img._id}`}>
                  <div className="rounded-lg overflow-hidden mb-1 relative">
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-full aspect-[4/5] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <div>
                        <h4 className="text-xs font-medium text-white truncate">{img.title}</h4>
                        <p className="text-xs text-gray-300">@{img.user?.username}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {similarFetched && similarImages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No visually similar images found.
          </p>
        )}
      </div>
    </div>
  );
};

export default RelatedImages; 