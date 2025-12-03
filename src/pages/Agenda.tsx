import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search, Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import type { Event, UrgencyLevel, Boleto } from "@/types/agenda"
import { DayModal } from "@/components/agenda/day-modal"
import { FinanceModal } from "@/components/agenda/finance-modal"
import { EventModal } from "@/components/agenda/event-modal"
import { cn } from "@/lib/utils"
import { useEvents } from "@/hooks/data/useEvents"

// Mock boletos temporarily until a useBoletos hook is created
const mockBoletos: Boleto[] = []

export default function Agenda() {
    const { events, loading, addEvent, updateEvent, deleteEvent } = useEvents()
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [isDayModalOpen, setIsDayModalOpen] = useState(false)
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Task specific state
    const [taskUrgencyFilter, setTaskUrgencyFilter] = useState<UrgencyLevel | "todos">("todos")
    const [newTaskTitle, setNewTaskTitle] = useState("")

    // New state for single event modal
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)

    // Filter events for the selected date
    const selectedDateEvents = events.filter(event =>
        date &&
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear()
    )

    // Filter tasks based on urgency
    const filteredTasks = selectedDateEvents.filter(task =>
        taskUrgencyFilter === "todos" || task.urgency === taskUrgencyFilter
    )

    // Filter events based on search query (global search)
    const globalFilteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.client.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Filter boletos for the selected date (using mock for now)
    const selectedDateBoletos = mockBoletos.filter(boleto =>
        date &&
        boleto.dueDate.getDate() === date.getDate() &&
        boleto.dueDate.getMonth() === date.getMonth() &&
        boleto.dueDate.getFullYear() === date.getFullYear()
    )

    const handleAddEvent = (newEvent: Omit<Event, "id">) => {
        addEvent(newEvent)
    }

    const handleAddTask = () => {
        if (!newTaskTitle.trim() || !date) return

        const newTask: Omit<Event, "id"> = {
            title: newTaskTitle,
            date: date,
            type: "outros",
            urgency: "normal",
            category: "tarefa",
            client: "Sistema", // Default client
            description: "",
            completed: false
        }
        addEvent(newTask)
        setNewTaskTitle("")
    }

    const handleUpdateEvent = (updatedEvent: Event) => {
        updateEvent(updatedEvent)
    }

    const handleDeleteEvent = (eventId: string) => {
        deleteEvent(eventId)
    }

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event)
        setIsEventModalOpen(true)
    }

    // Custom Calendar Logic
    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1)
        const days = []

        // Previous month padding
        const firstDayOfWeek = date.getDay()
        for (let i = 0; i < firstDayOfWeek; i++) {
            const prevDate = new Date(year, month, -i)
            days.unshift({ date: prevDate, isCurrentMonth: false })
        }

        // Current month days
        while (date.getMonth() === month) {
            days.push({ date: new Date(date), isCurrentMonth: true })
            date.setDate(date.getDate() + 1)
        }

        // Next month padding to fill 6 rows (42 cells)
        const remainingCells = 42 - days.length
        for (let i = 1; i <= remainingCells; i++) {
            const nextDate = new Date(year, month + 1, i)
            days.push({ date: nextDate, isCurrentMonth: false })
        }

        return days
    }

    const days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    const isToday = (d: Date) => {
        const today = new Date()
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
    }

    const isSelected = (d: Date) => {
        return date &&
            d.getDate() === date.getDate() &&
            d.getMonth() === date.getMonth() &&
            d.getFullYear() === date.getFullYear()
    }

    const getDayEvents = (d: Date) => {
        return events.filter(e =>
            e.date.getDate() === d.getDate() &&
            e.date.getMonth() === d.getMonth() &&
            e.date.getFullYear() === d.getFullYear()
        )
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 shrink-0 gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
                    <p className="text-muted-foreground">
                        Gerencie suas tarefas e compromissos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar compromisso, tarefa ou cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button onClick={() => setIsDayModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Item
                    </Button>
                </div>
            </div>

            {searchQuery && (
                <Card className="mb-4 border-primary/20 bg-primary/5">
                    <CardContent className="p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Resultados da busca:</p>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {globalFilteredEvents.length > 0 ? (
                                globalFilteredEvents.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => {
                                            setDate(event.date)
                                            handleEventClick(event)
                                        }}
                                        className="flex flex-col items-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                                    >
                                        <span className="font-medium">{event.title}</span>
                                        <span className="text-xs text-muted-foreground">{event.client} - {event.date.toLocaleDateString()}</span>
                                        <Badge variant="outline" className="mt-1 text-[10px]">{event.category}</Badge>
                                    </button>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-12 h-full overflow-hidden pb-4">
                {/* Left Column: Content (Appointments & Tasks) */}
                <div className="col-span-7 flex flex-col gap-4 h-full overflow-hidden">

                    <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-primary" />
                                    <span>Agenda de {date?.toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={taskUrgencyFilter}
                                        onValueChange={(value) => setTaskUrgencyFilter(value as UrgencyLevel | "todos")}
                                    >
                                        <SelectTrigger className="w-[130px] h-8 text-xs">
                                            <SelectValue placeholder="Urgência" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todas Urgências</SelectItem>
                                            <SelectItem value="urgente">Urgente</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="leve">Leve</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                            {/* Quick Add Input */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Adicionar nova tarefa rápida..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                                    className="h-9"
                                />
                                <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Unified List */}
                            {selectedDateEvents.length > 0 ? (
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                    {selectedDateEvents
                                        .filter(event => taskUrgencyFilter === "todos" || event.urgency === taskUrgencyFilter)
                                        .sort((a, b) => {
                                            // Sort by completion (pending first), then urgency (urgente first), then time/creation
                                            if (a.completed === b.completed) {
                                                if (a.urgency === "urgente" && b.urgency !== "urgente") return -1
                                                if (a.urgency !== "urgente" && b.urgency === "urgente") return 1
                                                return 0
                                            }
                                            return a.completed ? 1 : -1
                                        })
                                        .map((event) => (
                                            <div
                                                key={event.id}
                                                className={cn(
                                                    "w-full flex items-center p-3 rounded-lg border transition-all duration-200 group",
                                                    event.completed
                                                        ? "bg-muted/30 border-border/30"
                                                        : "bg-card border-border/50 hover:bg-accent/50 hover:border-accent"
                                                )}
                                            >
                                                <div className="mr-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!event.completed}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            const updatedEvent = { ...event, completed: e.target.checked }
                                                            handleUpdateEvent(updatedEvent)
                                                        }}
                                                        className="h-4 w-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </div>

                                                <button
                                                    className="flex-1 text-left flex items-center"
                                                    onClick={() => handleEventClick(event)}
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <p className={cn(
                                                            "font-semibold text-sm transition-all",
                                                            event.completed ? "text-muted-foreground line-through decoration-muted-foreground/50" : "group-hover:text-primary"
                                                        )}>
                                                            {event.title}
                                                        </p>
                                                        <p className={cn(
                                                            "text-xs",
                                                            event.completed ? "text-muted-foreground/50" : "text-muted-foreground"
                                                        )}>
                                                            {event.client}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-2">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5 capitalize", event.completed && "opacity-50")}>
                                                            {event.category}
                                                        </Badge>
                                                        <Badge
                                                            variant={event.type === "renovacao" ? "default" : "secondary"}
                                                            className={cn("capitalize text-[10px] h-5", event.completed && "opacity-50")}
                                                        >
                                                            {event.type}
                                                        </Badge>
                                                        {event.urgency === "urgente" && !event.completed && (
                                                            <Badge variant="destructive" className="text-[10px] h-5 shadow-sm animate-pulse">Urgente</Badge>
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
                                    <CalendarIcon className="h-10 w-10 mb-3 opacity-20" />
                                    <p>Nenhum item na agenda para hoje.</p>
                                    <p className="text-xs opacity-70 mt-1">Adicione uma tarefa rápida acima ou use o botão Adicionar Item.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Custom Calendar */}
                <Card className="col-span-5 h-full flex flex-col border-none shadow-md bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="capitalize">
                            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </CardTitle>
                        <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
                                <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                            {days.map((dayObj, index) => {
                                const dayEvents = getDayEvents(dayObj.date)
                                const hasUrgent = dayEvents.some(e => e.urgency === "urgente")
                                const hasRenovacao = dayEvents.some(e => e.type === "renovacao")

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setDate(dayObj.date)}
                                        onDoubleClick={() => {
                                            setDate(dayObj.date)
                                            setIsDayModalOpen(true)
                                        }}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center rounded-md transition-all duration-200 hover:bg-accent/50",
                                            !dayObj.isCurrentMonth && "text-muted-foreground/30",
                                            isSelected(dayObj.date) && "bg-primary/10 text-primary font-bold ring-1 ring-primary",
                                            isToday(dayObj.date) && !isSelected(dayObj.date) && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <span className="text-sm">
                                            {dayObj.date.getDate()}
                                        </span>

                                        {/* Event Indicators */}
                                        <div className="flex gap-0.5 mt-1 h-1.5">
                                            {hasUrgent && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                            )}
                                            {hasRenovacao && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            {date && (
                <>
                    <DayModal
                        isOpen={isDayModalOpen}
                        onClose={() => setIsDayModalOpen(false)}
                        date={date}
                        events={selectedDateEvents}
                        onAddEvent={handleAddEvent}
                        onOpenFinance={() => setIsFinanceModalOpen(true)}
                        boletosCount={selectedDateBoletos.length}
                    />

                    <FinanceModal
                        isOpen={isFinanceModalOpen}
                        onClose={() => setIsFinanceModalOpen(false)}
                        date={date}
                        boletos={selectedDateBoletos}
                    />
                </>
            )}

            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                event={selectedEvent}
                onUpdate={handleUpdateEvent}
                onDelete={handleDeleteEvent}
            />
        </div>
    )
}