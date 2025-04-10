import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import "./control-panel.scss";

interface ControlPanelProps {
    isRunning: boolean;
    onToggleSimulation: () => Promise<void>;
    onResetSimulation: () => Promise<void>;
    elapsedTime: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    isRunning, 
    onToggleSimulation, 
    onResetSimulation, 
    elapsedTime 
}) => {
    const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
    
    // Set initial speed multiplier when component mounts
    useEffect(() => {
        // Set the default multiplier when the component first loads
        invoke('set_time_multiplier', { multiplier: 1.0 })
            .then(() => console.log('Initial time multiplier set to 1.0'))
            .catch(err => console.error('Error setting initial time multiplier:', err));
    }, []);
    
    // Handle speed multiplier change
    const handleSpeedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setSpeedMultiplier(value);
        
        try {
            // Update the time multiplier in the backend
            await invoke('set_time_multiplier', { multiplier: value });
            console.log('Time multiplier set to:', value);
        } catch (error) {
            console.error('Error setting time multiplier:', error);
        }
    };
    
    // Speed presets
    const speedPresets = [
        { label: '0.5x', value: 0.5 },
        { label: '1x', value: 1 },
        { label: '2x', value: 2 },
        { label: '5x', value: 5 },
        { label: '10x', value: 10 },
        { label: '50x', value: 50 } // Added 50x option
    ];
    
    // Apply a preset speed
    const applySpeedPreset = async (value: number) => {
        setSpeedMultiplier(value);
        
        try {
            await invoke('set_time_multiplier', { multiplier: value });
            console.log('Speed preset applied:', value);
        } catch (error) {
            console.error('Error setting time multiplier from preset:', error);
        }
    };
    
    return (
        <div className="control-panel">
            <h3>Simulation Controls</h3>
            
            <div className="control-row">
                <button 
                    className={`control-button ${isRunning ? 'stop' : 'start'}`} 
                    onClick={onToggleSimulation}
                >
                    {isRunning ? "Pause" : "Start"}
                </button>
                
                <button 
                    className="control-button reset"
                    onClick={onResetSimulation}
                >
                    Reset
                </button>
            </div>
            
            <div className="simulation-stats">
                <div className="stat">
                    <span>Elapsed Time:</span>
                    <span>{elapsedTime.toFixed(2)}</span>
                </div>
                <div className="stat">
                    <span>Speed:</span>
                    <span>{speedMultiplier.toFixed(1)}x</span>
                </div>
            </div>
            
            <div className="speed-control">
                <h4>Simulation Speed</h4>
                
                <div className="speed-slider">
                    <input
                        type="range"
                        min="0.1"
                        max="50" // Increased max value to support 50x
                        step="0.1"
                        value={speedMultiplier}
                        onChange={handleSpeedChange}
                    />
                    <span>{speedMultiplier.toFixed(1)}x</span>
                </div>
                
                <div className="speed-presets">
                    {speedPresets.map(preset => (
                        <button
                            key={preset.value}
                            className={`speed-preset ${Math.abs(speedMultiplier - preset.value) < 0.01 ? 'active' : ''}`}
                            onClick={() => applySpeedPreset(preset.value)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};