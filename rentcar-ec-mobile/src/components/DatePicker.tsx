import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  value: string;       // YYYY-MM-DD
  onChange: (v: string) => void;
  label: string;
  minDate?: string;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function parseDate(s: string): { y: number; m: number; d: number } | null {
  if (!s || s.length < 10) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function DatePicker({ value, onChange, label, minDate }: Props) {
  const [open, setOpen] = useState(false);

  const parsed = parseDate(value) ?? (() => {
    const today = new Date();
    return { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  })();

  const [year,  setYear]  = useState(parsed.y);
  const [month, setMonth] = useState(parsed.m);
  const [sel,   setSel]   = useState<number | null>(parseDate(value)?.d ?? null);

  const minParsed = parseDate(minDate ?? '');

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else             { setMonth(m => m - 1); }
    setSel(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else              { setMonth(m => m + 1); }
    setSel(null);
  };

  const isDisabled = (d: number) => {
    if (!minParsed) return false;
    const cellIso = toIso(year, month, d);
    return cellIso < toIso(minParsed.y, minParsed.m, minParsed.d);
  };

  const handleDay = (d: number) => {
    if (isDisabled(d)) return;
    setSel(d);
  };

  const handleConfirm = () => {
    if (!sel) return;
    onChange(toIso(year, month, sel));
    setOpen(false);
  };

  const handleClose = () => setOpen(false);

  // build calendar grid
  const totalDays  = daysInMonth(year, month);
  const firstDay   = firstDayOfMonth(year, month); // 0=Sun
  const blanks     = firstDay;                      // number of empty cells before day 1

  const displayValue = parseDate(value)
    ? (() => { const p = parseDate(value)!; return `${String(p.d).padStart(2, '0')} ${MONTHS[p.m - 1]} ${p.y}`; })()
    : 'Seleccionar';

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.triggerLabel}>{label}</Text>
        <View style={styles.triggerValueRow}>
          <Text style={styles.triggerIcon}>📅</Text>
          <Text style={styles.triggerValue}>{displayValue}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>

            {/* Header navegación de mes */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Text style={styles.navTxt}>‹</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                <Text style={styles.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
              </ScrollView>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Text style={styles.navTxt}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Días de la semana */}
            <View style={styles.weekRow}>
              {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                <Text key={d} style={styles.weekDay}>{d}</Text>
              ))}
            </View>

            {/* Grid de días */}
            <View style={styles.grid}>
              {Array.from({ length: blanks }).map((_, i) => (
                <View key={`b${i}`} style={styles.cell} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const disabled = isDisabled(day);
                const selected = sel === day;
                const isToday  = (() => {
                  const t = new Date();
                  return t.getFullYear() === year && t.getMonth() + 1 === month && t.getDate() === day;
                })();
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.cell, selected && styles.cellSel, isToday && !selected && styles.cellToday, disabled && styles.cellDisabled]}
                    onPress={() => handleDay(day)}
                    disabled={disabled}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cellTxt, selected && styles.cellTxtSel, disabled && styles.cellTxtDisabled]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botones */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !sel && styles.confirmOff]}
                onPress={handleConfirm}
                disabled={!sel}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmTxt}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  trigger:          { flex: 1 },
  triggerLabel:     { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  triggerValueRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  triggerIcon:      { fontSize: 15 },
  triggerValue:     { fontSize: 15, fontWeight: '700', color: Colors.text },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },

  calHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  navBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTxt:     { fontSize: 28, color: Colors.text, fontWeight: '300' },
  monthTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', paddingHorizontal: 8 },

  weekRow:    { flexDirection: 'row', marginBottom: 4 },
  weekDay:    { width: CELL, textAlign: 'center', fontSize: 12, color: Colors.muted, fontWeight: '600' },

  grid:              { flexDirection: 'row', flexWrap: 'wrap' },
  cell:              { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  cellSel:           { backgroundColor: Colors.primary, borderRadius: 20 },
  cellToday:         { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 20 },
  cellDisabled:      { opacity: 0.25 },
  cellTxt:           { fontSize: 15, color: Colors.text, fontWeight: '500' },
  cellTxtSel:        { color: '#fff', fontWeight: '700' },
  cellTxtDisabled:   { color: Colors.muted },

  footer:     { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelTxt:  { color: Colors.muted, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  confirmOff: { opacity: 0.45 },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
