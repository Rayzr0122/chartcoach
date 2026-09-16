"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to manage fluid motion-graphics entrance and exit animations for modals.
 * Allows exit animations to play gracefully before unmounting from the DOM.
 */
export function useModalAnimation(isOpen: boolean, onClose: () => void, exitDuration = 220) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const prevIsOpenRef = useRef(isOpen);
  const closingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track transitions of isOpen from parent
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      // Transition from closed -> open: mount and reset closing state
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
        closingTimeoutRef.current = null;
      }
      setIsRendered(true);
      setIsClosing(false);
    } else if (wasOpen && !isOpen) {
      // Transition from open -> closed triggered by parent externally
      if (!isClosing && isRendered) {
        setIsClosing(true);
        closingTimeoutRef.current = setTimeout(() => {
          setIsClosing(false);
          setIsRendered(false);
        }, exitDuration);
      }
    }
  }, [isOpen, isClosing, isRendered, exitDuration]);

  // Graceful exit trigger for internal buttons (close button, backdrop click, cancel, escape)
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
    }
    closingTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      setIsRendered(false);
      onClose();
    }, exitDuration);
  }, [isClosing, onClose, exitDuration]);

  // Handle ESC key gracefully
  useEffect(() => {
    if (!isRendered || isClosing) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRendered, isClosing, handleClose]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isRendered,
    isClosing,
    handleClose,
  };
}
