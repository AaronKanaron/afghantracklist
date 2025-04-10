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
    scale: number;        
    offsetX: number;      
    offsetY: number;      
    //Targets for smoother camera
    targetScale: number;  
    targetOffsetX: number;
    targetOffsetY: number;
}

interface SimulationCanvasProps {
    bodies: Body[];
    onBodyClick: (id: number | null) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ bodies, onBodyClick }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [trails, setTrails] = useState<BodyTrail[]>([]);
    const [camera, setCamera] = useState<CameraState>({
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        targetScale: 1.0,
        targetOffsetX: 0,
        targetOffsetY: 0
    });
    const canvasStateRef = useRef({
        scaleFactor: 1,
        centerX: 0,
        centerY: 0,
        width: 0,
        height: 0
    });
    
    const animationRef = useRef<number | null>(null);
    
    const MIN_ZOOM = 0.1;  
    const MAX_ZOOM = 3.0;  
    const PADDING = 50;    
    const MAX_TRAIL_LENGTH = 100; 
    const CAMERA_SMOOTHING = 0.1; 
    
    const calculateBounds = useCallback(() => {
        if (!bodies || bodies.length === 0) return null;
        
        let minX = bodies[0].position.x;
        let maxX = bodies[0].position.x;
        let minY = bodies[0].position.y;
        let maxY = bodies[0].position.y;
        
        bodies.forEach(body => {
            minX = Math.min(minX, body.position.x - body.radius);
            maxX = Math.max(maxX, body.position.x + body.radius);
            minY = Math.min(minY, body.position.y - body.radius);
            maxY = Math.max(maxY, body.position.y + body.radius);
            
            const trail = trails.find(t => t.id === body.id);
            if (trail && trail.positions.length > 0) {
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
    
    const updateCamera = useCallback(() => {
        if (!canvasRef.current) return;
        
        const bounds = calculateBounds();
        if (!bounds) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const boundsWidth = bounds.maxX - bounds.minX + PADDING * 2;
        const boundsHeight = bounds.maxY - bounds.minY + PADDING * 2;
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        const scaleX = rect.width / boundsWidth;
        const scaleY = rect.height / boundsHeight;
        let scale = Math.min(scaleX, scaleY);
        
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
        
        setCamera(prev => ({
            ...prev,
            targetScale: scale,
            targetOffsetX: -centerX,
            targetOffsetY: -centerY
        }));
    }, [calculateBounds]);
    
    const animateCamera = useCallback(() => {
        setCamera(prev => {
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
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(animateCamera);
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animateCamera]);
    
    useEffect(() => {
        updateCamera();
    }, [bodies, updateCamera]);
    
    useEffect(() => {
        if (!bodies || bodies.length === 0) return;
        
        setTrails(prevTrails => {
            const trailMap = new Map<number, BodyTrail>();
            prevTrails.forEach(trail => trailMap.set(trail.id, trail));
            
            return bodies.map(body => {
                const existingTrail = trailMap.get(body.id);
                const positions = existingTrail 
                    ? [...existingTrail.positions, { ...body.position }] 
                    : [{ ...body.position }];
                
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
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        canvasStateRef.current = {
            scaleFactor: dpr,
            centerX: rect.width / 2,
            centerY: rect.height / 2,
            width: rect.width,
            height: rect.height
        };

        ctx.clearRect(0, 0, rect.width, rect.height);
        
        ctx.save();
        ctx.translate(rect.width / 2, rect.height / 2); 
        ctx.scale(camera.scale, camera.scale);          
        ctx.translate(camera.offsetX, camera.offsetY);  

        trails.forEach(trail => {
            if (trail.positions.length < 2) return;
            
            ctx.beginPath();
            
            const firstPos = trail.positions[0];
            ctx.moveTo(firstPos.x, firstPos.y);
            
            for (let i = 1; i < trail.positions.length; i++) {
                const pos = trail.positions[i];
                
                const opacity = 0.1 + (i / trail.positions.length) * 0.9;
                
                const hexColor = trail.color.replace('#', '');
                const r = parseInt(hexColor.substring(0, 2), 16);
                const g = parseInt(hexColor.substring(2, 4), 16);
                const b = parseInt(hexColor.substring(4, 6), 16);
                
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.lineWidth = 2 / camera.scale;
                
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }
        });

        bodies.forEach(body => {
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(body.position.x, body.position.y);
            ctx.lineTo(
                body.position.x + body.velocity.x * 0.1,
                body.position.y + body.velocity.y * 0.1
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2 / camera.scale;
            ctx.stroke();
            
            ctx.font = `${12 / camera.scale}px Arial`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${body.id}`, 
                body.position.x, 
                body.position.y - body.radius - (10 / camera.scale)
            );
        });
        
        ctx.restore();
        
    }, [bodies, trails, camera]);
    
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!canvasRef.current || !bodies) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const simX = ((clickX - centerX) / camera.scale) - camera.offsetX;
        const simY = ((clickY - centerY) / camera.scale) - camera.offsetY;

        for (const body of bodies) {
            const distance = Math.sqrt(
                Math.pow(simX - body.position.x, 2) + 
                Math.pow(simY - body.position.y, 2)
            );

            if (distance <= body.radius) {
                onBodyClick(body.id);
                return;
            }
        }

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
                // background: "#111",
                display: "block"
            }}
        />
    );
};