import { useState, useEffect, useRef } from "react"
import './App.css'
import bg from './assets/bg.mp4'

const API = '/todos'

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if(!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null 
  return res.json()
}

function Checkmark() {
  return (
    <p>✓</p>
  )
}

function TodoItem({ todo, onToggle, onDelete, onUpdate}) {
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef()

  return (
    
    <div className={`todoItem ${todo.done ? 'done' : ''}`}>
      <div className={`checkbox ${todo.done ? 'checked' : ''}`} onClick={() => onToggle(todo.id, todo.done)}>
        {todo.done && <Checkmark />}
      </div>      
      <span
        className={`todoText ${todo.done ? 'done' : ''}`}
      >
        {todo.title}
      </span>
      <button className="deleteBtn" onClick={() => onDelete(todo.id)} title="Delete">
        ×
      </button>
    </div>
  )
}

export default function App() {
  const [todos, setTasks] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const inputRef = useRef()

  async function loadTasks() {
    const data = await apiFetch(API)
    setTasks(data)
  }

  useEffect(() => { loadTasks() }, [])

  async function addTask(e) {
    e.preventDefault()
    const title = input.trim()
    if(!title) return
  
    const todo = await apiFetch(API, {
      method: 'POST',
      body: JSON.stringify({ title })
    })
    setTasks(prev => [...prev, todo])
    setInput('')
  }

  async function toggleTask(id, currentDone) {
    const updated = await apiFetch(`${API}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ done: !currentDone }),
    })
    setTasks(prev => prev.map(t => t.id === id ? updated : t))

  }

  async function updateTask(id, changes) {
    const updated = await apiFetch(`${API}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes)
    })
    setTasks(prev => prev.map(t => t.id === id ? updated : t))

  }

  async function deleteTask(id) {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' })
    await loadTasks() 
  }

  const filtered = todos.filter(t => {
    if(filter === 'active') return !t.done 
    if(filter === 'done') return t.done
    return true 
  })

  const doneCount = todos.filter(t => t.done).length

  return (
    <div className="page">
      <video autoPlay muted loop id="myVideo">
        <source src={bg} type="video/mp4"/>
      </video>

      <div className="container">
        <div className="header">
          <div className="heading">GET YOUR TASKS DONE!</div>
          <h1 className="title">Add here ⤵︎</h1>
        </div>

      <div className="tasks-container">
          <form className="form" onSubmit={addTask}>
            <input
              ref={inputRef}
              className="input"
              placeholder="⊹ ﹏𓊝﹏𓂁﹏⊹ ˖"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button className="addBtn" type="submit">⌯⌲</button>
          </form>
    
          <div className="filters">
            {['all', 'active', 'done'].map(f => (
              <button
                key={f}
                className={`filterBtn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
    
          <div className="list">
            {filtered.length === 0 ? (
              <div className="empty">
                {filter === 'done' ? 'No completed tasks' :
                filter === 'active' ? 'Nothing left to do, great job!' :
                'No tasks yet, add one above ;)'}
              </div>
            ) : (
              filtered.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}