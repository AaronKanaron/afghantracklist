import React from 'react'

interface ControlPanelProps {
    isRunning: boolean;
    onToggleSimulation: () => Promise<void>;
    onResetSimulation: () => Promise<void>;
    elapsedTime: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ isRunning, onToggleSimulation, onResetSimulation, elapsedTime }) => {
    return (
        <div className="control-panel">
            <h3>Sim controls</h3>

            <div className="control-row">
                <button className={`control-button ${isRunning ? 'stop' : 'start'}`} onClick={onToggleSimulation}>{isRunning ? "Pause" : "Start" }</button>
                <button 
                    className="control-button reset"
                    onClick={onResetSimulation}>
                Reset
                </button>
            </div>
        </div>
    )
}