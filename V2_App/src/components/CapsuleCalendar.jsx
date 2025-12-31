import { useState, useMemo } from 'react'
import { getCapsuleProgressProps } from '../lib/capsuleCalendar'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, isSameDay, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CapsuleCalendar({ onSelectDate, selectedDate }) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [loading, setLoading] = useState(false)

    // Mock Availability Data (Replace with real API later)
    const availabilityData = useMemo(() => {
        const days = eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        })

        const data = {}
        days.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            // Random availability for demo
            const total = 10
            const available = Math.floor(Math.random() * 11) // 0 to 10
            data[dateKey] = { total, available }
        })
        return data
    }, [currentDate])

    const daysInMonth = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        })
    }, [currentDate])

    const startPadding = Array(getDay(startOfMonth(currentDate)) === 0 ? 6 : getDay(startOfMonth(currentDate)) - 1).fill(null)

    const handleMonthChange = (direction) => {
        setLoading(true)
        setTimeout(() => {
            setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1))
            setLoading(false)
        }, 300)
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-md mx-auto relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => handleMonthChange('prev')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold text-slate-800 capitalize w-40 text-center">
                    {loading ? <div className="h-6 w-24 bg-gray-200 animate-pulse rounded mx-auto" ></div> : format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>

                <button
                    onClick={() => handleMonthChange('next')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-600"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {startPadding.map((_, i) => <div key={`pad-${i}`} />)}

                {daysInMonth.map(date => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    const today = startOfDay(new Date())
                    const isPast = isBefore(date, today)
                    const isSunday = getDay(date) === 0
                    const { available, total } = availabilityData[dateKey] || { available: 0, total: 0 }
                    const isFull = available === 0

                    const isDisabled = isPast || isSunday || isFull
                    const isSelected = selectedDate && isSameDay(date, selectedDate)

                    return (
                        <CapsuleCell
                            key={dateKey}
                            date={date}
                            available={available}
                            total={total}
                            isDisabled={isDisabled}
                            isSelected={isSelected}
                            onClick={() => !isDisabled && onSelectDate(date)}
                        />
                    )
                })}
            </div>

            {/* Simple Legend */}
            <div className="mt-6 flex justify-center space-x-4 text-[10px] text-gray-400">
                <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-200 mr-1.5"></div>
                    <span>Complet</span>
                </div>
                <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
                    <span>Disponible</span>
                </div>
            </div>
        </div>
    )
}

function CapsuleCell({ date, available, total, isDisabled, isSelected, onClick }) {
    const ratio = total > 0 ? (available / total) : 0
    const { viewBox, offset, gradientId, rectProps, gradientColors } = getCapsuleProgressProps(ratio)
    const dayNumber = format(date, 'd')

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`
                relative w-full aspect-square flex items-center justify-center rounded-full transition-all group focus:outline-none 
                ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer hover:bg-gray-50 active:scale-95'}
                ${isSelected ? 'bg-blue-600 !opacity-100 shadow-lg shadow-blue-500/30 text-white transform scale-105 z-10' : 'text-slate-700'}
            `}
        >
            {/* Progress Ring SVG */}
            {!isDisabled && !isSelected && (
                <svg viewBox={viewBox} className="absolute inset-0 w-full h-full rotate-[-90deg]">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            {gradientColors.map((c, i) => (
                                <stop key={i} offset={`${(i / (gradientColors.length - 1)) * 100}%`} stopColor={c} />
                            ))}
                        </linearGradient>
                    </defs>

                    {/* Track */}
                    <rect
                        {...rectProps}
                        fill="none"
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth="8"
                    />

                    {/* Progress Fill */}
                    <rect
                        {...rectProps}
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="8"
                        strokeDasharray="100"
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                </svg>
            )}

            <span className={`text-sm font-semibold relative z-10 ${isSelected ? 'text-white' : ''}`}>
                {dayNumber}
            </span>

            {/* Tooltip on Hover */}
            {!isDisabled && !isSelected && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {available} dispo
                </div>
            )}
        </button>
    )
}
