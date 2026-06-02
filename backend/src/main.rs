use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Todo {
    id: u32,
    title: String,
    done: bool,
    position: u32,
}

#[derive(Deserialize)]
struct CreateTodo {
    title: String,
}

#[derive(Deserialize)]
struct UpdateTodo {
    done: Option<bool>,
    title: Option<String>,
}

#[derive(Deserialize)]
struct ReorderPayload {
    ids: Vec<u32>,
}

type Db = Arc<Mutex<Connection>>;

fn init_db(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS todos (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            title    TEXT NOT NULL,
            done     BOOLEAN NOT NULL DEFAULT 0,
            position INTEGER NOT NULL DEFAULT 0
        );",
    )
    .expect("Failed to init DB");
}

fn get_todos(conn: &Connection) -> Vec<Todo> {
    let mut stmt = conn
        .prepare("SELECT id, title, done, position FROM todos ORDER BY position ASC, id ASC")
        .unwrap();
    stmt.query_map([], |row| {
        Ok(Todo {
            id: row.get(0)?,
            title: row.get(1)?,
            done: row.get(2)?,
            position: row.get(3)?,
        })
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .collect()
}

async fn list(State(db): State<Db>) -> Json<Vec<Todo>> {
    let conn = db.lock().unwrap();
    Json(get_todos(&conn))
}

async fn create(
    State(db): State<Db>,
    Json(payload): Json<CreateTodo>,
) -> (StatusCode, Json<Todo>) {
    let conn = db.lock().unwrap();
    let max_pos: u32 = conn
        .query_row("SELECT COALESCE(MAX(position), 0) FROM todos", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO todos (title, done, position) VALUES (?1, 0, ?2)",
        params![payload.title, max_pos + 1],
    )
    .unwrap();

    let id = conn.last_insert_rowid() as u32;
    let todo = Todo {
        id,
        title: payload.title,
        done: false,
        position: max_pos + 1,
    };
    (StatusCode::CREATED, Json(todo))
}

async fn update(
    State(db): State<Db>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateTodo>,
) -> Result<Json<Todo>, StatusCode> {
    let conn = db.lock().unwrap();

    if let Some(done) = payload.done {
        conn.execute(
            "UPDATE todos SET done = ?1 WHERE id = ?2",
            params![done, id],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(title) = payload.title {
        conn.execute(
            "UPDATE todos SET title = ?1 WHERE id = ?2",
            params![title, id],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let todo = conn
        .query_row(
            "SELECT id, title, done, position FROM todos WHERE id = ?1",
            params![id],
            |row| {
                Ok(Todo {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    done: row.get(2)?,
                    position: row.get(3)?,
                })
            },
        )
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(todo))
}

async fn delete_todo(State(db): State<Db>, Path(id): Path<u32>) -> StatusCode {
    let conn = db.lock().unwrap();
    let rows = conn
        .execute("DELETE FROM todos WHERE id = ?1", params![id])
        .unwrap_or(0);
    if rows > 0 {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

async fn delete_all(State(db): State<Db>) -> StatusCode {
    let conn = db.lock().unwrap();
    conn.execute("DELETE FROM todos", []).unwrap_or(0);
    StatusCode::NO_CONTENT
}

async fn reorder(
    State(db): State<Db>,
    Json(payload): Json<ReorderPayload>,
) -> StatusCode {
    let conn = db.lock().unwrap();
    for (pos, id) in payload.ids.iter().enumerate() {
        conn.execute(
            "UPDATE todos SET position = ?1 WHERE id = ?2",
            params![pos as u32, id],
        )
        .unwrap_or(0);
    }
    StatusCode::NO_CONTENT
}

#[tokio::main]
async fn main() {
    let conn = Connection::open("todos.db").expect("Failed to open DB");
    init_db(&conn);

    let db: Db = Arc::new(Mutex::new(conn));

    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/todos", get(list).post(create).delete(delete_all))
        .route("/todos/reorder", post(reorder))
        .route("/todos/:id", put(update).delete(delete_todo))
        .with_state(db)
        .layer(cors);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .expect("PORT must be valid");

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("Server running on port {}", port);

    axum::serve(listener, app).await.unwrap();
}
