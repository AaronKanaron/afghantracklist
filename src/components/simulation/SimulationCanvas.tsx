import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Body {
    id: number;
    position: {
        x: number;
        y: number;
    };
    velocity: {
        x: number;
        y: number;
    };
    mass: number;
    radius: number;
    color: string;
}

interface Position {
    x: number;
    y: number;
}

interface BodyTrail {
    id: number;
    positions: Position[];
    color: string;
}

interface CameraState {
    scale: number;        // Scale factor (zoom)
    offsetX: number;      // X offset for panning
    offsetY: number;      // Y offset for panning
    targetScale: number;  // Target scale for smooth animation
    targetOffsetX: number;// Target X offset for smooth animation
    targetOffsetY: number;// Target Y offset for smooth animation
}

interface SimulationCanvasProps {
    bodies: Body[];
    onBodyClick: (id: number | null) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ bodies, onBodyClick }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Store the trails for each body
    const [trails, setTrails] = useState<BodyTrail[]>([]);
    // Camera state for zooming and panning
    const [camera, setCamera] = useState<CameraState>({
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        targetScale: 1.0,
        targetOffsetX: 0,
        targetOffsetY: 0
    });
    // Store canvas dimensions and scale for click detection
    const canvasStateRef = useRef({
        scaleFactor: 1,
        centerX: 0,
        centerY: 0,
        width: 0,
        height: 0
    });
    
    // Animation frame reference
    const animationRef = useRef<number | null>(null);
    
    // Configuration constants
    const MIN_ZOOM = 0.1;  // Maximum zoom out (minimum scale)
    const MAX_ZOOM = 2.0;  // Maximum zoom in (maximum scale)
    const PADDING = 50;    // Padding around all bodies (in pixels)
    const MAX_TRAIL_LENGTH = 100; // Maximum length of trails
    const CAMERA_SMOOTHING = 0.1; // Camera smoothing factor (0-1)
    
    // Function to calculate bounds of all bodies and their trails
    const calculateBounds = useCallback(() => {
        if (!bodies || bodies.length === 0) return null;
        
        // Initialize bounds with the first body's position
        let minX = bodies[0].position.x;
        let maxX = bodies[0].position.x;
        let minY = bodies[0].position.y;
        let maxY = bodies[0].position.y;
        
        // Update bounds for all bodies and include their radii
        bodies.forEach(body => {
            minX = Math.min(minX, body.position.x - body.radius);
            maxX = Math.max(maxX, body.position.x + body.radius);
            minY = Math.min(minY, body.position.y - body.radius);
            maxY = Math.max(maxY, body.position.y + body.radius);
            
            // Find the body's trail
            const trail = trails.find(t => t.id === body.id);
            if (trail && trail.positions.length > 0) {
                // Include trail positions in bounds calculation
                trail.positions.forEach(pos => {
                    minX = Math.min(minX, pos.x);
                    maxX = Math.max(maxX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxY = Math.max(maxY, pos.y);
                });
            }
        });
        
        return { minX, maxX, minY, maxY };
    }, [bodies, trails]);
    
    // Function to calculate needed camera parameters
    const updateCamera = useCallback(() => {
        if (!canvasRef.current) return;
        
        const bounds = calculateBounds();
        if (!bounds) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate width and height of the bounds
        const boundsWidth = bounds.maxX - bounds.minX + PADDING * 2;
        const boundsHeight = bounds.maxY - bounds.minY + PADDING * 2;
        
        // Calculate center of the bounds
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        // Calculate scale needed to fit bounds in canvas
        const scaleX = rect.width / boundsWidth;
        const scaleY = rect.height / boundsHeight;
        let scale = Math.min(scaleX, scaleY);
        
        // Clamp scale between min and max zoom
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
        
        // Set target camera parameters
        setCamera(prev => ({
            ...prev,
            targetScale: scale,
            targetOffsetX: -centerX,
            targetOffsetY: -centerY
        }));
    }, [calculateBounds]);
    
    // Animation loop for smooth camera movement
    const animateCamera = useCallback(() => {
        setCamera(prev => {
            // Calculate new camera values with smoothing
            const scale = prev.scale + (prev.targetScale - prev.scale) * CAMERA_SMOOTHING;
            const offsetX = prev.offsetX + (prev.targetOffsetX - prev.offsetX) * CAMERA_SMOOTHING;
            const offsetY = prev.offsetY + (prev.targetOffsetY - prev.offsetY) * CAMERA_SMOOTHING;
            
            return {
                ...prev,
                scale,
                offsetX,
                offsetY
            };
        });
        
        animationRef.current = requestAnimationFrame(animateCamera);
    }, []);
    
    // Start camera animation
    useEffect(() => {
        animationRef.current = requestAnimationFrame(animateCamera);
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animateCamera]);
    
    // Update camera when bodies change
    useEffect(() => {
        updateCamera();
    }, [bodies, updateCamera]);
    
    // Update the trails when bodies change position
    useEffect(() => {
        if (!bodies || bodies.length === 0) return;
        
        setTrails(prevTrails => {
            // Create a map of existing trails for quick lookup
            const trailMap = new Map<number, BodyTrail>();
            prevTrails.forEach(trail => trailMap.set(trail.id, trail));
            
            // Update trails for each body
            return bodies.map(body => {
                const existingTrail = trailMap.get(body.id);
                const positions = existingTrail 
                    ? [...existingTrail.positions, { ...body.position }] 
                    : [{ ...body.position }];
                
                // Limit trail length
                const trimmedPositions = positions.slice(-MAX_TRAIL_LENGTH);
                
                return {
                    id: body.id,
                    positions: trimmedPositions,
                    color: body.color
                };
            });
        });
    }, [bodies]);

    // Draw the simulation
    useEffect(() => {
        if (!canvasRef.current || !bodies) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Set canvas size with high DPI support
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        // Store these values for click detection
        canvasStateRef.current = {
            scaleFactor: dpr,
            centerX: rect.width / 2,
            centerY: rect.height / 2,
            width: rect.width,
            height: rect.height
        };

        // Clear the canvas
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Apply camera transformation
        ctx.save();
        ctx.translate(rect.width / 2, rect.height / 2); // Move to center of canvas
        ctx.scale(camera.scale, camera.scale);          // Apply zoom
        ctx.translate(camera.offsetX, camera.offsetY);  // Apply offset

        // Draw trails first (so bodies appear on top)
        trails.forEach(trail => {
            if (trail.positions.length < 2) return;
            
            ctx.beginPath();
            
            // Start at the oldest visible position
            const firstPos = trail.positions[0];
            ctx.moveTo(firstPos.x, firstPos.y);
            
            // Draw lines to each subsequent position
            for (let i = 1; i < trail.positions.length; i++) {
                const pos = trail.positions[i];
                
                // Calculate opacity based on position in the trail (newer = more opaque)
                const opacity = 0.1 + (i / trail.positions.length) * 0.9;
                
                // Parse the color to get RGB components
                const hexColor = trail.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16);
                const g = parseInt(hexColor.substring(2, 4), 16);
                const b = parseInt(hexColor.substring(4, 6), 16);
                
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.lineWidth = 2 / camera.scale; // Adjust line width for zoom
                
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                
                // Start a new segment for the gradient effect
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }
        });

        // Draw bodies
        bodies.forEach(body => {
            // Draw the body
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();

            // Draw velocity vector
            ctx.beginPath();
            ctx.moveTo(body.position.x, body.position.y);
            ctx.lineTo(
                body.position.x + body.velocity.x * 0.1,
                body.position.y + body.velocity.y * 0.1
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2 / camera.scale; // Adjust line width for zoom
            ctx.stroke();
            
            // Draw body ID or mass for easier identification
            ctx.font = `${12 / camera.scale}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${body.id}`, 
                body.position.x, 
                body.position.y - body.radius - (10 / camera.scale)
            );
        });
        
        // Restore the context state
        ctx.restore();
        
    }, [bodies, trails, camera]);
    
    // Handle canvas clicks with camera transformation
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!canvasRef.current || !bodies) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Apply inverse camera transformation to get simulation coordinates
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Translate the click coordinates to simulation space
        const simX = ((clickX - centerX) / camera.scale) - camera.offsetX;
        const simY = ((clickY - centerY) / camera.scale) - camera.offsetY;

        // Check if the click hits any body
        for (const body of bodies) {
            const distance = Math.sqrt(
                Math.pow(simX - body.position.x, 2) + 
                Math.pow(simY - body.position.y, 2)
            );

            // If click is within body radius, select it
            if (distance <= body.radius) {
                onBodyClick(body.id);
                return;
            }
        }

        // No body was clicked
        onBodyClick(null);
    };

    return (
        <canvas 
            ref={canvasRef}
            className='simulation-canvas'
            onClick={handleCanvasClick}
            style={{
                width: "100%", 
                height: "100%", 
                background: "#111",
                display: "block" // Prevents layout issues
            }}
        />
    );
};