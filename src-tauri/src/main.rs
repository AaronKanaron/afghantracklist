// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod physics;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            physics::get_simulation_state,
            physics::set_simulation_running,
            physics::reset_simulation,
            physics::step_simulation,
            physics::update_body,
            physics::set_time_multiplier,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
