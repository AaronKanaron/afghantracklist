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
    // Alla måste börja med en vel relativt till annat obj. ex. solen för planeter / planet för månar
    pub fn new() -> Self {
        let g = 6.67430e-1; 
        
        let mut bodies = Vec::new();
        
        // solen
        bodies.push(Body {
            id: 1,
            mass: 8.0e3,
            position: Vec2::new(0.0, 0.0),
            velocity: Vec2::new(0.0, 0.0),
            radius: 25.0,
            color: String::from("#ffcc00"),
        });
        
        let sun_mass = 8.0e3;
        
        let planet_data = [
            (1.0e3, 120.0, 10.0, "#ff9999"), //planet 1
            (1.5e3, 200.0, 12.0, "#3366ff"), //planet 2
            (3.0e3, 350.0, 18.0, "#ff6600"), //planet 3
            (2.0e3, 450.0, 15.0, "#33ccff"), //planet 4
        ];
        
        for (i, (mass, distance, radius, color)) in planet_data.iter().enumerate() {
            let orbital_speed = f64::sqrt(g * sun_mass / distance);
            
            let angle = std::f64::consts::PI * 2.0 * (i as f64) / planet_data.len() as f64;
            
            let pos_x = angle.cos() * distance;
            let pos_y = angle.sin() * distance;
            
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
        
        // Skapa månar för planet 3
        let planet_index = 2;
        
        let planet_mass: f64;
        let planet_pos_x: f64;
        let planet_pos_y: f64; 
        let planet_vel_x: f64;
        let planet_vel_y: f64;
        
        {
            let planet = &bodies[planet_index];
            planet_mass = planet.mass;
            planet_pos_x = planet.position.x;
            planet_pos_y = planet.position.y;
            planet_vel_x = planet.velocity.x;
            planet_vel_y = planet.velocity.y;
        }
        
        let moon_data = [
            (100.0, 35.0, 4.0, "#cccccc"), //Bigger moon
            (50.0, 25.0, 3.0, "#aaaaaa"), //Smaller moon
        ];
        
        for (i, (mass, distance, radius, color)) in moon_data.iter().enumerate() {
            let orbital_speed = f64::sqrt(g * planet_mass / distance);
            
            let angle = std::f64::consts::PI * (i as f64) / moon_data.len() as f64;
            
            let pos_x = planet_pos_x + angle.cos() * distance;
            let pos_y = planet_pos_y + angle.sin() * distance;
            
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
            time_multiplier: 1.0,
            gravity_constant: g,
            is_running: false,
            elapsed_time: 0.0,
        }
    }
    
    pub fn step(&mut self) {
        if !self.is_running {
            return;
        }
        
        let effective_time_step = self.time_step * self.time_multiplier;
        
        let forces = self.calculate_forces();
        
        for (i, body) in self.bodies.iter_mut().enumerate() {
            let force = &forces[i];
            let acc_x = force.x / body.mass;
            let acc_y = force.y / body.mass;
            
            body.velocity.x += acc_x * effective_time_step;
            body.velocity.y += acc_y * effective_time_step;
            
            body.position.x += body.velocity.x * effective_time_step;
            body.position.y += body.velocity.y * effective_time_step;
        }
        
        self.handle_collisions();
        
        self.elapsed_time += effective_time_step;
    }
    
    fn handle_collisions(&mut self) {
        let mut collision_data = Vec::new();
        
        for i in 0..self.bodies.len() {
            for j in (i+1)..self.bodies.len() {
                let body1 = &self.bodies[i];
                let body2 = &self.bodies[j];
                
                let distance = body1.position.distance(&body2.position);
                
                if distance < body1.radius + body2.radius {
                    let dx = body2.position.x - body1.position.x;
                    let dy = body2.position.y - body1.position.y;
                    let inv_dist = 1.0 / distance.max(0.001);
                    let nx = dx * inv_dist;
                    let ny = dy * inv_dist;
                    
                    let dvx = body2.velocity.x - body1.velocity.x;
                    let dvy = body2.velocity.y - body1.velocity.y;
                    let relative_vel_dot_normal = dvx * nx + dvy * ny;
                    
                    if relative_vel_dot_normal < 0.0 {
                        let restitution = 0.7;
                        let inv_mass1 = 1.0 / body1.mass;
                        let inv_mass2 = 1.0 / body2.mass;
                        let impulse_scalar = -(1.0 + restitution) * relative_vel_dot_normal /
                                            (inv_mass1 + inv_mass2);
                        
                        let impulse_x = impulse_scalar * nx;
                        let impulse_y = impulse_scalar * ny;
                        
                        let vel_change_i = Vec2::new(
                            -impulse_x * inv_mass1,
                            -impulse_y * inv_mass1
                        );
                        
                        let vel_change_j = Vec2::new(
                            impulse_x * inv_mass2,
                            impulse_y * inv_mass2
                        );
                        
                        let penetration = (body1.radius + body2.radius) - distance;
                        let percent = 0.4; 
                        let correction_x = nx * penetration * percent;
                        let correction_y = ny * penetration * percent;
                        
                        let pos_corr_i = Vec2::new(
                            -correction_x * inv_mass1 / (inv_mass1 + inv_mass2),
                            -correction_y * inv_mass1 / (inv_mass1 + inv_mass2)
                        );
                        
                        let pos_corr_j = Vec2::new(
                            correction_x * inv_mass2 / (inv_mass1 + inv_mass2),
                            correction_y * inv_mass2 / (inv_mass1 + inv_mass2)
                        );
                        
                        collision_data.push((i, j, vel_change_i, vel_change_j, pos_corr_i, pos_corr_j));
                    }
                }
            }
        }
        
        for (i, j, vel_i, vel_j, pos_i, pos_j) in collision_data {
            self.bodies[i].velocity.x += vel_i.x;
            self.bodies[i].velocity.y += vel_i.y;
            self.bodies[j].velocity.x += vel_j.x;
            self.bodies[j].velocity.y += vel_j.y;
            
            self.bodies[i].position.x += pos_i.x;
            self.bodies[i].position.y += pos_i.y;
            self.bodies[j].position.x += pos_j.x;
            self.bodies[j].position.y += pos_j.y;
        }
    }
    
    fn calculate_forces(&self) -> Vec<Vec2> {
        let mut forces = vec![Vec2::new(0.0, 0.0); self.bodies.len()];
        
        for i in 0..self.bodies.len() {
            for j in (i+1)..self.bodies.len() {
                let body1 = &self.bodies[i];
                let body2 = &self.bodies[j];
                
                let dist = body1.position.distance(&body2.position);
                
                let min_dist = (body1.radius + body2.radius) * 0.8;
                let clamped_dist = dist.max(min_dist);
                
                let force_magnitude = self.gravity_constant * body1.mass * body2.mass / (clamped_dist * clamped_dist);
                
                let dx = body2.position.x - body1.position.x;
                let dy = body2.position.y - body1.position.y;
                
                let force_x = force_magnitude * dx / dist;
                let force_y = force_magnitude * dy / dist;
                
                forces[i].x += force_x;
                forces[i].y += force_y;
                
                forces[j].x -= force_x;
                forces[j].y -= force_y;
            }
        }
        forces
    }
}


lazy_static::lazy_static! {
    static ref SIMULATION: Arc<Mutex<SimulationState>> = Arc::new(Mutex::new(SimulationState::new()));
}

//Tauri commands
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