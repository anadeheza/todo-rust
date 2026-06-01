import { useState, useEffect, useRef } from "react"
import './App.css'

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
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#0e0e0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TodoItem({ todo, onToggle, onDelete, onUpdate}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef()

  function startEdit() {
    if(todo.done) return
    setDraft(todo.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if(trimmed && trimmed !== todo.title) onUpdate(todo.id, { title: trimmed })
      setEditing(false)
  }

  function onKeyDown(e) {
    if(e.key === 'Enter') commitEdit()
    if(e.key === 'Space') setEditing(false)
  }

  return (
    
    <div className={`todoItem ${todo.done ? 'done' : ''}`}>
      <span className="idBadge">#{todo.id}</span>
      <div className={`checkbox ${todo.done ? 'checked' : ''}`} onClick={() => onToggle(todo.id, todo.done)}>
        {todo.done && <Checkmark />}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          className="editInput"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <span
          className={`todoText ${todo.done ? 'done' : ''}`}
          onDoubleClick={startEdit}
          title="Double-click to edit"
        >
          {todo.title}
        </span>
      )}
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
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef()

  async function loadTasks() {
    try {
      const data = await apiFetch(API)
      setTasks(data)
    } catch(e) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [])

  async function addTask(e) {
    e.preventDefault()
    const title = input.trim()
    if(!title) return
    try {
      const todo = await apiFetch(API, {
        method: 'POST',
        body: JSON.stringify({ title })
      })
      setTasks(prev => [...prev, todo])
      setInput('')
      inputRef.current?.focus()
    } catch(e) {
      setError('failed to add task')
    }
  }

  async function toggleTask(id, currentDone) {
    try {
      const updated = await apiFetch(`${API}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ done: !currentDone }),
      })
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) {
      setError('failed to update task')
    }
  }

  async function updateTask(id, changes) {
    try {
      const updated = await apiFetch(`${API}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(changes)
      })
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) {
      setError('failed to update task')
    }
  }

  async function deleteTask(params) {
    try {
      await apiFetch(`${API}/${id}`, { method: 'DELETE' })
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setError('failed to delete task')
    }
  }

  const filtered = todos.filter(t => {
    if(filter === 'active') return !t.done 
    if(filter === 'done') return t.done
    return true 
  })

  const doneCount = todos.filter(t => t.done).length

  return (
    <div className="page">
      <div className="header">
        <div className="title">todo app</div>
        <h1 className="heading">What needs doing?</h1>
        {!loading && (
          <div className="stats">
            {todos.length} tasks · {doneCount} completed · {todos.length - doneCount} remaining
          </div>
        )}
      </div>
 
      {error && (
        <div className="error">
          ⚠ {error}
          <button className="errorClose" onClick={() => setError(null)}>×</button>
        </div>
      )}
 
      <form className="form" onSubmit={addTodo}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Add a new task..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="addBtn" type="submit">Add task</button>
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
        {loading ? (
          <div className="empty">loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {filter === 'done' ? 'No completed tasks yet.' :
             filter === 'active' ? 'Nothing left to do!' :
             'No tasks yet. Add one above.'}
          </div>
        ) : (
          filtered.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onUpdate={updateTodo}
            />
          ))
        )}
      </div>
    </div>
  )
}