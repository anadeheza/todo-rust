use axum:: {
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
//use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    sync::{Arc, Mutex},
};
use tower_http::cors::CorsLayer;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Todo {
    id: u32, 
    title: String, 
    done: bool,
}

#[derive(Deserialize)]
struct CreateTodo {
    title: String,
}

#[derive(Deserialize)]
struct UpdateTodo {
    done: Option<bool>,
}

type Db = Arc<Mutex<Vec<Todo>>>;

const FILE: &str = "todos.json";

fn load() -> Vec<Todo> {
    match fs::read_to_string(FILE) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => vec![],
    }
}

fn save(todos: &Vec<Todo>) {
    let json = serde_json::to_string_pretty(todos).expect("serialize failed");
    fs::write(FILE, json).expect("write failed");
}

async fn list(State(db): State<Db>) -> Json<Vec<Todo>> {
    let todos = db.lock().unwrap();
    Json(todos.clone())
}

async fn create(
    State(db): State<Db>, 
    Json(payload): Json<CreateTodo>,
) -> (StatusCode, Json<Todo>) { 
    let mut todos = db.lock().unwrap();
    let id = todos.iter().map(|t| t.id).max().unwrap_or(0) + 1;    let todo =  Todo {
        id,
        title: payload.title,
        done: false,
    };

    todos.push(todo.clone());
    save(&todos);
    (StatusCode::CREATED, Json(todo))
}

async fn update(
    State(db): State<Db>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateTodo>,
) -> Result<Json<Todo>, StatusCode> {
    let mut todos = db.lock().unwrap();
    match todos.iter_mut().find(|t| t.id == id) {
        Some(todo) => {
            if let Some(done) = payload.done {
                todo.done = done;
            }
            let updated = todo.clone();
            save(&todos);
            Ok(Json(updated))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn delete_todo(
    State(db): State<Db>,
    Path(id): Path<u32>,
) -> StatusCode {
    let mut todos = db.lock().unwrap();
    let before = todos.len();
    todos.retain(|t| t.id != id);
    if todos.len() < before {
        save(&todos);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }

}

#[tokio::main]
async fn main() {
    let todos = load();
    let db: Db = Arc::new(Mutex::new(todos));

    let app = Router::new()
        .route("/todos", get(list).post(create))
        .route("/todos/:id", put(update).delete(delete_todo))
        .with_state(db)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Server running on http://localhost:3001");
    axum::serve(listener, app).await.unwrap();
}
