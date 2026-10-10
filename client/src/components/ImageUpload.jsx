import { useRef, useState, useEffect } from 'react';
import { CloudArrowUpIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Webcam from "react-webcam";
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ImageUpload = ({ onImageSelect, label = 'Upload Image', maxSize = 15 }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const webcamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  
  const getCameraConstraints = () => {
   
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      return navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
       
          const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          
        
          const frontCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('front') || 
            device.label.toLowerCase().includes('face') ||
            device.label.toLowerCase().includes('user')
          );
          
       
          if (backCamera) {
            return { deviceId: backCamera.deviceId };
          } else {
            return { facingMode: 'environment' };
          }
        })
        .catch(() => {
          
          return { facingMode: 'environment' };
        });
    }
    
    
    return Promise.resolve({ facingMode: 'environment' });
  };

  const handleCameraClick = async (e) => {
    e.stopPropagation();
    setShowOptions(false);
    setCameraReady(false);
    setCameraError(false);
    setShowCamera(true);
  };

  const handleCameraLoad = () => {
    setCameraReady(true);
    setCameraError(false);
  };

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setCameraError(true);
    setCameraReady(false);
    
    
    if (error.message && error.message.includes('Permission')) {
      toast.error('Camera permission denied. Please allow camera access and try again.');
    } else if (error.message && error.message.includes('NotFound')) {
      toast.error('No camera found on this device.');
    } else if (error.message && error.message.includes('NotAllowed')) {
      toast.error('Camera access blocked. Please check your browser settings.');
    } else {
      toast.error('Failed to access camera. Please check your camera and try again.');
    }
  };

  const capturePhoto = async () => {
    if (!webcamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }

    try {
      const blob = await fetch(imageSrc).then((r) => r.blob());

      const file = new File(
        [blob],
        `photo-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      handleFileSelect(file);
      setShowCamera(false);
      setCameraReady(false);
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to save captured image');
    }
  };

 
  useEffect(() => {
    if (!showCamera) {
      setCameraReady(false);
      setCameraError(false);
    }
  }, [showCamera]);

 
const handleFileSelect = (file) => {
  if (!file) return;

  if (file.size > maxSize * 1024 * 1024) {
    toast.error(`File size exceeds ${maxSize}MB limit`);
    return;
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    toast.error('Invalid file type. Please upload JPEG, PNG, GIF, or WEBP');
    return;
  }

 
  const reader = new FileReader();
  reader.onloadend = () => {
    onImageSelect(file, reader.result);
  };
  reader.readAsDataURL(file);
  setShowOptions(false);
};

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleGalleryClick = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setShowOptions(false);
  };

  return (
    <>
     
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => setShowOptions(true)}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 group-hover:text-green-500 transition-colors" />
        <p className="mt-2 text-sm text-gray-600">
          {label}
        </p>
        <p className="text-xs text-gray-500">
          Click to upload (Max {maxSize}MB)
        </p>
      </div>

     
      <AnimatePresence>
        {showOptions && (
          <>
           
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowOptions(false)}
            />

           
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
            >
              <div className="p-4">
                
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>

                
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Choose Option</h3>
                  <button
                    onClick={() => setShowOptions(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                
                <div className="space-y-3">
                 
                  <button
                    onClick={handleCameraClick}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all duration-200 border-2 border-green-200 hover:border-green-400"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <CameraIcon className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-green-800 text-base">Take Photo</div>
                      <div className="text-sm text-green-600">Open camera to capture</div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Camera</span>
                  </button>

                  
                  <button
                    onClick={handleGalleryClick}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-200 border-2 border-blue-200 hover:border-blue-400"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <PhotoIcon className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-blue-800 text-base">Choose from Gallery</div>
                      <div className="text-sm text-blue-600">Select from your device</div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">Gallery</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowOptions(false)}
                  className="w-full mt-4 py-3.5 text-center text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

     
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileSelect(file);
            e.target.value = '';
          }
        }}
      />

    
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setShowCamera(false)}
          >
            <motion.div 
              className="bg-white rounded-xl p-4 w-full max-w-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
             
              {!cameraReady && !cameraError && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Initializing camera...</p>
                  <p className="text-sm text-gray-400">Using back camera if available</p>
                </div>
              )}

              
              {cameraError && (
                <div className="flex flex-col items-center justify-center h-64 p-4">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-gray-800 font-semibold text-center">Camera Unavailable</p>
                  <p className="text-gray-600 text-sm text-center mt-2">
                    Please check your camera permissions and try again.
                  </p>
                  <button
                    onClick={() => {
                      setCameraError(false);
                      setCameraReady(false);
                      setShowCamera(false);
                      setTimeout(() => setShowCamera(true), 100);
                    }}
                    className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

             
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className={`rounded-lg w-full ${!cameraReady ? 'hidden' : ''}`}
                videoConstraints={{
                  facingMode: 'environment',
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
                onUserMedia={handleCameraLoad}
                onUserMediaError={handleCameraError}
                mirrored={false}
              />

              
              {cameraReady && (
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setShowCamera(false)}
                    className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors text-white font-medium flex items-center gap-2"
                  >
                    <span>📸</span>
                    Capture
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageUpload;