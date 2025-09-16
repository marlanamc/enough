'use client'

import { useState, useMemo, useEffect, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Calendar, 
  Settings, 
  Zap, 
  Heart, 
  Brain, 
  Users, 
  Palette, 
  CheckCircle2,
  Trash2,
  Award,
  CheckCircle
} from 'lucide-react'

// Types
interface Task {
  id: string
  name: string
  energy: number
  duration: number
  energyType: string
  category: string
  completed: boolean
  createdAt: string
  completedAt?: string
  scheduledTime?: number // Hour of day (0-23)
  priority: 'low' | 'medium' | 'high'
  estimatedDuration?: number
  actualDuration?: number
}

interface TaskTemplate {
  id: string
  name: string
  energy: number
  duration: number
  energyType: string
  category: string
}

interface EnergySegment {
  category: string
  value: number
  color: string
}

type NatureKey = keyof typeof NATURE_OPTIONS

function calculateEnergyFromCalculator(values: { planning: number; doing: number; switching: number; nature: NatureKey }) {
  const weightedMinutes = values.doing + values.planning * 0.5 + values.switching * 0.75
  const base = Math.round(weightedMinutes / 2.2)
  const adjustment = NATURE_OPTIONS[values.nature]?.adjustment ?? 0
  const total = base + adjustment
  return Math.max(5, Math.min(100, total))
}

function calculateDurationFromCalculator(values: { planning: number; doing: number; switching: number }) {
  return Math.max(5, Math.round(values.planning + values.doing + values.switching))
}

interface Settings {
  dailyCapacity: number
  theme: string
  soundEnabled: boolean
  animationsEnabled: boolean
  taskTemplates: TaskTemplate[]
  categories: string[]
  visualizationType: 'circle' | 'cup'
  workingHours: { start: number; end: number }
  notifications: boolean
  onboardingCompleted: boolean
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
}

interface UserStats {
  totalTasksCompleted: number
  currentStreak: number
  longestStreak: number
  totalEnergyManaged: number
  perfectDays: number
  achievements: Achievement[]
}

// Constants
const ENERGY_TYPES = {
  focus: { label: 'Focus', color: '#6366f1', icon: Brain, description: 'Deep work, concentration' },
  social: { label: 'Social', color: '#0ea5e9', icon: Users, description: 'Meetings, calls, interactions' },
  physical: { label: 'Physical', color: '#10b981', icon: Zap, description: 'Exercise, movement, physical tasks' },
  creative: { label: 'Creative', color: '#f97316', icon: Palette, description: 'Art, writing, brainstorming' },
  emotional: { label: 'Emotional', color: '#f43f5e', icon: Heart, description: 'Processing feelings, self-care' },
  admin: { label: 'Admin', color: '#64748b', icon: Settings, description: 'Paperwork, organizing, planning' }
}

const NATURE_OPTIONS = {
  restorative: { label: 'Restorative', adjustment: -8, description: 'Gives energy back or feels nourishing' },
  neutral: { label: 'Neutral', adjustment: 0, description: 'Steady effort with predictable output' },
  demanding: { label: 'Draining', adjustment: 10, description: 'Emotionally or mentally taxing work' }
}

const DEFAULT_CATEGORIES = ['work', 'personal', 'home', 'health', 'creative', 'social']

const DEFAULT_ENERGY_COLOR = '#94a3b8'

const DEFAULT_TEMPLATES: TaskTemplate[] = [
  // Work templates
  { id: '1', name: 'Team Meeting', energy: 25, duration: 60, energyType: 'social', category: 'work' },
  { id: '2', name: 'Email Batch', energy: 15, duration: 30, energyType: 'admin', category: 'work' },
  { id: '3', name: 'Deep Focus', energy: 40, duration: 90, energyType: 'focus', category: 'work' },
  { id: '4', name: 'Quick Call', energy: 10, duration: 15, energyType: 'social', category: 'work' },
  
  // Personal templates
  { id: '5', name: 'Exercise', energy: 20, duration: 45, energyType: 'physical', category: 'personal' },
  { id: '6', name: 'Self-Care', energy: 10, duration: 30, energyType: 'emotional', category: 'personal' },
  { id: '7', name: 'Creative Time', energy: 30, duration: 120, energyType: 'creative', category: 'personal' },
  { id: '8', name: 'Reading', energy: 15, duration: 45, energyType: 'focus', category: 'personal' },
  
  // Home templates
  { id: '9', name: 'Meal Prep', energy: 25, duration: 60, energyType: 'physical', category: 'home' },
  { id: '10', name: 'Cleaning', energy: 15, duration: 20, energyType: 'physical', category: 'home' },
  { id: '11', name: 'Organizing', energy: 20, duration: 45, energyType: 'admin', category: 'home' },
  { id: '12', name: 'Laundry', energy: 10, duration: 15, energyType: 'physical', category: 'home' }
]

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_task', title: 'Getting Started', description: 'Complete your first task', icon: '🎯', unlocked: false },
  { id: 'perfect_day', title: 'Perfect Balance', description: 'Complete all tasks without going over capacity', icon: '⚖️', unlocked: false },
  { id: 'week_streak', title: 'Consistent Week', description: 'Use the app for 7 days in a row', icon: '🔥', unlocked: false },
  { id: 'energy_master', title: 'Energy Master', description: 'Manage 1000 total energy points', icon: '⚡', unlocked: false },
  { id: 'early_bird', title: 'Early Bird', description: 'Schedule a task before 8 AM', icon: '🌅', unlocked: false },
  { id: 'night_owl', title: 'Night Owl', description: 'Schedule a task after 10 PM', icon: '🦉', unlocked: false }
]

// Enhanced Energy Visualization Component
function EnergyVisualization({ 
  percent, 
  capacity, 
  type = 'circle',
  segments = []
}: { 
  percent: number
  capacity: number
  type: 'circle' | 'cup'
  segments?: EnergySegment[]
}) {
  const safeCapacity = capacity > 0 ? capacity : 1
  const displayPercent = capacity > 0 ? Math.min(percent, capacity) : 0
  const isOverCapacity = capacity > 0 ? percent > capacity : percent > 0

  const orderedSegments = (segments ?? []).filter(segment => segment && segment.value > 0)
  let remainingCapacity = Math.max(capacity, 0)
  const limitedSegments: EnergySegment[] = []

  for (const segment of orderedSegments) {
    if (remainingCapacity <= 0) break
    const value = Math.min(segment.value, remainingCapacity)
    if (value <= 0) continue
    limitedSegments.push({ ...segment, value })
    remainingCapacity -= value
  }

  const totalSegmentValue = limitedSegments.reduce((sum, segment) => sum + segment.value, 0)
  const hasSegments = totalSegmentValue > 0
  
  if (type === 'cup') {
    // Cup visualization
    const fillHeight = Math.min((percent / safeCapacity) * 100, 100)
    
    return (
      <div className="relative w-64 h-64 mx-auto">
        <div className="relative w-full h-full">
          {/* Cup outline */}
          <div className="absolute inset-0 border-4 border-slate-300 rounded-b-full rounded-t-lg bg-white">
            {/* Fill */}
            <div 
              className="absolute bottom-0 left-0 right-0 rounded-b-full overflow-hidden transition-all duration-700 ease-out"
              style={{ height: `${fillHeight}%` }}
            >
              {hasSegments ? (
                <div className="absolute inset-0 flex flex-col justify-end">
                  {limitedSegments.map((segment, index) => (
                    <div
                      key={`${segment.category}-${index}`}
                      className="w-full"
                      style={{ 
                        height: `${(segment.value / totalSegmentValue) * 100}%`, 
                        backgroundColor: segment.color 
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div 
                  className={`absolute inset-0 ${
                    isOverCapacity ? 'bg-red-400' : 'bg-slate-400'
                  }`} 
                />
              )}

              {isOverCapacity && hasSegments && (
                <div className="absolute inset-0 bg-red-400/30" />
              )}
            </div>
            
            {/* Overflow indicator */}
            {isOverCapacity && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-red-400 rounded-t-lg animate-pulse" />
            )}
          </div>
          
          {/* Handle */}
          <div className="absolute -right-10 top-20 h-20 w-12 rounded-full border-4 border-slate-300 border-l-transparent bg-transparent" />
        </div>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-5xl font-bold mb-1 ${
            isOverCapacity ? 'text-red-600' : 'text-slate-800'
          }`}
            aria-live="polite"
          >
            {Math.round(percent)}%
          </div>
          <div className="text-sm text-slate-500 font-medium">
            capacity used
          </div>
        </div>
      </div>
    )
  }
  
  // Circle visualization (default)
  const radius = 120
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI

  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        {/* Background circle */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        {hasSegments ? (
          (() => {
            let accumulated = 0
            return limitedSegments.map((segment, index) => {
              const segmentLength = (segment.value / safeCapacity) * circumference
              const dashArray = `${segmentLength} ${circumference}`
              const dashOffset = -((accumulated / safeCapacity) * circumference)
              accumulated += segment.value

              return (
                <circle
                  key={`${segment.category}-${index}`}
                  cx={radius}
                  cy={radius}
                  r={normalizedRadius}
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-700 ease-out"
                />
              )
            })
          })()
        ) : (
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            stroke={isOverCapacity ? "#ef4444" : "#64748b"}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${(displayPercent / safeCapacity) * circumference} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
        
        {isOverCapacity && hasSegments && (
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            stroke="rgba(248, 113, 113, 0.45)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        )}
        
        {/* Overflow indicator */}
        {isOverCapacity && (
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius + 12}
            stroke="#fca5a5"
            strokeWidth={4}
            fill="transparent"
            strokeDasharray="10 5"
            className="animate-pulse"
          />
        )}
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={`text-5xl font-bold mb-1 ${
          isOverCapacity ? 'text-red-600' : 'text-slate-800'
        }`}
          aria-live="polite"
        >
          {Math.round(percent)}%
        </div>
        <div className="text-sm text-slate-500 font-medium">
          capacity used
        </div>
      </div>
    </div>
  )
}

// Schedule Component with Drag and Drop
function ScheduleView({ 
  tasks, 
  onScheduleTask, 
  onUnscheduleTask, 
  workingHours 
}: {
  tasks: Task[]
  onScheduleTask: (taskId: string, hour: number) => void
  onUnscheduleTask: (taskId: string) => void
  workingHours: { start: number; end: number }
}) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const scheduledTasks = tasks.filter(task => task.scheduledTime !== undefined)
  const unscheduledTasks = tasks.filter(task => task.scheduledTime === undefined && !task.completed)
  
  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }
  
  const handleDragEnd = () => {
    setDraggedTask(null)
  }
  
  const handleDrop = (hour: number) => {
    if (draggedTask) {
      if (draggedTask.scheduledTime !== undefined) {
        onUnscheduleTask(draggedTask.id)
      }
      onScheduleTask(draggedTask.id, hour)
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const getTasksForHour = (hour: number) => {
    return scheduledTasks.filter(task => task.scheduledTime === hour)
  }
  
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }
  
  const isWorkingHour = (hour: number) => {
    return hour >= (workingHours?.start || 9) && hour < (workingHours?.end || 17)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Unscheduled Tasks */}
      <div className="lg:col-span-1">
        <h3 className="font-semibold text-slate-900 mb-4">Unscheduled Tasks</h3>
        <div className="space-y-2">
          {unscheduledTasks.map(task => (
            <div
              key={task.id}
              draggable
              onDragStart={() => handleDragStart(task)}
              onDragEnd={handleDragEnd}
              className="p-3 bg-white border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
            >
              <div className="font-medium text-sm text-slate-800">{task.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {task.duration}min • {task.energy}% energy
              </div>
            </div>
          ))}
          {unscheduledTasks.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">All tasks scheduled!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Schedule Grid */}
      <div className="lg:col-span-3">
        <h3 className="font-semibold text-slate-900 mb-4">Daily Schedule</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {hours.map(hour => {
            const hourTasks = getTasksForHour(hour)
            const totalEnergy = hourTasks.reduce((sum, task) => sum + task.energy, 0)
            
            return (
              <div
                key={hour}
                className={`flex items-center gap-4 p-3 rounded-lg border-2 border-dashed transition-colors ${
                  isWorkingHour(hour) 
                    ? 'border-slate-200 bg-slate-50/50' 
                    : 'border-slate-100 bg-slate-25'
                }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(hour)}
              >
                <div className="w-16 text-sm font-medium text-slate-600">
                  {formatHour(hour)}
                </div>
                
                <div className="flex-1 min-h-[40px] flex items-center gap-2">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      className="flex-1 p-2 bg-white border border-slate-200 rounded cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    >
                      <div className="font-medium text-sm text-slate-800">{task.name}</div>
                      <div className="text-xs text-slate-500">
                        {task.duration}min • {task.energy}%
                      </div>
                    </div>
                  ))}
                  
                  {hourTasks.length === 0 && (
                    <div className="flex-1 text-center text-slate-400 text-sm py-2">
                      Drop tasks here
                    </div>
                  )}
                </div>
                
                {totalEnergy > 0 && (
                  <div className="text-sm text-slate-600">
                    {totalEnergy}% energy
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Clean Task Item Component
function TaskItem({ 
  task, 
  onToggle, 
  onDelete
}: {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const formatScheduledTime = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour < 12) return `${hour} AM`
    if (hour === 12) return '12 PM'
    return `${hour - 12} PM`
  }

  const energyTypeColor = ENERGY_TYPES[task.energyType]?.color ?? DEFAULT_ENERGY_COLOR

  return (
    <div
      className={`relative flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm transition hover:border-slate-300 focus-within:border-slate-400 ${
        task.completed ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
            task.completed ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 hover:border-slate-400'
          }`}
          aria-pressed={task.completed}
        >
          {task.completed && <CheckCircle2 size={14} />}
        </button>
        <span
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: energyTypeColor }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p
            className={`text-sm font-medium text-slate-800 truncate ${
              task.completed ? 'line-through' : ''
            }`}
          >
            {task.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{task.duration} min</span>
            {task.scheduledTime !== undefined && (
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar size={12} />
                {formatScheduledTime(task.scheduledTime)}
              </span>
            )}
            {task.priority !== 'medium' && (
              <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold" style={{ color: energyTypeColor }}>
          {task.energy}%
        </span>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          aria-label="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// Enhanced Quick Add Dialog with Capacity Calculator
function QuickAddDialog({ 
  templates, 
  categories, 
  onAddTask, 
  isOpen, 
  onClose,
  currentCapacity,
  maxCapacity
}: {
  templates: TaskTemplate[]
  categories: string[]
  onAddTask: (template: TaskTemplate) => void
  isOpen: boolean
  onClose: () => void
  currentCapacity: number
  maxCapacity: number
}) {
  const [customTask, setCustomTask] = useState({
    name: '',
    energy: 20,
    duration: 30,
    energyType: 'focus',
    category: categories[0] ?? 'work'
  })
  const [useCalculator, setUseCalculator] = useState(true)
  const [calculator, setCalculator] = useState({
    planning: 0,
    doing: 60,
    switching: 0,
    nature: 'neutral' as NatureKey
  })

  const remainingCapacity = maxCapacity - currentCapacity
  const calculatorEnergy = useMemo(() => calculateEnergyFromCalculator(calculator), [calculator])
  const calculatorDuration = useMemo(() => calculateDurationFromCalculator(calculator), [calculator])
  const displayedEnergy = useCalculator ? calculatorEnergy : customTask.energy

  const getCapacityWarning = (energy: number) => {
    if (currentCapacity + energy > maxCapacity) {
      const overflow = (currentCapacity + energy) - maxCapacity
      return `⚠️ This will put you ${overflow}% over capacity`
    }
    return null
  }

  const handleCalculatorField = (field: 'planning' | 'doing' | 'switching', value: number) => {
    const numericValue = Number.isFinite(value) ? Math.max(0, value) : 0
    setCalculator(prev => ({ ...prev, [field]: numericValue }))
  }

  const handleAddCustomTask = () => {
    if (!customTask.name.trim()) return

    const template: TaskTemplate = {
      id: Date.now().toString(),
      name: customTask.name,
      energy: displayedEnergy,
      duration: useCalculator ? calculatorDuration : customTask.duration,
      energyType: customTask.energyType,
      category: customTask.category
    }

    onAddTask(template)
    setCustomTask({
      name: '',
      energy: 20,
      duration: 30,
      energyType: 'focus',
      category: categories[0] ?? 'work'
    })
    setCalculator({ planning: 0, doing: 60, switching: 0, nature: 'neutral' as NatureKey })
    onClose()
  }

  const capacityWarning = getCapacityWarning(displayedEnergy)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-2xl font-semibold">
            Add Task
            <span className="text-sm font-normal text-slate-500">
              {remainingCapacity}% capacity remaining
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Input
            placeholder="What do you need to do?"
            value={customTask.name}
            onChange={(event) => setCustomTask(prev => ({ ...prev, name: event.target.value }))}
            className="h-12 rounded-xl border-slate-200 bg-white/80"
          />

          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Capacity Calculator</p>
                <p className="text-xs text-slate-500">Estimate effort with planning and switching overhead.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Use calculator</span>
                <Switch
                  checked={useCalculator}
                  onCheckedChange={(checked) => setUseCalculator(checked)}
                />
              </div>
            </div>

            {useCalculator && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Planning (min)</label>
                    <Input
                      type="number"
                      min={0}
                      value={calculator.planning}
                      onChange={(event) => handleCalculatorField('planning', Number(event.target.value))}
                      className="mt-1 h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Doing (min)</label>
                    <Input
                      type="number"
                      min={0}
                      value={calculator.doing}
                      onChange={(event) => handleCalculatorField('doing', Number(event.target.value))}
                      className="mt-1 h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Switching/setup (min)</label>
                    <Input
                      type="number"
                      min={0}
                      value={calculator.switching}
                      onChange={(event) => handleCalculatorField('switching', Number(event.target.value))}
                      className="mt-1 h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Nature</label>
                    <Select
                      value={calculator.nature}
                      onValueChange={(value) => setCalculator(prev => ({ ...prev, nature: value as NatureKey }))}
                    >
                      <SelectTrigger className="mt-1 h-11 rounded-xl border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(NATURE_OPTIONS).map(([key, option]) => (
                          <SelectItem key={key} value={key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Model output includes activation cost plus planning and switching overhead; duration reflects the total minutes entered.
                </p>

                <div className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                  <div className="text-sm font-medium text-slate-600">Model output</div>
                  <div className="text-lg font-semibold text-slate-900">{calculatorEnergy}% energy</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-600">
              <span>How draining?</span>
              <span className="text-slate-900">{displayedEnergy}%</span>
            </div>
            <Slider
              value={[displayedEnergy]}
              onValueChange={(value) => {
                if (useCalculator) return
                setCustomTask(prev => ({ ...prev, energy: value[0] }))
              }}
              min={5}
              max={100}
              step={5}
              disabled={useCalculator}
            />
            {!useCalculator && (
              <p className="text-xs text-slate-500">Drag to match how much this task will drain you.</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">What kind?</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(ENERGY_TYPES).map(([key, type]) => {
                const Icon = type.icon
                const isActive = customTask.energyType === key
                const buttonStyle = isActive
                  ? { backgroundColor: type.color, borderColor: type.color, color: '#ffffff' }
                  : { backgroundColor: `${type.color}14`, borderColor: `${type.color}33`, color: type.color }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCustomTask(prev => ({ ...prev, energyType: key }))}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                      isActive ? 'shadow-md text-white' : 'hover:brightness-105'
                    }`}
                    style={buttonStyle}
                    aria-pressed={isActive}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={18} color={isActive ? '#ffffff' : type.color} />
                      <span className="capitalize">{type.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Category</label>
              <Select
                value={customTask.category}
                onValueChange={(value) => setCustomTask(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!useCalculator && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Duration (minutes)</label>
                <Slider
                  value={[customTask.duration]}
                  onValueChange={(value) => setCustomTask(prev => ({ ...prev, duration: value[0] }))}
                  min={5}
                  max={240}
                  step={5}
                />
                <p className="text-xs text-slate-500">Set this when the calculator is off.</p>
              </div>
            )}
            {useCalculator && (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                <p className="text-xs text-slate-500">Estimated duration</p>
                <p className="text-sm font-semibold text-slate-800">{calculatorDuration} minutes</p>
              </div>
            )}
          </div>

          {capacityWarning && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {capacityWarning}
            </div>
          )}

          <Button
            onClick={handleAddCustomTask}
            disabled={!customTask.name.trim()}
            className="w-full h-12 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Add Task
          </Button>

          {templates.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Quick templates</p>
              <div className="flex flex-wrap gap-2">
                {templates.slice(0, 6).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onAddTask(template)
                      onClose()
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    {template.name} • {template.energy}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Onboarding Component
function OnboardingDialog({ 
  isOpen, 
  onComplete 
}: {
  isOpen: boolean
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const [userCapacity, setUserCapacity] = useState(100)
  
  const steps = [
    {
      title: "Welcome to Enough! 👋",
      content: (
        <div className="text-center space-y-4">
          <p className="text-slate-600">
            Enough helps you plan your day by energy, not just time. 
            Let&apos;s get you set up in just a few steps.
          </p>
          <div className="text-6xl">☕</div>
        </div>
      )
    },
    {
      title: "Your Daily Capacity",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            Everyone has different energy levels. What feels like a full day for you?
          </p>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-800 mb-2">{userCapacity}%</div>
            <Slider
              value={[userCapacity]}
              onValueChange={(v) => setUserCapacity(v[0])}
              min={50}
              max={150}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-slate-500 mt-2">
              <span>Low energy days</span>
              <span>High energy days</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Energy Metaphor",
      content: (
        <div className="space-y-4">
          <p className="text-slate-600">
            Think of your energy like a cup or circle that fills up as you add tasks. 
            When it&apos;s full, you&apos;ve planned enough for the day.
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-4xl mb-2">○</div>
              <div className="text-sm text-slate-600">Circle</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">☕</div>
              <div className="text-sm text-slate-600">Cup</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You&apos;re All Set! 🎉",
      content: (
        <div className="text-center space-y-4">
          <p className="text-slate-600">
            Start by adding your first task using the templates, or create a custom one. 
            Remember: the goal is to do enough, and feel enough.
          </p>
          <div className="text-4xl">✨</div>
        </div>
      )
    }
  ]
  
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }
  
  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{steps[step].title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {steps[step].content}
        </div>
        
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === step ? 'bg-slate-800' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          
          <Button onClick={handleNext}>
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Achievements Component
function AchievementsDialog({ 
  achievements, 
  isOpen, 
  onClose 
}: {
  achievements: Achievement[]
  isOpen: boolean
  onClose: () => void
}) {
  const unlockedCount = achievements.filter(a => a.unlocked).length
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award size={20} />
            Achievements ({unlockedCount}/{achievements.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border ${
                achievement.unlocked 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    achievement.unlocked ? 'text-green-800' : 'text-slate-600'
                  }`}>
                    {achievement.title}
                  </div>
                  <div className={`text-sm ${
                    achievement.unlocked ? 'text-green-600' : 'text-slate-500'
                  }`}>
                    {achievement.description}
                  </div>
                  {achievement.unlocked && achievement.unlockedAt && (
                    <div className="text-xs text-green-500 mt-1">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {achievement.unlocked && (
                  <CheckCircle size={20} className="text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Enhanced Settings Component
function SettingsDialog({ 
  settings, 
  onUpdateSettings, 
  isOpen, 
  onClose 
}: {
  settings: Settings
  onUpdateSettings: (settings: Settings) => void
  isOpen: boolean
  onClose: () => void
}) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onUpdateSettings(localSettings)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block">
                Daily Capacity: {localSettings.dailyCapacity}%
              </label>
              <Slider
                value={[localSettings.dailyCapacity]}
                onValueChange={(v) => setLocalSettings(prev => ({ ...prev, dailyCapacity: v[0] }))}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Sound Effects</label>
                <p className="text-xs text-slate-500">Play sounds for task completion</p>
              </div>
              <Switch
                checked={localSettings.soundEnabled}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, soundEnabled: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Animations</label>
                <p className="text-xs text-slate-500">Enable smooth transitions</p>
              </div>
              <Switch
                checked={localSettings.animationsEnabled}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, animationsEnabled: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Notifications</label>
                <p className="text-xs text-slate-500">Gentle reminders and encouragement</p>
              </div>
              <Switch
                checked={localSettings.notifications}
                onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, notifications: checked }))}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block">Working Hours</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Start</label>
                  <Select
                    value={localSettings.workingHours?.start?.toString() || '9'}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      workingHours: { 
                        start: parseInt(value), 
                        end: prev.workingHours?.end || 17 
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs text-slate-500">End</label>
                  <Select
                    value={localSettings.workingHours?.end?.toString() || '17'}
                    onValueChange={(value) => setLocalSettings(prev => ({
                      ...prev,
                      workingHours: { 
                        start: prev.workingHours?.start || 9, 
                        end: parseInt(value) 
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main App Component
export default function EnoughApp() {
  // Core State
  const [tasks, setTasks] = useState<Task[]>([])
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'schedule'>('list')
  const [quickAddName, setQuickAddName] = useState('')
  
  // Settings State
  const [settings, setSettings] = useState<Settings>({
    dailyCapacity: 100,
    theme: 'default',
    soundEnabled: true,
    animationsEnabled: true,
    taskTemplates: DEFAULT_TEMPLATES,
    categories: DEFAULT_CATEGORIES,
    visualizationType: 'circle',
    workingHours: { start: 9, end: 17 },
    notifications: true,
    onboardingCompleted: false
  })
  
  // User Stats State
  const [userStats, setUserStats] = useState<UserStats>({
    totalTasksCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalEnergyManaged: 0,
    perfectDays: 0,
    achievements: DEFAULT_ACHIEVEMENTS
  })

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('enough-tasks')
      const savedSettings = localStorage.getItem('enough-settings')
      const savedStats = localStorage.getItem('enough-stats')
      
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
      if (savedStats) {
        setUserStats(JSON.parse(savedStats))
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error)
    }
  }, [])

  // Save data to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('enough-tasks', JSON.stringify(tasks))
  }, [tasks])
  
  useEffect(() => {
    localStorage.setItem('enough-settings', JSON.stringify(settings))
  }, [settings])
  
  useEffect(() => {
    localStorage.setItem('enough-stats', JSON.stringify(userStats))
  }, [userStats])

  // Calculate energy totals
  const energyData = useMemo(() => {
    const energyTotals = new Map<string, number>()

    const total = tasks.reduce((sum, task) => {
      if (task.completed) return sum

      const typeKey = task.energyType || 'focus'
      const current = energyTotals.get(typeKey) ?? 0
      energyTotals.set(typeKey, current + task.energy)

      return sum + task.energy
    }, 0)

    const segments: EnergySegment[] = []

    Object.keys(ENERGY_TYPES).forEach(typeKey => {
      const value = energyTotals.get(typeKey)
      if (!value) return

      segments.push({
        category: typeKey,
        value,
        color: ENERGY_TYPES[typeKey]?.color ?? DEFAULT_ENERGY_COLOR
      })

      energyTotals.delete(typeKey)
    })

    energyTotals.forEach((value, typeKey) => {
      if (value <= 0) return
      segments.push({
        category: typeKey,
        value,
        color: ENERGY_TYPES[typeKey]?.color ?? DEFAULT_ENERGY_COLOR
      })
    })

    return { 
      total, 
      overflow: Math.max(0, total - settings.dailyCapacity),
      segments 
    }
  }, [tasks, settings.dailyCapacity])

  const quickAddSuggestions = useMemo(() => settings.taskTemplates.slice(0, 3), [settings.taskTemplates])

  // Task Management Functions
  const addTaskFromTemplate = (template: TaskTemplate) => {
    const newTask: Task = {
      id: Date.now().toString(),
      name: template.name,
      energy: template.energy,
      duration: template.duration,
      energyType: template.energyType,
      category: template.category,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'medium'
    }
    setTasks(prev => [...prev, newTask])
    
    // Update stats
    setUserStats(prev => ({
      ...prev,
      totalEnergyManaged: prev.totalEnergyManaged + template.energy
    }))
    
    // Check for achievements
    checkAchievements(newTask)
  }

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, completed: !task.completed }
        if (updatedTask.completed) {
          updatedTask.completedAt = new Date().toISOString()
          
          // Update stats
          setUserStats(prevStats => ({
            ...prevStats,
            totalTasksCompleted: prevStats.totalTasksCompleted + 1
          }))
          
          // Check for first task achievement
          if (userStats.totalTasksCompleted === 0) {
            unlockAchievement('first_task')
          }
        } else {
          delete updatedTask.completedAt
          
          // Update stats (decrease)
          setUserStats(prevStats => ({
            ...prevStats,
            totalTasksCompleted: Math.max(0, prevStats.totalTasksCompleted - 1)
          }))
        }
        return updatedTask
      }
      return task
    }))
  }

  const handleQuickAddSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = quickAddName.trim()
    if (!name) return

    const defaultCategory = settings.categories[0] ?? 'work'

    addTaskFromTemplate({
      id: `quick-${Date.now()}`,
      name,
      energy: 20,
      duration: 30,
      energyType: 'focus',
      category: defaultCategory
    })

    setQuickAddName('')
  }

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  // Scheduling Functions
  const scheduleTask = (taskId: string, hour: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, scheduledTime: hour }
        
        // Check for early bird/night owl achievements
        if (hour < 8) {
          unlockAchievement('early_bird')
        } else if (hour >= 22) {
          unlockAchievement('night_owl')
        }
        
        return updatedTask
      }
      return task
    }))
  }
  
  const unscheduleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task }
        delete updatedTask.scheduledTime
        return updatedTask
      }
      return task
    }))
  }

  // Achievement Functions
  const checkAchievements = (newTask: Task) => {
    // Energy master achievement
    if (userStats.totalEnergyManaged + newTask.energy >= 1000) {
      unlockAchievement('energy_master')
    }
  }
  
  const unlockAchievement = (achievementId: string) => {
    setUserStats(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement => 
        achievement.id === achievementId && !achievement.unlocked
          ? { ...achievement, unlocked: true, unlockedAt: new Date().toISOString() }
          : achievement
      )
    }))
  }

  // "Done for Today" function with enhanced celebration
  const markDayComplete = () => {
    const completedTasks = tasks.filter(task => task.completed).length
    const totalTasks = tasks.length
    
    if (completedTasks === 0) {
      alert("Add some tasks first, then mark them complete!")
      return
    }
    
    const completionRate = Math.round((completedTasks / totalTasks) * 100)
    const isPerfectDay = completionRate === 100 && energyData.total <= settings.dailyCapacity
    
    // Check for perfect day achievement
    if (isPerfectDay) {
      unlockAchievement('perfect_day')
      setUserStats(prev => ({ ...prev, perfectDays: prev.perfectDays + 1 }))
    }
    
    let message = ""
    if (completionRate === 100) {
      message = "🎉 Perfect day! You completed everything. You did enough, and you ARE enough!"
    } else if (completionRate >= 80) {
      message = `✨ Amazing work! You completed ${completionRate}% of your tasks. That's more than enough!`
    } else if (completionRate >= 60) {
      message = `💪 Great job! You completed ${completionRate}% of your tasks. You did enough today!`
    } else {
      message = `🌟 You completed ${completionRate}% of your tasks. Every step forward counts. You are enough!`
    }
    
    alert(message)
    
    setTimeout(() => {
      if (confirm("Would you like to clear completed tasks for a fresh start tomorrow?")) {
        setTasks(prev => prev.filter(task => !task.completed))
      }
    }, 2000)
  }
  
  const completeOnboarding = () => {
    setSettings(prev => ({ ...prev, onboardingCompleted: true }))
  }

  const remainingCapacity = Math.max(0, settings.dailyCapacity - energyData.total)
  const helperCopy = settings.visualizationType === 'cup' ? 'Add tasks and watch the cup fill' : 'Add tasks and watch the circle fill'

  return (
    <>
      <div className="min-h-screen bg-[linear-gradient(to_bottom,#F9FAFF_0%,#F7F8FC_40%,#F1F2F7_100%)]">
        <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col gap-6 text-center sm:flex-row sm:items-center sm:justify-between">
          <div className="flex justify-center gap-2 sm:justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAchievements(true)}
              className="text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <Award size={20} />
            </Button>
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Enough</h1>
            <p className="text-lg text-slate-600">Do enough. Feel enough.</p>
          </div>
          <div className="flex justify-center gap-2 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <Settings size={20} />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <section className="mt-12">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
            {/* Hero: donut */}
            <main className="col-span-12 md:col-span-7 lg:col-span-7 pt-2">
              <div className="bg-white/80 backdrop-blur rounded-3xl border border-slate-100 shadow-[0_16px_40px_rgba(16,24,40,.06)] px-6 py-8 md:px-10 md:py-12 text-center overflow-visible relative isolate">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Your Energy Today</h2>
                <div className="mt-2 inline-flex p-1 bg-white border border-slate-200 rounded-full shadow">
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, visualizationType: 'circle' }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                      settings.visualizationType === 'circle'
                        ? 'bg-slate-900 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Circle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, visualizationType: 'cup' }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                      settings.visualizationType === 'cup'
                        ? 'bg-slate-900 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cup
                  </button>
                </div>
                <p className="mt-3 text-slate-600">{helperCopy}</p>

                <div className="mt-10 flex justify-center">
                  <EnergyVisualization
                    percent={energyData.total}
                    capacity={settings.dailyCapacity}
                    type={settings.visualizationType}
                    segments={energyData.segments}
                  />
                </div>

                <p
                  className={`mt-5 text-xs font-medium ${
                    energyData.overflow > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {energyData.overflow > 0
                    ? `${energyData.overflow}% over capacity`
                    : `${remainingCapacity}% left`}
                </p>
              </div>
            </main>

            {/* Right rail: tasks */}
            <aside className="col-span-12 md:col-span-5 lg:col-span-5 pt-2">
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-100 shadow-[0_8px_24px_rgba(16,24,40,.06)] p-4 md:p-6 relative overflow-visible">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 text-center sm:text-left">Today&apos;s Tasks</h3>
                  <div className="flex items-center justify-center gap-3">
                    <div className="inline-flex p-1 bg-slate-50 rounded-full border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveView('list')}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                          activeView === 'list'
                            ? 'bg-slate-900 text-white shadow'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('schedule')}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                          activeView === 'schedule'
                            ? 'bg-slate-900 text-white shadow'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Schedule
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(true)}
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <form className="mt-4 flex gap-2" onSubmit={handleQuickAddSubmit}>
                  <input
                    className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    placeholder="Quick add a task..."
                    value={quickAddName}
                    onChange={(event) => setQuickAddName(event.target.value)}
                    aria-label="Quick add a task"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    Add
                  </button>
                </form>

                {quickAddSuggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickAddSuggestions.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => addTaskFromTemplate(template)}
                        className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-600 shadow-sm hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      >
                        {template.name} {template.energy}%
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  {activeView === 'list' ? (
                    tasks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-slate-500">
                        <p className="text-sm">No tasks yet. Start with a quick add above.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={toggleTaskComplete}
                            onDelete={deleteTask}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <ScheduleView
                        tasks={tasks}
                        onScheduleTask={scheduleTask}
                        onUnscheduleTask={unscheduleTask}
                        workingHours={settings.workingHours}
                      />
                    </div>
                  )}
                </div>

                {tasks.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button
                      onClick={markDayComplete}
                      size="lg"
                      className="rounded-full px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      <CheckCircle2 size={20} className="mr-2" />
                      Done for Today
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>

  <button
    type="button"
    onClick={() => setShowQuickAdd(true)}
    className="fixed bottom-5 right-5 px-5 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 sm:hidden"
  >
    Add Task
  </button>

  <QuickAddDialog
    templates={settings.taskTemplates}
    categories={settings.categories}
    onAddTask={addTaskFromTemplate}
    isOpen={showQuickAdd}
    onClose={() => setShowQuickAdd(false)}
    currentCapacity={energyData.total}
    maxCapacity={settings.dailyCapacity}
  />
  
  <SettingsDialog
    settings={settings}
    onUpdateSettings={setSettings}
    isOpen={showSettings}
    onClose={() => setShowSettings(false)}
  />
  
  <AchievementsDialog
    achievements={userStats.achievements}
    isOpen={showAchievements}
    onClose={() => setShowAchievements(false)}
  />
  
  <OnboardingDialog
    isOpen={!settings.onboardingCompleted}
    onComplete={completeOnboarding}
  />
  </>
  )
}
