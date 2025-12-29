
import React from 'react';
import { Vehicle } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsDashboardProps {
  vehicle: Vehicle;
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ vehicle }) => {
  const entries = [...vehicle.entries].reverse();

  const totalSpent = vehicle.entries.reduce((acc, curr) => acc + curr.value, 0);
  const totalLiters = vehicle.entries.reduce((acc, curr) => acc + curr.liters, 0);
  const avgEfficiency = vehicle.entries.length > 0
    ? vehicle.entries.reduce((acc, curr) => acc + curr.efficiency, 0) / vehicle.entries.length
    : 0;
  
  const chartData = entries.map(e => ({
    name: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    efficiency: parseFloat(e.efficiency.toFixed(2)),
    price: parseFloat(e.pricePerLiter.toFixed(2)),
  }));

  return (
    <div className="space-y-8">
      {/* 4 Column Grid aligned with mockup style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Média Consumo</p>
          <p className="text-2xl font-black text-blue-600">
            {avgEfficiency.toFixed(2)} <span className="text-xs font-medium text-gray-400">km/l</span>
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Gasto</p>
          <p className="text-2xl font-black text-emerald-600">
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Litros</p>
          <p className="text-2xl font-black text-orange-500">
            {totalLiters.toFixed(1)} <span className="text-xs font-medium text-gray-400">L</span>
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Última KM</p>
          <p className="text-2xl font-black text-gray-900">
            {vehicle.entries[0]?.kmTotal || 0} <span className="text-xs font-medium text-gray-400">km</span>
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
          <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-500"></i>
            Desempenho de Eficiência
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" fontSize={10} stroke="#cbd5e1" fontVariant="bold" />
                <YAxis fontSize={10} stroke="#cbd5e1" />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }} 
                  name="KM/L" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
