import React, { useEffect, useRef } from 'react'

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

interface SimulationCanvasProps {
    bodies: Body[];
    onBodyClick: (id: number | null) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ bodies, onBodyClick }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !bodies) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr * 2.0;
        canvas.height = rect.height * dpr* 2.0;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        bodies.forEach(body => {
            const canvasX = centerX + body.position.x;
            const canvasY = centerY + body.position.y;

            ctx.beginPath();
            ctx.arc(canvasX, canvasY, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();

            
        })
    }, [bodies])
    

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!canvasRef.current || !bodies) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        for (const body of bodies) {
            const bodyX = centerX + body.position.x;
            const bodyY = centerY + body.position.y;

            const distance = Math.sqrt(
                Math.pow(clickX - bodyX, 2) + 
                Math.pow(clickY - bodyY, 2)
            );

            if (distance < body.radius) {
                onBodyClick(body.id);
                return;
            }
        }

        onBodyClick(null); // No body clicked
    }

    return (
        <canvas 
            ref={canvasRef}
            className='simulation-canvas'
            onClick={handleCanvasClick}
            style={{width: "100%", height: "100%", background: "#111"}}
        />
    ) 
}
