import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const stats = [
    { label: 'Total Sales', value: '$12,345', change: '+12.5%', positive: true },
    { label: 'Orders', value: '156', change: '+8.2%', positive: true },
    { label: 'Products', value: '45', change: '+2', positive: true },
    { label: 'Pending Payouts', value: '$3,890', change: '', positive: true },
  ]

  const salesData = [
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 5000 },
    { month: 'Apr', sales: 4500 },
    { month: 'May', sales: 6000 },
    { month: 'Jun', sales: 5500 },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.change && (
                <p className={`text-sm ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Order ID</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">ORD-2024{i}</td>
                <td className="px-4 py-3">Customer {i}</td>
                <td className="px-4 py-3">${(Math.random() * 200 + 50).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Completed
                  </span>
                </td>
                <td className="px-4 py-3">2024-03-{15 + i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
