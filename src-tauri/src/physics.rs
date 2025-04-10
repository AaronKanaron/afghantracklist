use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};

#[derive(Clone, Serialize, Deserialize)]
pub struct Body {
    pub id: u32,
    pub mass: f64,
    pub position: Vec2,
    pub velocity: Vec2,
    pub radius: f64,
    pub color: String,
}

// Vector2 implementation for position and velocity
#[derive(Clone, Copy, Serialize, Deserialize)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
    
    pub fn distance(&self, other: &Vec2) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

// Simulation state
#[derive(Clone, Serialize, Deserialize)]
pub struct SimulationState {
    pub bodies: Vec<Body>,
    pub time_step: f64,
    pub gravity_constant: f64,
    pub is_running: bool,
    pub elapsed_time: f64,
}

impl SimulationState {
    pub fn new() -> Self {
        // Default setup with two bodies
        Self {
            bodies: vec![
                // Body 1 - Sun-like
                Body {
                    id: 1,
                    mass: 1.0e6,
                    position: Vec2::new(0.0, 0.0),
                    velocity: Vec2::new(0.0, 0.0),
                    radius: 30.0,
                    color: String::from("#ffcc00"),
                },
                // Body 2 - Planet-like
                Body {
                    id: 2,
                    mass: 1.0e3,
                    position: Vec2::new(200.0, 0.0),
                    velocity: Vec2::new(0.0, 70.0),
                    radius: 10.0,
                    color: String::from("#3366ff"),
                },
            ],
            time_step: 0.01,
            gravity_constant: 6.67430e-1, // Gravitational constant
            is_running: false,
            elapsed_time: 0.0,
        }
    }
    
    // Step the simulation forward by one time step
    pub fn step(&mut self) {
        if !self.is_running {
            return;
        }
        
        // Calculate forces
        let forces = self.calculate_forces();
        
        // Update velocities and positions
        for (i, body) in self.bodies.iter_mut().enumerate() {
            // Update velocity based on force and mass (F = ma, so a = F/m)
            let force = &forces[i];
            let acc_x = force.x / body.mass;
            let acc_y = force.y / body.mass;
            
            body.velocity.x += acc_x * self.time_step;
            body.velocity.y += acc_y * self.time_step;
            
            // Update position based on velocity
            body.position.x += body.velocity.x * self.time_step;
            body.position.y += body.velocity.y * self.time_step;
        }
        
        self.elapsed_time += self.time_step;
    }
    
    // Calculate gravitational forces between all bodies
    fn calculate_forces(&self) -> Vec<Vec2> {
        let mut forces = vec![Vec2::new(0.0, 0.0); self.bodies.len()];
        
        // For each pair of bodies, calculate the gravitational force
        for i in 0..self.bodies.len() {
            for j in (i+1)..self.bodies.len() {
                let body1 = &self.bodies[i];
                let body2 = &self.bodies[j];
                
                // Calculate distance between bodies
                let dist = body1.position.distance(&body2.position);
                
                // Avoid division by zero or extremely small values
                if dist < 0.1 {
                    continue;
                }
                
                // Calculate gravitational force magnitude: F = G * (m1 * m2) / r^2
                let force_magnitude = self.gravity_constant * body1.mass * body2.mass / (dist * dist);
                
                // Calculate direction components
                let dx = body2.position.x - body1.position.x;
                let dy = body2.position.y - body1.position.y;
                
                // Force components in x and y directions
                let force_x = force_magnitude * dx / dist;
                let force_y = force_magnitude * dy / dist;
                
                // Apply to body1 (force directed towards body2)
                forces[i].x += force_x;
                forces[i].y += force_y;
                
                // Apply equal and opposite force to body2
                forces[j].x -= force_x;
                forces[j].y -= force_y;
            }
        }
        
        forces
    }
}


// Create a global simulation state
lazy_static::lazy_static! {
    static ref SIMULATION: Arc<Mutex<SimulationState>> = Arc::new(Mutex::new(SimulationState::new()));
}

// Tauri commands
#[tauri::command]
pub fn get_simulation_state() -> SimulationState {
    SIMULATION.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_simulation_running(running: bool) {
    SIMULATION.lock().unwrap().is_running = running;
}

#[tauri::command]
pub fn reset_simulation() {
    let mut sim = SIMULATION.lock().unwrap();
    *sim = SimulationState::new();
}

#[tauri::command]
pub fn step_simulation() -> SimulationState {
    let mut sim = SIMULATION.lock().unwrap();
    sim.step();
    sim.clone()
}

#[tauri::command]
pub fn update_body(id: u32, mass: Option<f64>, position_x: Option<f64>, position_y: Option<f64>, 
                    velocity_x: Option<f64>, velocity_y: Option<f64>, radius: Option<f64>, color: Option<String>) {
    let mut sim = SIMULATION.lock().unwrap();
    
    if let Some(body) = sim.bodies.iter_mut().find(|b| b.id == id) {
        if let Some(m) = mass { body.mass = m; }
        if let Some(px) = position_x { body.position.x = px; }
        if let Some(py) = position_y { body.position.y = py; }
        if let Some(vx) = velocity_x { body.velocity.x = vx; }
        if let Some(vy) = velocity_y { body.velocity.y = vy; }
        if let Some(r) = radius { body.radius = r; }
        if let Some(c) = color { body.color = c; }
    }
}