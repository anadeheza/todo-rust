import { useState, useEffect, useRef } from "react"

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
    <div style={}>

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

  async function loadTodos() {
    try {
      const data = await apiFetch(API)
      setTasks(data)
    } catch(e) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTodos() }, [])

  async function addTodo(e) {
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

  async function toggleTodo(id, currentDone) {
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

  async function updateTodo(id, changes) {
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

  async function deleteTodo(params) {
    
  }
}