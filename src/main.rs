use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
struct Todo {
    id: usize, 
    title: String, 
    done: bool,
}

#[derive(Parser)]
#[command(name = "todo", about = "A simple todo list")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Add { title: String },
    List, 
    Done { id: usize },
    Remove { id: usize }
}

const FILE: &str = "todos.json";
 
fn load() -> Vec<Todo> {
    match fs::read_to_string(FILE) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => vec![],   
    }
}

fn save(todos: &Vec<Todo>) {
    let json = serde_json::to_string_pretty(todos).expect("Failed to serielize");
    fs::write(FILE, json).expect("Failed to write")
}

fn add(title: String) { 
    let mut todos = load();
    let id = todos.last().map(|t| t.id + 1).unwrap_or(1);
    todos.push(Todo { id, title: title.clone(), done: false });
    save(&todos);
    println!("Added task #{id}: \"{title}\"")
}

fn list() {
    let todos = load();
    if todos.is_empty() {
        println!("No tasks yet! Add one with: todo add \"your task\"");
        return;
    }

    println!("{:<5} {:<8} {}", "ID", "STATUS", "TITLE");
    println!("{}", "-".repeat(40));


    for t in &todos {
        let status = if t.done { "done" } else { " o todo" };
        println!("{:<5} {:<8} {}", t.id, status, t.title)
    }
}

fn done(id: usize) {
    let mut todos = load();
    match todos.iter_mut().find(|t| t.id == id) {
        Some(t) => {
            t.done = true;
            save(&todos);
            println!("🎉 Task #{id} marked as done!");
        }
        None => println!("❌ No task with id {id}"),
    }
}

fn remove(id: usize) {
    let mut todos = load();
    let before = todos.len();
    todos.retain(|t| t.id != id);
    if todos.len() < before {
        save(&todos);
        println!("Task #{id} removed.")
    } else {
        println!("❌ No task with id {id}");
    }

}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Commands::Add { title } => add(title),
        Commands::List => list(),
        Commands::Done { id } => done(id),
        Commands::Remove { id } => remove(id),
    }
}
