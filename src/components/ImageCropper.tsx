import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Grid, Circle, Square } from 'lucide-react';
import { motion } from 'motion/react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cropShape, setCropShape] = useState<'square' | 'circle'>('square');
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Reset parameters when image source changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  // Touch & Mouse Drag handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setShowGrid(true);
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...pan };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    // Apply rotation adjustments to drag coordinates
    let rx = dx;
    let ry = dy;

    if (rotation === 90) {
      rx = dy;
      ry = -dx;
    } else if (rotation === 180) {
      rx = -dx;
      ry = -dy;
    } else if (rotation === 270) {
      rx = -dy;
      ry = dx;
    }

    setPan({
      x: panStartRef.current.x + rx,
      y: panStartRef.current.y + ry,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setTimeout(() => {
      setShowGrid(false);
    }, 800);
  };

  // Mouse events
  const onMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Handle Rotation
  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPan({ x: 0, y: 0 });
  };

  // Process Crop on Canvas
  const handleCrop = () => {
    const image = imageRef.current;
    const cropFrame = cropFrameRef.current;
    if (!image || !cropFrame) return;

    const imgRect = image.getBoundingClientRect();
    const frameRect = cropFrame.getBoundingClientRect();

    // Create target high-res canvas (always square 800x800 for pristine headshots)
    const targetSize = 800;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with solid white for high-end look if panned out
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Let's find the scale of the image relative to its original size.
    // getBoundingClientRect takes CSS transforms (zoom & rotation) into account.
    // However, for rendering, we want to map screen coordinates to natural image coordinates.
    const naturalW = image.naturalWidth;
    const naturalH = image.naturalHeight;

    // We draw the image onto the canvas using translation, scaling, and rotation.
    // First, let's analyze where the crop frame sits relative to the panned and zoomed image.
    // Calculate the scale factor between the screen image size (without rotation) and natural image size.
    
    // We can compute the center of the crop frame relative to the image center.
    // Center of the frame on screen
    const frameCenterX = frameRect.left + frameRect.width / 2;
    const frameCenterY = frameRect.top + frameRect.height / 2;

    // Let's compute the position of the image on screen.
    // If we just use the bounding client rects, we can draw the panned, zoomed, rotated image relative to the canvas origin.
    // Let's map screen coords to canvas:
    // Output size is 800x800.
    // On screen, the frame size is e.g. 300x300.
    // Screen-to-canvas scale:
    const screenToCanvasScale = targetSize / frameRect.width;

    // Save context state
    ctx.save();

    // Clip to circle if shape is circle
    if (cropShape === 'circle') {
      ctx.beginPath();
      ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Move canvas coordinate system center to the center of our target canvas
    ctx.translate(targetSize / 2, targetSize / 2);

    // Apply the rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Find the offset of the image center from the frame center on screen
    // Since we rotated the canvas, we need to map the screen offsets back to rotated coordinates.
    const imageCenterX = imgRect.left + imgRect.width / 2;
    const imageCenterY = imgRect.top + imgRect.height / 2;

    const dxScreen = imageCenterX - frameCenterX;
    const dyScreen = imageCenterY - frameCenterY;

    // Map screen offsets to the rotated canvas space
    let dxCanvas = dxScreen * screenToCanvasScale;
    let dyCanvas = dyScreen * screenToCanvasScale;

    if (rotation === 90) {
      dxCanvas = dyScreen * screenToCanvasScale;
      dyCanvas = -dxScreen * screenToCanvasScale;
    } else if (rotation === 180) {
      dxCanvas = -dxScreen * screenToCanvasScale;
      dyCanvas = -dyScreen * screenToCanvasScale;
    } else if (rotation === 270) {
      dxCanvas = -dyScreen * screenToCanvasScale;
      dyCanvas = dxScreen * screenToCanvasScale;
    }

    // Scale of the image in the canvas coordinate system
    // When the image is panned or zoomed on screen, its unrotated width is:
    // Actually, imgRect.width/height is already scaled on screen.
    // But if rotated 90 or 270, width and height are swapped in imgRect.
    const isRotated90 = rotation === 90 || rotation === 270;
    const displayW = isRotated90 ? imgRect.height : imgRect.width;
    const displayH = isRotated90 ? imgRect.width : imgRect.height;

    const canvasW = displayW * screenToCanvasScale;
    const canvasH = displayH * screenToCanvasScale;

    // Draw the image centered at its offset position
    ctx.drawImage(
      image,
      dxCanvas - canvasW / 2,
      dyCanvas - canvasH / 2,
      canvasW,
      canvasH
    );

    ctx.restore();

    // Output high quality JPEG
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCropComplete(croppedDataUrl);
  };

  return (
    <div className="bg-[#121214] text-white rounded-[2rem] p-6 md:p-8 border border-neutral-800 shadow-2xl flex flex-col min-h-[600px]" id="image-cropper-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-400" /> Align & Crop Portrait
          </h3>
          <p className="text-xs text-neutral-400 mt-1">Center your face inside the frame and crop for the best corporate studio results.</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
          title="Cancel and choose another file"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewport Box */}
      <div 
        ref={containerRef}
        className="flex-1 relative aspect-square md:max-h-[420px] bg-neutral-950 rounded-2xl overflow-hidden cursor-move select-none border border-neutral-800"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Rendered Image under crop window */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Source to crop"
            draggable={false}
            className="max-w-[75%] max-h-[75%] pointer-events-none origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        </div>

        {/* Viewport Mask and Crop Window */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/60">
          <div
            ref={cropFrameRef}
            className={`w-[260px] h-[260px] md:w-[320px] md:h-[320px] bg-transparent pointer-events-none relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] border-2 border-indigo-500 transition-all duration-300 ${
              cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
          >
            {/* Rule of Thirds Grid overlay */}
            <div 
              className={`absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-300 ${
                showGrid ? 'opacity-40' : 'opacity-0'
              }`}
            >
              <div className="border-r border-b border-indigo-400/55"></div>
              <div className="border-r border-b border-indigo-400/55"></div>
              <div className="border-b border-indigo-400/55"></div>
              <div className="border-r border-b border-indigo-400/55"></div>
              <div className="border-r border-b border-indigo-400/55"></div>
              <div className="border-b border-indigo-400/55"></div>
              <div className="border-r border-indigo-400/55"></div>
              <div className="border-r border-indigo-400/55"></div>
              <div></div>
            </div>

            {/* Corner Markers */}
            {cropShape === 'square' && (
              <>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-[3px] -ml-[3px] rounded-tl-sm"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-[3px] -mr-[3px] rounded-tr-sm"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-[3px] -ml-[3px] rounded-bl-sm"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-[3px] -mr-[3px] rounded-br-sm"></div>
              </>
            )}
          </div>
        </div>

        {/* Tip Badge */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/75 backdrop-blur-sm rounded-full text-[10px] font-medium tracking-wide text-neutral-300 pointer-events-none flex items-center gap-1.5 border border-neutral-800">
          <Grid className="w-3 h-3 text-indigo-400" /> Drag to position face
        </div>
      </div>

      {/* Cropper Controls & Actions */}
      <div className="mt-6 space-y-5">
        
        {/* Zoom & Rotate Slider Controls */}
        <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800/80 space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-neutral-400" />
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <ZoomIn className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-mono text-neutral-400 min-w-[32px] text-right">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-800/50">
            {/* Crop Shape Selection */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setCropShape('square')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  cropShape === 'square' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" /> Square
              </button>
              <button
                onClick={() => setCropShape('circle')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  cropShape === 'circle' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Circle className="w-3.5 h-3.5" /> Circle
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={rotateImage}
                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5"
                title="Rotate image 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            className="py-3.5 px-6 border border-neutral-800 hover:bg-neutral-900 rounded-xl font-medium text-neutral-300 hover:text-white transition-all text-sm flex items-center justify-center gap-2"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-semibold text-white transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
            id="apply-crop-button"
          >
            <Check className="w-4 h-4" /> Crop & Continue
          </button>
        </div>

      </div>
    </div>
  );
}
