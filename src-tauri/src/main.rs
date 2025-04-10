// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use lazy_static::lazy_static;
mod physics;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            physics::get_simulation_state,
            physics::set_simulation_running,
            physics::reset_simulation,
            physics::step_simulation,
            physics::update_body,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
