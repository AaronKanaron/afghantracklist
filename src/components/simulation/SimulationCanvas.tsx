import React, { useEffect, useRef, useState } from 'react'

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

interface SimulationCanvasProps {
    bodies: Body[];
    onBodyClick: (id: number | null) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ bodies, onBodyClick }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Store the trails for each body
    const [trails, setTrails] = useState<BodyTrail[]>([]);
    // Store canvas dimensions and scale for click detection
    const canvasStateRef = useRef({
        scaleFactor: 1,
        centerX: 0,
        centerY: 0,
        width: 0,
        height: 0
    });
    
    // Maximum length of trails
    const MAX_TRAIL_LENGTH = 100;
    
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

        // Draw trails first (so bodies appear on top)
        trails.forEach(trail => {
            if (trail.positions.length < 2) return;
            
            ctx.beginPath();
            
            // Start at the oldest visible position
            const firstPos = trail.positions[0];
            const startX = canvasStateRef.current.centerX + firstPos.x;
            const startY = canvasStateRef.current.centerY + firstPos.y;
            ctx.moveTo(startX, startY);
            
            // Draw lines to each subsequent position
            for (let i = 1; i < trail.positions.length; i++) {
                const pos = trail.positions[i];
                const x = canvasStateRef.current.centerX + pos.x;
                const y = canvasStateRef.current.centerY + pos.y;
                
                // Calculate opacity based on position in the trail (newer = more opaque)
                const opacity = 0.1 + (i / trail.positions.length) * 0.9;
                
                // Parse the color to get RGB components
                const hexColor = trail.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16);
                const g = parseInt(hexColor.substring(2, 4), 16);
                const b = parseInt(hexColor.substring(4, 6), 16);
                
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.lineWidth = 2;
                
                ctx.lineTo(x, y);
                ctx.stroke();
                
                // Start a new segment for the gradient effect
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
        });

        // Draw bodies
        bodies.forEach(body => {
            // Convert simulation coordinates to canvas coordinates
            const canvasX = canvasStateRef.current.centerX + body.position.x;
            const canvasY = canvasStateRef.current.centerY + body.position.y;

            // Draw the body
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();

            // Draw velocity vector
            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
            ctx.lineTo(
                canvasX + body.velocity.x * 0.1,
                canvasY + body.velocity.y * 0.1
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }, [bodies, trails]);
    
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!canvasRef.current || !bodies) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Use the stored center coordinates from the draw function
        const { centerX, centerY } = canvasStateRef.current;

        // Check if the click hits any body
        for (const body of bodies) {
            const bodyX = centerX + body.position.x;
            const bodyY = centerY + body.position.y;

            const distance = Math.sqrt(
                Math.pow(clickX - bodyX, 2) + 
                Math.pow(clickY - bodyY, 2)
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