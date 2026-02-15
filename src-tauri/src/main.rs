// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ccb;
mod db;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 初始化数据库
            let app_handle = app.handle();
            db::init_database(&app_handle)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ccb::ping_provider,
            ccb::ask_provider,
            ccb::cancel_task,
            ccb::get_providers,
            db::get_tasks,
            db::save_task,
            db::get_task_results,
            db::save_task_result,
            db::delete_task_results,
            db::get_task_steps,
            db::save_task_step,
            db::delete_task_steps,
            db::get_collaboration_stats,
            db::upsert_collaboration_stat,
            db::get_best_combo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
