import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  fechaInicio: string;
  fechaFin: string;
  onChangeFechaInicio: (d: string) => void;
  onChangeFechaFin: (d: string) => void;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function isSame(a: string, b: string) { return a && b && a === b; }
function isBetween(day: string, start: string, end: string) {
  if (!start || !end) return false;
  return day > start && day < end;
}

export default function DateRangePicker({ fechaInicio, fechaFin, onChangeFechaInicio, onChangeFechaFin }: Props) {
  const today  = new Date();
  const [open, setOpen]   = useState(false);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [step, setStep]   = useState<'inicio' | 'fin'>('inicio');

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const handleDay = (d: number) => {
    const selected = fmt(year, month, d);
    if (step === 'inicio') {
      onChangeFechaInicio(selected);
      onChangeFechaFin('');
      setStep('fin');
    } else {
      if (selected <= fechaInicio) {
        onChangeFechaInicio(selected);
        onChangeFechaFin('');
        setStep('fin');
      } else {
        onChangeFechaFin(selected);
        setOpen(false);
        setStep('inicio');
      }
    }
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmtDisplay = (s: string) => {
    const d = parseDate(s);
    if (!d) return 'Seleccionar';
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
  };

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity style={styles.trigger} onPress={() => { setOpen(true); setStep('inicio'); }}>
        <View style={styles.half}>
          <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.triggerLabel}>INICIO</Text>
            <Text style={[styles.triggerValue, !fechaInicio && styles.placeholder]}>
              {fmtDisplay(fechaInicio)}
            </Text>
          </View>
        </View>
        <View style={styles.sep} />
        <View style={styles.half}>
          <Ionicons name="flag-outline" size={15} color={Colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.triggerLabel}>FIN</Text>
            <Text style={[styles.triggerValue, !fechaFin && styles.placeholder]}>
              {fmtDisplay(fechaFin)}
            </Text>
          </View>
        </View>
        {(fechaInicio || fechaFin) && (
          <TouchableOpacity onPress={() => { onChangeFechaInicio(''); onChangeFechaFin(''); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Modal calendario */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>

            {/* Instrucción */}
            <Text style={styles.hint}>
              {step === 'inicio' ? 'Selecciona fecha de inicio' : 'Selecciona fecha de fin'}
            </Text>

            {/* Navegación mes */}
            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MESES[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Cabecera días */}
            <View style={styles.weekRow}>
              {DIAS.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
            </View>

            {/* Grid días */}
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={styles.cell} />;
                const dayStr  = fmt(year, month, day);
                const isStart = isSame(dayStr, fechaInicio);
                const isEnd   = isSame(dayStr, fechaFin);
                const inRange = isBetween(dayStr, fechaInicio, fechaFin);
                const isPast  = dayStr < fmt(today.getFullYear(), today.getMonth(), today.getDate());

                return (
                  <TouchableOpacity
                    key={dayStr}
                    style={[
                      styles.cell,
                      inRange  && styles.cellRange,
                      isStart  && styles.cellSelected,
                      isEnd    && styles.cellSelected,
                      isPast   && styles.cellPast,
                    ]}
                    onPress={() => !isPast && handleDay(day)}
                    disabled={isPast}
                  >
                    <Text style={[
                      styles.cellText,
                      (isStart || isEnd) && styles.cellTextSelected,
                      isPast  && styles.cellTextPast,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Resumen selección */}
            {(fechaInicio || fechaFin) && (
              <View style={styles.selRow}>
                <Text style={styles.selText}>
                  {fechaInicio ? fmtDisplay(fechaInicio) : '—'}
                  {fechaFin ? ` → ${fmtDisplay(fechaFin)}` : ''}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeTxt}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger:      { backgroundColor: Colors.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.border },
  half:         { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sep:          { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 8 },
  triggerLabel: { fontSize: 10, color: Colors.muted, fontWeight: '700', letterSpacing: 0.5 },
  triggerValue: { fontSize: 14, color: Colors.text, fontWeight: '600', marginTop: 2 },
  placeholder:  { color: Colors.muted, fontWeight: '400' },
  clearBtn:     { padding: 4, marginLeft: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modal:   { backgroundColor: Colors.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.border },

  hint:       { textAlign: 'center', color: Colors.primary, fontWeight: '700', fontSize: 13, marginBottom: 16, letterSpacing: 0.3 },
  navRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:     { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },

  weekRow:  { flexDirection: 'row', marginBottom: 8 },
  weekDay:  { flex: 1, textAlign: 'center', fontSize: 12, color: Colors.muted, fontWeight: '600' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap' },
  cell:     { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  cellText: { fontSize: 14, color: Colors.text, fontWeight: '500' },

  cellSelected:     { backgroundColor: Colors.primary, borderRadius: 10 },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellRange:        { backgroundColor: `${Colors.primary}33`, borderRadius: 0 },
  cellPast:         { opacity: 0.25 },
  cellTextPast:     { color: Colors.muted },

  selRow:  { marginTop: 14, backgroundColor: `${Colors.primary}15`, borderRadius: 10, padding: 10, alignItems: 'center' },
  selText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },

  closeBtn: { marginTop: 16, backgroundColor: Colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeTxt: { color: Colors.text, fontWeight: '700', fontSize: 15 },
});
