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
    pub time_multiplier: f64,
    pub gravity_constant: f64,
    pub is_running: bool,
    pub elapsed_time: f64,
}

impl SimulationState {
    pub fn new() -> Self {
        // Setup a system with multiple bodies
        let g = 6.67430e-1; // Our simulation gravity constant
        
        // Create a more complex solar system with multiple bodies
        let mut bodies = Vec::new();
        
        // Star (central body)
        bodies.push(Body {
            id: 1,
            mass: 8.0e3,
            position: Vec2::new(0.0, 0.0),
            velocity: Vec2::new(0.0, 0.0),
            radius: 25.0,
            color: String::from("#ffcc00"),
        });
        
        // Store the sun's mass to avoid borrowing issues
        let sun_mass = 8.0e3;
        
        // Add planets at different distances
        let planet_data = [
            // Inner planet (like Mercury)
            (1.0e3, 120.0, 10.0, "#ff9999"), 
            // Medium planet (like Earth)
            (1.5e3, 200.0, 12.0, "#3366ff"),
            // Gas giant (like Jupiter)
            (3.0e3, 350.0, 18.0, "#ff6600"),
            // Outer planet (like Neptune)
            (2.0e3, 450.0, 15.0, "#33ccff"),
        ];
        
        for (i, (mass, distance, radius, color)) in planet_data.iter().enumerate() {
            // Calculate orbital velocity for a circular orbit: v = sqrt(G * M / r)
            let orbital_speed = f64::sqrt(g * sun_mass / distance);
            
            // Random angle for initial position (spread planets around)
            let angle = std::f64::consts::PI * 2.0 * (i as f64) / planet_data.len() as f64;
            
            // Calculate position
            let pos_x = angle.cos() * distance;
            let pos_y = angle.sin() * distance;
            
            // Calculate velocity (perpendicular to radius)
            let vel_x = -angle.sin() * orbital_speed;
            let vel_y = angle.cos() * orbital_speed;
            
            bodies.push(Body {
                id: (i + 2) as u32,
                mass: *mass,
                position: Vec2::new(pos_x, pos_y),
                velocity: Vec2::new(vel_x, vel_y),
                radius: *radius,
                color: String::from(*color),
            });
        }
        
        // Create moons for the gas giant (planet 3)
        // Use separate variables to avoid borrowing issues
        let planet_id = 3; // Gas giant is id 3
        let planet_index = 2; // Adjust for 0-based indexing (3rd body)
        
        // Create copies of the planet's properties to avoid borrow issues
        let planet_mass: f64;
        let planet_pos_x: f64;
        let planet_pos_y: f64; 
        let planet_vel_x: f64;
        let planet_vel_y: f64;
        
        {
            // Access the planet in a separate scope to avoid borrow issues
            let planet = &bodies[planet_index];
            planet_mass = planet.mass;
            planet_pos_x = planet.position.x;
            planet_pos_y = planet.position.y;
            planet_vel_x = planet.velocity.x;
            planet_vel_y = planet.velocity.y;
        }
        
        // Moon data: (mass, distance from planet, radius, color)
        let moon_data = [
            (100.0, 35.0, 4.0, "#cccccc"),  // Bigger moon
            (50.0, 25.0, 3.0, "#aaaaaa"),   // Smaller moon
        ];
        
        for (i, (mass, distance, radius, color)) in moon_data.iter().enumerate() {
            // Calculate orbital velocity for moon
            let orbital_speed = f64::sqrt(g * planet_mass / distance);
            
            // Random angle for initial position
            let angle = std::f64::consts::PI * (i as f64) / moon_data.len() as f64;
            
            // Calculate position (relative to planet)
            let pos_x = planet_pos_x + angle.cos() * distance;
            let pos_y = planet_pos_y + angle.sin() * distance;
            
            // Calculate velocity (perpendicular to radius, added to planet velocity)
            let vel_x = planet_vel_x - angle.sin() * orbital_speed;
            let vel_y = planet_vel_y + angle.cos() * orbital_speed;
            
            bodies.push(Body {
                id: (bodies.len() + 1) as u32,
                mass: *mass,
                position: Vec2::new(pos_x, pos_y),
                velocity: Vec2::new(vel_x, vel_y),
                radius: *radius,
                color: String::from(*color),
            });
        }
        
        Self {
            bodies,
            time_step: 0.01,
            time_multiplier: 1.0, // Default speed
            gravity_constant: g,
            is_running: false,
            elapsed_time: 0.0,
        }
    }
    
    // Step the simulation forward by one time step
    pub fn step(&mut self) {
        if !self.is_running {
            return;
        }
        
        // Apply time multiplier to time step
        let effective_time_step = self.time_step * self.time_multiplier;
        
        // Calculate forces
        let forces = self.calculate_forces();
        
        // Update velocities and positions
        for (i, body) in self.bodies.iter_mut().enumerate() {
            // Update velocity based on force and mass (F = ma, so a = F/m)
            let force = &forces[i];
            let acc_x = force.x / body.mass;
            let acc_y = force.y / body.mass;
            
            body.velocity.x += acc_x * effective_time_step;
            body.velocity.y += acc_y * effective_time_step;
            
            // Update position based on velocity
            body.position.x += body.velocity.x * effective_time_step;
            body.position.y += body.velocity.y * effective_time_step;
        }
        
        self.elapsed_time += effective_time_step;
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
pub fn set_time_multiplier(multiplier: f64) {
    let mut sim = SIMULATION.lock().unwrap();
    sim.time_multiplier = multiplier;
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