import { useState, useEffect, useRef } from "react"
import './App.css'
import bg from './assets/bg.mp4'

const API = '/todos'

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

function Checkmark() {
  return <p>✓</p>
}

function TodoItem({ todo, onToggle, onDelete, onUpdate, dragHandleProps, isDragging }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') {
      setDraft(todo.title)
      setEditing(false)
    }
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== todo.title) {
      onUpdate(todo.id, { title: trimmed })
    } else {
      setDraft(todo.title)
    }
    setEditing(false)
  }

  return (
    <div className={`todoItem ${todo.done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}>
      {/* Drag handle */}
      <span className="dragHandle" {...dragHandleProps} title="Drag to reorder">
        ⠿
      </span>

      <div
        className={`checkbox ${todo.done ? 'checked' : ''}`}
        onClick={() => onToggle(todo.id, todo.done)}
      >
        {todo.done && <Checkmark />}
      </div>

      {editing ? (
        <input
          ref={inputRef}
          className="editInput"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className={`todoText ${todo.done ? 'done' : ''}`}
          onDoubleClick={() => !todo.done && setEditing(true)}
          title={todo.done ? '' : 'Double-click to edit'}
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

function ConfirmDeleteAll({ onConfirm, onCancel }) {
  return (
    <div className="confirmOverlay">
      <div className="confirmBox">
        <p className="confirmText">are you sure?</p>
        <div className="confirmButtons">
          <button className="confirmOk" onClick={onConfirm}>ok</button>
          <button className="confirmCancel" onClick={onCancel}>cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [todos, setTasks] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const inputRef = useRef()

  // Drag state
  const dragId = useRef(null)
  const dragOverId = useRef(null)

  async function loadTasks() {
    const data = await apiFetch(API)
    setTasks(data)
  }

  useEffect(() => { loadTasks() }, [])

  async function addTask(e) {
    e.preventDefault()
    const title = input.trim()
    if (!title) return
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
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function deleteAll() {
    await apiFetch(API, { method: 'DELETE' })
    setTasks([])
    setShowConfirmClear(false)
  }

  // ── Drag handlers ──────────────────────────────────────────
  function onDragStart(id) {
    dragId.current = id
  }

  function onDragEnter(id) {
    dragOverId.current = id
    if (id === dragId.current) return
    setTasks(prev => {
      const next = [...prev]
      const fromIdx = next.findIndex(t => t.id === dragId.current)
      const toIdx = next.findIndex(t => t.id === id)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }

  async function onDragEnd() {
    dragId.current = null
    dragOverId.current = null
    // Persist new order to backend
    await apiFetch(`${API}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids: todos.map(t => t.id) })
    })
  }
  // ────────────────────────────────────────────────────────────

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const doneCount = todos.filter(t => t.done).length

  return (
    <div className="page">
      <video autoPlay muted loop id="myVideo">
        <source src={bg} type="video/mp4" />
      </video>

      {showConfirmClear && (
        <ConfirmDeleteAll
          onConfirm={deleteAll}
          onCancel={() => setShowConfirmClear(false)}
        />
      )}

      <div className="container">
        <div className="header">
          <h1 className="title">GET YOUR TASKS DONE! ⤵︎</h1>
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
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => onDragStart(todo.id)}
                  onDragEnter={() => onDragEnter(todo.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                >
                  <TodoItem
                    todo={todo}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onUpdate={updateTask}
                    isDragging={dragId.current === todo.id}
                    dragHandleProps={{}}
                  />
                </div>
              ))
            )}
          </div>

          {todos.length > 0 && (
            <div className="footer">
              <span className="countText">{doneCount}/{todos.length} done</span>
              <button
                className="deleteAllBtn"
                onClick={() => setShowConfirmClear(true)}
              >
                delete all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}