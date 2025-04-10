import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.scss";
import Navbar from "./components/navbar/navbar";
import { SimulationCanvas } from "./components/simulation/SimulationCanvas";
import { ControlPanel } from "./components/simulation/ControlPanel";
import BodyEditor from "./components/simulation/BodyEditor";

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

interface SimulationState {
  bodies: Body[];
  is_running: boolean;
  elapsed_time: number;
  time_multiplier: number;
}

interface BodyUpdate {
  position_x?: number;
  position_y?: number;
  velocity_x?: number;
  velocity_y?: number;
  mass?: number;
  radius?: number;
  color?: string;
}

function App(): JSX.Element {
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const isUpdating = useRef<boolean>(false);

  // Initialize simulation
  useEffect(() => {
    async function initializeSimulation(): Promise<void> {
      const state = await invoke<SimulationState>("get_simulation_state");
      setSimState(state);
    }

    initializeSimulation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Optimized animation loop with frame rate limiting
  useEffect(() => {
    if (!simState) return;

    const runSimulation = async (timestamp: number): Promise<void> => {
      // Limit updates to 60 FPS (approx 16.7ms between frames)
      const frameInterval = 16.7; 
      const elapsed = timestamp - lastUpdateTime.current;

      if (simState.is_running && elapsed >= frameInterval && !isUpdating.current) {
        isUpdating.current = true;
        
        try {
          // Step the simulation in the backend
          const updatedState = await invoke<SimulationState>("step_simulation");
          setSimState(updatedState);
          lastUpdateTime.current = timestamp;
        } catch (error) {
          console.error("Error stepping simulation:", error);
        } finally {
          isUpdating.current = false;
        }
      }

      animationFrameId.current = requestAnimationFrame(runSimulation);
    };

    animationFrameId.current = requestAnimationFrame(runSimulation);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [simState?.is_running]); // Only depend on is_running to prevent unnecessary re-renders

  const toggleSimulation = async (): Promise<void> => {
    if (!simState) return;
    
    try {
      await invoke('set_simulation_running', { running: !simState.is_running });
      setSimState(prev => prev ? { ...prev, is_running: !prev.is_running } : null);
    } catch (error) {
      console.error("Error toggling simulation:", error);
    }
  };
  
  const resetSimulation = async (): Promise<void> => {
    try {
      await invoke('reset_simulation');
      const state = await invoke<SimulationState>('get_simulation_state');
      setSimState(state);
      setSelectedBodyId(null);
    } catch (error) {
      console.error("Error resetting simulation:", error);
    }
  };

  const handleBodySelection = (id: number | null): void => {
    setSelectedBodyId(id);
  };

  const handleBodyUpdate = async (id: number, updates: BodyUpdate): Promise<void> => {
    try {
      await invoke('update_body', {
        id,
        ...updates
      });
      
      // Refresh the simulation state to reflect changes
      const state = await invoke<SimulationState>('get_simulation_state');
      setSimState(state);
    } catch (error) {
      console.error("Error updating body:", error);
    }
  };

  if (!simState) return <div>Loading simulation...</div>;

  return (
    <main className="container">
      <Navbar />

      <div className="content">
        <SimulationCanvas 
          bodies={simState.bodies}
          onBodyClick={handleBodySelection}
        />

        <div className="controls-container">
          <ControlPanel
            isRunning={simState.is_running}
            onToggleSimulation={toggleSimulation}
            onResetSimulation={resetSimulation}
            elapsedTime={simState.elapsed_time}
          />

          {selectedBodyId && (
            <BodyEditor 
              body={simState.bodies.find(b => b.id === selectedBodyId)}
              onUpdate={(updates) => handleBodyUpdate(selectedBodyId, updates)}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default App;