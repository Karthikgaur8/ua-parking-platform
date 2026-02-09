'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

// Define types for Vanta
interface VantaEffect {
    destroy: () => void;
}

export default function VantaBackground() {
    const vantaRef = useRef<HTMLDivElement>(null);
    const [vantaEffect, setVantaEffect] = useState<VantaEffect | null>(null);
    const [hasError, setHasError] = useState(false);
    const [threeLoaded, setThreeLoaded] = useState(false);
    const [vantaLoaded, setVantaLoaded] = useState(false);

    // Initialize Vanta when both scripts are ready
    const initVanta = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (vantaEffect) return; // Already initialized
        if (!vantaRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;

        // Check that THREE is fully ready
        if (!win.THREE || !win.THREE.PerspectiveCamera) {
            console.log('THREE.js not ready, waiting...');
            return;
        }

        // Check that VANTA.BIRDS is ready
        if (!win.VANTA || !win.VANTA.BIRDS) {
            console.log('VANTA.BIRDS not ready, waiting...');
            return;
        }

        try {
            console.log('Initializing VANTA.BIRDS...');
            const effect = win.VANTA.BIRDS({
                el: vantaRef.current,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                // Colors - blue/pink theme
                backgroundColor: 0x030712,   // gray-950 (almost black)
                color1: 0x3b82f6,            // Blue
                color2: 0xec4899,            // Pink
                colorMode: 'lerpGradient',
                birdSize: 1.40,              // Medium birds
                wingSpan: 30.00,             // Normal wingspan
                speedLimit: 5.00,            // Slightly faster
                separation: 30.00,           // Normal separation
                alignment: 35.00,            // Higher alignment
                cohesion: 35.00,             // Moderate cohesion
                quantity: 8.00,              // More birds!
            });
            console.log('VANTA.BIRDS initialized successfully');
            setVantaEffect(effect);
        } catch (error) {
            console.error('Failed to initialize VANTA.BIRDS:', error);
            setHasError(true);
        }
    }, [vantaEffect]);

    // Check if scripts are already loaded on mount (from previous navigation)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;

        if (win.THREE && win.THREE.PerspectiveCamera) {
            setThreeLoaded(true);
        }
        if (win.VANTA && win.VANTA.BIRDS) {
            setVantaLoaded(true);
        }
    }, []);

    // Try to initialize when both scripts are loaded
    useEffect(() => {
        if (threeLoaded && vantaLoaded) {
            // Small delay to ensure everything is ready
            const timer = setTimeout(initVanta, 50);
            return () => clearTimeout(timer);
        }
    }, [threeLoaded, vantaLoaded, initVanta]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (vantaEffect) {
                vantaEffect.destroy();
            }
        };
    }, [vantaEffect]);

    const handleThreeLoad = () => {
        console.log('THREE.js loaded');
        setThreeLoaded(true);
    };

    const handleVantaLoad = () => {
        console.log('VANTA.BIRDS loaded');
        setVantaLoaded(true);
    };

    const handleScriptError = () => {
        console.error('Failed to load Vanta.js scripts');
        setHasError(true);
    };

    return (
        <>
            {/* Load THREE.js r134 (required for Vanta BIRDS) */}
            <Script
                src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
                strategy="afterInteractive"
                onLoad={handleThreeLoad}
                onError={handleScriptError}
            />
            {/* Load Vanta BIRDS */}
            <Script
                src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js"
                strategy="afterInteractive"
                onLoad={handleVantaLoad}
                onError={handleScriptError}
            />

            {/* Vanta.js animated background */}
            <div
                ref={vantaRef}
                className={`fixed inset-0 -z-10 transition-opacity duration-500 ${hasError ? 'opacity-0' : 'opacity-100'}`}
                aria-hidden="true"
            />

            {/* CSS fallback gradient background */}
            <div
                className="fixed inset-0 -z-20 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
                aria-hidden="true"
            >
                {/* Animated gradient orbs for fallback */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </>
    );
}
