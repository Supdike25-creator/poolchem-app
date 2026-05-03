import React from 'react';

interface Pool {
  id: string;
  name: string;
  lastTestTime: string;
  freeChlorine: number;
  ph: number;
  status: 'good' | 'warning' | 'overdue' | 'unsafe';
  lastGuard: string;
}

const fakePools: Pool[] = [
  {
    id: '1',
    name: 'Main Pool',
    lastTestTime: '2024-01-15 09:30',
    freeChlorine: 2.5,
    ph: 7.4,
    status: 'good',
    lastGuard: 'John Smith'
  },
  {
    id: '2',
    name: 'Kids Pool',
    lastTestTime: '2024-01-15 08:45',
    freeChlorine: 1.8,
    ph: 7.6,
    status: 'warning',
    lastGuard: 'Sarah Johnson'
  },
  {
    id: '3',
    name: 'Olympic Pool',
    lastTestTime: '2024-01-14 16:20',
    freeChlorine: 3.2,
    ph: 7.2,
    status: 'good',
    lastGuard: 'Mike Davis'
  },
  {
    id: '4',
    name: 'Therapy Pool',
    lastTestTime: '2024-01-13 14:15',
    freeChlorine: 0.8,
    ph: 8.1,
    status: 'unsafe',
    lastGuard: 'Emma Wilson'
  },
  {
    id: '5',
    name: 'Diving Pool',
    lastTestTime: '2024-01-12 11:00',
    freeChlorine: 2.1,
    ph: 7.5,
    status: 'overdue',
    lastGuard: 'Tom Brown'
  },
  {
    id: '6',
    name: 'Lap Pool',
    lastTestTime: '2024-01-15 10:15',
    freeChlorine: 2.8,
    ph: 7.3,
    status: 'good',
    lastGuard: 'Lisa Garcia'
  }
];

const getStatusColor = (status: Pool['status']) => {
  switch (status) {
    case 'good':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'unsafe':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: Pool['status']) => {
  switch (status) {
    case 'good':
      return 'Good';
    case 'warning':
      return 'Warning';
    case 'overdue':
      return 'Overdue';
    case 'unsafe':
      return 'Unsafe';
    default:
      return 'Unknown';
  }
};

export default function Dashboard() {
  const totalPools = fakePools.length;
  const overduePools = fakePools.filter(pool => pool.status === 'overdue').length;
  const outOfRangePools = fakePools.filter(pool => pool.status === 'warning' || pool.status === 'unsafe').length;
  const testsToday = fakePools.filter(pool => pool.lastTestTime.startsWith('2024-01-15')).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ChemDeck Manager Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor pool chemistry across all facilities</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pools</p>
                <p className="text-2xl font-bold text-gray-900">{totalPools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Pools</p>
                <p className="text-2xl font-bold text-gray-900">{overduePools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out-of-Range</p>
                <p className="text-2xl font-bold text-gray-900">{outOfRangePools}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tests Today</p>
                <p className="text-2xl font-bold text-gray-900">{testsToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pools Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pool Status Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pool Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Test Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Free Chlorine (ppm)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    pH
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Guard
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fakePools.map((pool) => (
                  <tr key={pool.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pool.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pool.lastTestTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pool.freeChlorine}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pool.ph}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(pool.status)}`}>
                        {getStatusText(pool.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pool.lastGuard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}