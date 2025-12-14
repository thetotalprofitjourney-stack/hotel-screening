import React from 'react';
import NumericInput from './NumericInput';

// Función para obtener días exactos de un mes considerando años bisiestos
const getDaysInMonth = (month: number, year: number = new Date().getFullYear()): number => {
  // month: 1-12
  return new Date(year, month, 0).getDate();
};

interface MonthlyTableProps {
  rows: any[];
  onChange: (r: any[]) => void;
  habitaciones: number;
  onFieldEdit?: (mes: number, campo: 'dias' | 'occ' | 'adr') => void;
}

export default function MonthlyTable({ rows, onChange, habitaciones, onFieldEdit }: MonthlyTableProps) {
  const currentYear = new Date().getFullYear();

  function upd(i:number, key:'occ'|'adr'|'dias', val:number) {
    const next = rows.slice();
    // Si es ocupación, convertir de porcentaje entero (0-100) a decimal (0-1)
    if (key === 'occ') {
      (next[i] as any)[key] = val / 100;
    } else {
      (next[i] as any)[key] = val;
    }
    onChange(next);
  }

  // Normalizar ocupación: siempre debe ser un valor decimal entre 0 y 1
  const normalizeOcc = (occ: number): number => {
    if (typeof occ !== 'number' || isNaN(occ)) return 0;
    // Si el valor es mayor a 1, probablemente está en formato porcentual (ej: 81)
    // Si es menor o igual a 1, está en formato decimal (ej: 0.81)
    return occ > 1 ? occ / 100 : occ;
  };

  // Calcular Roomnights y Rooms Rev para cada mes
  const calcRoomnights = (dias: number, ocupacion: number) => {
    // Si días = 0 (hotel cerrado), roomnights = 0
    if (dias === 0) return 0;
    return Math.round(habitaciones * dias * ocupacion);
  };

  const calcRoomsRev = (roomnights: number, adr: number, dias: number) => {
    // Si días = 0 (hotel cerrado), rooms rev = 0
    if (dias === 0) return 0;
    return roomnights * adr;
  };

  const calcRevPAR = (ocupacion: number, adr: number, dias: number) => {
    // Si días = 0 (hotel cerrado), revpar = 0
    if (dias === 0) return 0;
    return ocupacion * adr;
  };

  // Calcular KPIs anuales
  const calcAnnualKPIs = () => {
    let totalRoomnights = 0;
    let totalRoomsRev = 0;
    let totalAvailableRooms = 0;
    let totalDias = 0;

    rows.forEach((r) => {
      const ocupacion = normalizeOcc(r.occ);
      const dias = r.dias !== undefined && r.dias !== null ? r.dias : getDaysInMonth(r.mes || 1, currentYear);
      const roomnights = calcRoomnights(dias, ocupacion);
      const roomsRev = calcRoomsRev(roomnights, r.adr, dias);
      const availableRooms = habitaciones * dias;

      totalRoomnights += roomnights;
      totalRoomsRev += roomsRev;
      totalAvailableRooms += availableRooms;
      totalDias += dias;
    });

    // Ocupación operativa (días abiertos) = sumatorio de Roomnights / sumatorio de habitaciones disponibles del año
    const occAnual = totalAvailableRooms > 0 ? totalRoomnights / totalAvailableRooms : 0;

    // Ocupación financiera (inventario total 365 días)
    const inventarioTotal = habitaciones * 365;
    const occFinanciera = inventarioTotal > 0 ? totalRoomnights / inventarioTotal : 0;

    // ADR anual = Rooms Rev anualizado / Roomnights anualizadas
    const adrAnual = totalRoomnights > 0 ? totalRoomsRev / totalRoomnights : 0;
    // RevPAR anual = ocupación anual * ADR anual
    const revparAnual = occAnual * adrAnual;

    // Detectar si se han modificado días (comparar con inventario total)
    const diasModificados = totalDias !== inventarioTotal;

    return {
      ocupacion: occAnual,
      ocupacionFinanciera: occFinanciera,
      diasModificados,
      adr: adrAnual,
      roomnights: totalRoomnights,
      roomsRev: totalRoomsRev,
      revpar: revparAnual
    };
  };

  const annual = calcAnnualKPIs();

  return (
    <div className="space-y-4">
      {/* Tabla Mensual - PRIMERO */}
      <div className="overflow-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">Mes</th>
              <th className="p-2">Días</th>
              <th className="p-2">Ocupación</th>
              <th className="p-2">ADR (€)</th>
              <th className="p-2 bg-blue-50">Roomnights</th>
              <th className="p-2 bg-green-50">Rooms Rev (€)</th>
              <th className="p-2 bg-purple-50">RevPAR (€)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              // Normalizar ocupación a decimal (0-1) independientemente del formato de entrada
              const ocupacion = normalizeOcc(r.occ);
              const dias = r.dias !== undefined && r.dias !== null ? r.dias : getDaysInMonth(r.mes || (i + 1), currentYear);
              const roomnights = calcRoomnights(dias, ocupacion);
              const roomsRev = calcRoomsRev(roomnights, r.adr, dias);
              const revpar = calcRevPAR(ocupacion, r.adr, dias);

              return (
                <tr key={r.mes} className="border-t">
                  <td className="p-2 text-center font-medium">{r.mes}</td>
                  <td className="p-2 text-center">
                    <input className="w-16 border px-2 py-1 rounded text-right"
                      type="number" min={0} max={31} step={1}
                      value={dias}
                      onChange={e=>upd(i,'dias', Number(e.target.value))}
                      onFocus={e => e.target.select()}
                      onBlur={() => onFieldEdit && onFieldEdit(r.mes, 'dias')}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <NumericInput
                      className="w-24 border px-2 py-1 rounded text-right"
                      value={ocupacion * 100}
                      onChange={val => upd(i, 'occ', val)}
                      onBlur={() => onFieldEdit && onFieldEdit(r.mes, 'occ')}
                      decimals={2}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input className="w-28 border px-2 py-1 rounded text-right"
                      type="number" min={0} step={1}
                      value={r.adr}
                      onChange={e=>upd(i,'adr', Number(e.target.value))}
                      onFocus={e => e.target.select()}
                      onBlur={() => onFieldEdit && onFieldEdit(r.mes, 'adr')}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </td>
                  <td className="p-2 text-right bg-blue-50 font-semibold">
                    {fmtNumber(roomnights)}
                  </td>
                  <td className="p-2 text-right bg-green-50 font-semibold">
                    {fmt(roomsRev)}
                  </td>
                  <td className="p-2 text-right bg-purple-50 font-semibold">
                    {fmtDecimal(revpar, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* KPIs Anuales - DESPUÉS */}
      <div className={`grid gap-3 p-4 bg-gray-50 rounded-lg ${annual.diasModificados ? 'grid-cols-6' : 'grid-cols-5'}`}>
        <Stat label="Ocupación" value={`${fmtDecimal(annual.ocupacion * 100, 1)}%`} />
        {annual.diasModificados && (
          <Stat label="Ocupación si 100%" value={`${fmtDecimal(annual.ocupacionFinanciera * 100, 1)}%`} />
        )}
        <Stat label="ADR" value={fmtDecimal(annual.adr, 2)} />
        <Stat label="Roomnights" value={fmtNumber(annual.roomnights)} />
        <Stat label="Rooms Rev" value={fmt(annual.roomsRev)} />
        <Stat label="RevPAR" value={fmtDecimal(annual.revpar, 2)} />
      </div>
    </div>
  );
}

function fmt(n: number) {
  const rounded = Math.round(n ?? 0);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}

function fmtNumber(n: number) {
  const rounded = Math.round(n);
  const str = Math.abs(rounded).toString();
  const parts = [];
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    parts.unshift(str.substring(start, i));
  }
  const formatted = parts.join('.');
  return rounded < 0 ? '-' + formatted : formatted;
}

function fmtDecimal(n: number, decimals: number = 2) {
  // Separar parte entera y decimal
  const parts = n.toFixed(decimals).split('.');
  const intPart = parseInt(parts[0]);
  const decPart = parts[1];

  // Formatear parte entera con separador de miles
  const intStr = Math.abs(intPart).toString();
  const intGroups = [];
  for (let i = intStr.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    intGroups.unshift(intStr.substring(start, i));
  }
  const formattedInt = intGroups.join('.');
  const signedInt = intPart < 0 ? '-' + formattedInt : formattedInt;

  // Combinar con parte decimal usando coma
  return decPart ? `${signedInt},${decPart}` : signedInt;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">
        {typeof value === 'string' ? value : fmtNumber(value)}
      </div>
    </div>
  );
}
