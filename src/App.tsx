import React, { useState, useCallback } from 'react';
import { HandCanvas } from './components/HandCanvas';
import { HeaderBrand } from './components/HeaderBrand';
import { ControlHUD } from './components/ControlHUD';
import { InfoModal } from './components/InfoModal';
import { CameraPermissionModal } from './components/CameraPermissionModal';
import { THEMES, ColorTheme } from './utils/themes';
import { soundFx } from './utils/audio';

export default function App() {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [showCameraFeed, setShowCameraFeed] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(THEMES[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [snapshotTrigger, setSnapshotTrigger] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [handCount, setHandCount] = useState<number>(0);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<'permission_denied' | 'not_found' | 'in_use' | 'https_required' | 'unknown' | null>(null);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [canvasKey, setCanvasKey] = useState<number>(0);

  // Toggle Camera Facing Mode (Front <-> Rear)
  const handleToggleCamera = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // Mirror front camera by default, don't mirror rear camera
    setIsMirrored(nextMode === 'user');
    soundFx.playSnapshotSound();
  }, [facingMode]);

  // Toggle Mirror
  const handleToggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Toggle Camera Feed (AR passthrough vs Cyber Black Void)
  const handleToggleCameraFeed = useCallback(() => {
    setShowCameraFeed((prev) => !prev);
  }, []);

  // Toggle Sound Mute
  const handleToggleMute = useCallback(() => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  }, []);

  // Clear Canvas Drawings
  const handleClearDrawing = useCallback(() => {
    setClearTrigger((prev) => prev + 1);
    soundFx.triggerHaptic(30);
  }, []);

  // Snapshot Trigger
  const handleTakeSnapshot = useCallback(() => {
    setSnapshotTrigger((prev) => prev + 1);
  }, []);

  // Tracking Status Change
  const handleTrackingStatusChange = useCallback((tracking: boolean, count: number) => {
    setIsTracking(tracking);
    setHandCount(count);
  }, []);

  // Error Handler
  const handleCameraError = useCallback((type: 'permission_denied' | 'not_found' | 'in_use' | 'https_required' | 'unknown', message?: string) => {
    setCameraError(type);
    if (message) setCameraErrorMessage(message);
  }, []);

  // Retry Camera
  const handleRetryCamera = useCallback(() => {
    setCameraError(null);
    setCanvasKey((prev) => prev + 1);
  }, []);

  // Continue with touch mode (dismiss error)
  const handleContinueTouchMode = useCallback(() => {
    setCameraError(null);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Brand Header: "abdurazokhov" with live status */}
      <HeaderBrand 
        isTracking={isTracking} 
        handCount={handCount} 
        themePrimary={currentTheme.primary} 
      />

      {/* Main Hand Tracking & Interactive Hologram Canvas */}
      <HandCanvas
        key={canvasKey}
        facingMode={facingMode}
        isMirrored={isMirrored}
        showCameraFeed={showCameraFeed}
        currentTheme={currentTheme}
        onTrackingStatusChange={handleTrackingStatusChange}
        onError={handleCameraError}
        clearTrigger={clearTrigger}
        snapshotTrigger={snapshotTrigger}
      />

      {/* Bottom Floating Control HUD */}
      <ControlHUD
        facingMode={facingMode}
        onToggleCamera={handleToggleCamera}
        isMirrored={isMirrored}
        onToggleMirror={handleToggleMirror}
        showCameraFeed={showCameraFeed}
        onToggleCameraFeed={handleToggleCameraFeed}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onClearDrawing={handleClearDrawing}
        onTakeSnapshot={handleTakeSnapshot}
        onOpenInfo={() => setShowInfoModal(true)}
      />

      {/* Info / Instructions Modal (Opened on demand, zero screen clutter!) */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        primaryColor={currentTheme.primary}
      />

      {/* Camera Permission & Error Modal */}
      <CameraPermissionModal
        errorType={cameraError}
        errorMessage={cameraErrorMessage}
        onRetry={handleRetryCamera}
        onContinueTouchMode={handleContinueTouchMode}
        primaryColor={currentTheme.primary}
      />
    </main>
  );
}
