"use client"
import { Tag, X, ArrowRight, Save, Copy, AlertCircle, FolderPlus, Loader2, Sparkles, Wand2, Check, RefreshCw } from 'lucide-react';
import Image from 'next/image';

const ImageDetails = ({ 
  imageDetails, 
  handleChange,
  setImageDetails,
  files, 
  selectedTags, 
  setSelectedTags, 
  inputTag, 
  setInputTag, 
  uploadError,
  removeFile,
  suggestedTags,
  categories,
  collections,
  loadingCollections,
  selectedCollectionId,
  setSelectedCollectionId,
  // AI props
  isAnalyzing,
  aiSuggestions,
  altText,
  setAltText,
  aiGenerated,
  setAiGenerated,
  analyzeImageWithAI
}) => {
  const handleTagInput = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmedTag = inputTag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setInputTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const addSuggestedTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Error handling
  const titleError = uploadError && !imageDetails.title.trim() ? "Title is required" : null;
  const descriptionError = uploadError && !imageDetails.description.trim() ? "Description is required" : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Image Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Preview Column */}
        <div className="md:col-span-5">
          {files[0]?.preview && (
            <div className="relative aspect-square sm:aspect-[4/3] md:aspect-square rounded-xl overflow-hidden border border-white/10 mb-3 sm:mb-4">
              <Image 
                src={files[0].preview}
                alt="Image preview"
                fill
                className="object-cover"
              />
              <button 
                onClick={() => removeFile(0)}
                className="absolute top-2 right-2 p-2 sm:p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
          
          <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
            <h3 className="font-medium mb-2 text-sm">File Information</h3>
            <div className="text-xs text-gray-400">
              <p className="mb-1">Name: {files[0]?.name}</p>
              <p className="mb-1">Size: {files[0]?.size} MB</p>
              <p className="mb-1">
                Status: {
                  files[0]?.error ? 
                    <span className="text-red-400">Error: {files[0].error}</span> : 
                    files[0]?.uploaded ? 
                    <span className="text-green-400">Ready</span> : 
                    <span className="text-yellow-400">Processing...</span>
                }
              </p>
            </div>
          </div>
          
          {/* AI Analysis Section */}
          <div className="mt-3 sm:mt-4 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 border border-violet-500/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h3 className="font-medium text-sm text-violet-300">AI Assistant</h3>
              </div>
              {files[0]?.cloudinaryUrl && !isAnalyzing && (
                <button
                  onClick={() => analyzeImageWithAI(files[0].cloudinaryUrl)}
                  className="flex items-center gap-1.5 text-xs bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Re-analyze
                </button>
              )}
            </div>
            
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-violet-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing image with AI...</span>
              </div>
            ) : aiSuggestions?.aiGenerated ? (
              <div className="space-y-2">
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  AI suggestions applied! You can edit them below.
                </p>
                {aiGenerated && (
                  <p className="text-xs text-gray-400">
                    Caption, tags, and category were auto-filled based on AI analysis.
                  </p>
                )}
              </div>
            ) : files[0]?.uploaded ? (
              <div className="text-xs text-gray-400">
                <p>AI analysis will help generate:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Suggested caption/title</li>
                  <li>Relevant tags</li>
                  <li>Best category match</li>
                  <li>Alt text for accessibility</li>
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Upload will trigger automatic AI analysis...
              </p>
            )}
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 space-y-4 sm:space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title <span className="text-red-400">*</span>
              {aiGenerated && aiSuggestions?.caption && (
                <span className="ml-2 text-xs text-violet-400 font-normal">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI suggested
                </span>
              )}
            </label>
            <input 
              type="text"
              name="title"
              value={imageDetails.title}
              onChange={handleChange}
              placeholder="Give your image a title"
              className={`bg-zinc-800/70 border ${titleError ? 'border-red-500' : 'border-white/10'} rounded-lg py-2.5 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-sm sm:text-base`}
            />
            {titleError && (
              <p className="mt-1 text-xs sm:text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {titleError}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={imageDetails.description}
              onChange={handleChange}
              placeholder="Describe your image..."
              rows={4}
              className={`bg-zinc-800/70 border ${descriptionError ? 'border-red-500' : 'border-white/10'} rounded-lg py-2.5 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition resize-none text-sm sm:text-base`}
            />
            {descriptionError && (
              <p className="mt-1 text-xs sm:text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {descriptionError}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
              {aiGenerated && aiSuggestions?.category && (
                <span className="ml-2 text-xs text-violet-400 font-normal">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI suggested
                </span>
              )}
            </label>
            <select
              name="category"
              value={imageDetails.category}
              onChange={handleChange}
              className="bg-zinc-800/70 border border-white/10 rounded-lg py-2 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition appearance-none custom-select"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Alt Text (Accessibility) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Alt Text (Accessibility)
              {aiGenerated && aiSuggestions?.altText && (
                <span className="ml-2 text-xs text-violet-400 font-normal">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI generated
                </span>
              )}
            </label>
            <input 
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for screen readers..."
              className="bg-zinc-800/70 border border-white/10 rounded-lg py-2.5 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-sm sm:text-base"
            />
            <p className="mt-1 text-xs text-gray-400">
              Helps visually impaired users understand your image
            </p>
          </div>

          {/* Collection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1">
              Add to Collection <FolderPlus className="h-4 w-4 text-violet-400" />
            </label>
            {loadingCollections ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading collections...
              </div>
            ) : collections.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm py-2">
                No collections found
              </div>
            ) : (
              <select
                value={selectedCollectionId || ""}
                onChange={(e) => setSelectedCollectionId(e.target.value || null)}
                className="bg-zinc-800/70 border border-white/10 rounded-lg py-2.5 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition appearance-none custom-select text-sm sm:text-base"
              >
                <option value="">Don&apos;t add to collection</option>
                {collections.map(collection => (
                  <option key={collection._id} value={collection._id}>
                    {collection.name} ({collection.imageCount || 0} images)
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-400">
              You can add this image to a collection or leave it unassigned
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags
              {aiGenerated && aiSuggestions?.tags?.length > 0 && (
                <span className="ml-2 text-xs text-violet-400 font-normal">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI suggested tags added
                </span>
              )}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  value={inputTag}
                  onChange={(e) => setInputTag(e.target.value)}
                  onKeyDown={handleTagInput}
                  placeholder="Add tags (press Enter after each tag)"
                  className="bg-zinc-800/70 border border-white/10 rounded-lg py-2.5 px-3 w-full focus:outline-none focus:ring-2 focus:ring-violet-500 transition pr-10 text-sm sm:text-base"
                />
                <button 
                  onClick={addTag}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 touch-manipulation"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 text-xs sm:text-sm bg-violet-900/30 text-violet-300 py-1.5 px-2.5 rounded-lg">
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 p-0.5 touch-manipulation">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedTags.length === 0 && (
                <span className="text-gray-400 text-xs sm:text-sm">No tags selected</span>
              )}
            </div>

            {/* Suggested tags */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => addSuggestedTag(tag)}
                    disabled={selectedTags.includes(tag)}
                    className={`text-xs py-1.5 px-2.5 rounded-lg touch-manipulation 
                      ${selectedTags.includes(tag) 
                        ? 'bg-violet-800/20 text-violet-700 cursor-not-allowed' 
                        : 'bg-zinc-800 text-gray-300 active:bg-violet-900/30 active:text-violet-300 hover:bg-violet-900/30 hover:text-violet-300'
                      } transition-colors`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploadError && titleError === null && descriptionError === null && (
        <div className="mt-4 p-3 sm:p-4 bg-red-500/20 border border-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <p className="text-xs sm:text-sm text-red-100">{uploadError}</p>
        </div>
      )}
    </div>
  );
};

export default ImageDetails; 