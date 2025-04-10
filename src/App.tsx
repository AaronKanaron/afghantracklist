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

interface BodyUpdateParams {
  mass: number;
  radius: number;
  position_x: number;
  position_y: number;
  velocity_x: number;
  velocity_y: number;
  color: string;
}

function App(): JSX.Element {
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const isUpdating = useRef<boolean>(false);
  const manuallyUpdated = useRef<boolean>(false);

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

  useEffect(() => {
    if (!simState) return;

    const runSimulation = async (timestamp: number): Promise<void> => {
      const frameInterval = 16.7; 
      const elapsed = timestamp - lastUpdateTime.current;

      if (simState.is_running && elapsed >= frameInterval && !isUpdating.current) {
        isUpdating.current = true;
        
        try {
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
  }, [simState?.is_running]);

  const toggleSimulation = async (): Promise<void> => {
    if (!simState) return;
    
    try {
      await invoke('set_simulation_running', { running: !simState.is_running });
      if (simState.is_running) {
        const state = await invoke<SimulationState>('get_simulation_state');
        setSimState(state);
      } else {
        setSimState(prev => prev ? { ...prev, is_running: !prev.is_running } : null);
      }
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

  const handleBodyUpdate = async (id: number, updates: BodyUpdateParams): Promise<void> => {
    if (!simState) return;
    
    try {
      if (simState.is_running) {
        await invoke('set_simulation_running', { running: false });
      }

      console.log("Updating body with ID:", id, "Updates:", updates);
      
      await invoke('update_body', {
        id,
        mass: updates.mass,
        position_x: updates.position_x,
        position_y: updates.position_y,
        velocity_x: updates.velocity_x,
        velocity_y: updates.velocity_y,
        radius: updates.radius,
        color: updates.color
      });
      
      manuallyUpdated.current = true;
      
      const state = await invoke<SimulationState>('get_simulation_state');
      
      setSimState({
        ...state,
        is_running: false
      });
      
      console.log("Body updated successfully");
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