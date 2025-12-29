
import React from 'react';
import { Vehicle } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface StatsDashboardProps {
  vehicle: Vehicle;
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ vehicle }) => {
  const entries = [...vehicle.entries].reverse(); // Sort from oldest to newest for charts

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

  const fuelDistribution = [
    { name: 'Gasolina', value: vehicle.entries.filter(e => e.fuelType === 'Gasolina').length },
    { name: 'Álcool', value: vehicle.entries.filter(e => e.fuelType === 'Álcool').length },
  ];

  const COLORS = ['#3B82F6', '#10B981'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Média Consumo</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{avgEfficiency.toFixed(2)} <span className="text-sm font-normal text-gray-400">km/l</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Gasto</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Litros</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalLiters.toFixed(1)} <span className="text-sm font-normal text-gray-400">L</span></p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Última KM</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{vehicle.entries[0]?.kmTotal || 0} <span className="text-sm font-normal text-gray-400">km</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Eficiência ao Longo do Tempo</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                />
                <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="KM/L" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Preço por Litro</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" />
                <YAxis fontSize={12} stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                />
                <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="R$/L" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
