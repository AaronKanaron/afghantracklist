import { SetStateAction, useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
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
}

interface BodyUpdate {
  position?: {
    x: number;
    y: number;
  };
  velocity?: {
    x: number;
    y: number;
  };
  mass?: number;
  color?: string;
}

function App(): JSX.Element {
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const animationFrameId = useRef<number | null>(null);

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
  }, [])

  //Update koden
  useEffect(() => {
    if (!simState) return;

    const runSimulation = async (): Promise<void> => {
      if (simState.is_running) {
        const updatedState = await invoke<SimulationState>("step_simulation");
        setSimState(updatedState);
      }
      animationFrameId.current = requestAnimationFrame(runSimulation);
    };

    animationFrameId.current = requestAnimationFrame(runSimulation);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [simState]);

  const toggleSimulation = async (): Promise<void> => {
    if (!simState) return;
    await invoke('set_simulation_running', { running: !simState.is_running });
    setSimState(prev => prev ? { ...prev, is_running: !prev.is_running } : null);
  };
  
  const resetSimulation = async (): Promise<void> => {
    await invoke('reset_simulation');
    const state = await invoke<SimulationState>('get_simulation_state');
    setSimState(state);
    setSelectedBodyId(null);
  };

  const handleBodySelection = (id: number | null): void => {
    setSelectedBodyId(id);
  }

  const handleBodyUpdate = async (id: number, updates: BodyUpdate): Promise<void> => {
    await invoke('update_body', {
      id,
      ...updates
    });
    
    const state = await invoke<SimulationState>('get_simulation_state');
    setSimState(state);
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
            isRunning = {simState?.is_running || false}
            onToggleSimulation={toggleSimulation}
            onResetSimulation={resetSimulation}
            elapsedTime={simState?.elapsed_time || 0}
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
