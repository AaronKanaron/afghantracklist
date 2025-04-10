import React, { useState } from 'react';
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
    
    // Handle speed multiplier change
    const handleSpeedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setSpeedMultiplier(value);
        
        try {
            // Update the time multiplier in the backend
            await invoke('set_time_multiplier', { multiplier: value });
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
        { label: '10x', value: 10 }
    ];
    
    // Apply a preset speed
    const applySpeedPreset = async (value: number) => {
        setSpeedMultiplier(value);
        
        try {
            await invoke('set_time_multiplier', { multiplier: value });
        } catch (error) {
            console.error('Error setting time multiplier:', error);
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
            </div>
            
            <div className="speed-control">
                <h4>Simulation Speed</h4>
                
                <div className="speed-slider">
                    <input
                        type="range"
                        min="0.1"
                        max="10"
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
                            className={`speed-preset ${speedMultiplier === preset.value ? 'active' : ''}`}
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