import { FiDownload } from 'react-icons/fi'

export default function PayoutsPage() {
  const payouts = [
    { id: 1, date: '2024-03-15', amount: 1245.50, commission: 124.55, net: 1120.95, status: 'paid' },
    { id: 2, date: '2024-03-08', amount: 980.00, commission: 98.00, net: 882.00, status: 'paid' },
    { id: 3, date: '2024-03-01', amount: 1567.25, commission: 156.73, net: 1410.52, status: 'paid' },
    { id: 4, date: '2024-02-22', amount: 2100.00, commission: 210.00, net: 1890.00, status: 'pending' },
  ]

  const totalEarnings = payouts.reduce((sum, payout) => sum + payout.net, 0)
  const totalCommission = payouts.reduce((sum, payout) => sum + payout.commission, 0)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Payouts</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600 text-sm mb-2">Total Earnings</p>
          <p className="text-3xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600 text-sm mb-2">Total Commission Paid</p>
          <p className="text-3xl font-bold text-orange-600">${totalCommission.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-600 text-sm mb-2">Pending Payouts</p>
          <p className="text-3xl font-bold text-blue-600">$1,890.00</p>
        </div>
      </div>

      {/* Stripe Connect Status */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Stripe Connect Verified</h3>
            <p className="text-sm text-blue-700">Your account is connected and ready to receive payouts</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Manage Account
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Payout History</h2>
          <button className="flex items-center text-blue-600 hover:text-blue-800">
            <FiDownload className="mr-2" />
            Export CSV
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Gross Amount</th>
              <th className="px-6 py-3 text-left">Commission (10%)</th>
              <th className="px-6 py-3 text-left">Net Payout</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-b">
                <td className="px-6 py-4">{payout.date}</td>
                <td className="px-6 py-4">${payout.amount.toFixed(2)}</td>
                <td className="px-6 py-4 text-orange-600">-${payout.commission.toFixed(2)}</td>
                <td className="px-6 py-4 font-semibold">${payout.net.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    payout.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
