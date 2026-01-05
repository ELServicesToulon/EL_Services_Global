import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Pill } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

export function Calendar({ onSelectDate }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Align to Monday start
    const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1; // 0=Sun, so Mon=0 relative shift
    const emptyDays = Array(startDay).fill(null);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            {/* Header Month/Year */}
            <div className="flex items-center justify-between mb-6 px-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-brand-purple">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-brand-purple capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: fr })}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-brand-purple">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-4 text-center">
                {/* Weekday Names */}
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-brand-purple/70 font-medium mb-2">{day}</div>
                ))}

                {/* Empty Slots */}
                {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}

                {/* Days */}
                {daysInMonth.map((day) => {
                    const isSelected = false; // To be handled by parent state if needed
                    const isCurrentDay = isToday(day);

                    return (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={day.toString()}
                            onClick={() => onSelectDate(day)}
                            className={`
                        relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all
                        border-2 
                        ${isCurrentDay ? 'border-brand-blue bg-blue-50' : 'border-transparent hover:border-gray-200 bg-white/50'}
                        shadow-sm
                    `}
                        >
                            <span className="text-lg font-bold text-gray-700">{format(day, 'd')}</span>

                            {/* Pill Icon decoration */}
                            <div className="mt-1 w-8 h-4 bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 rounded-full flex items-center justify-center">
                                <div className="w-3 h-1.5 bg-white/80 rounded-full shadow-sm" />
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
