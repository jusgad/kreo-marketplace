import { useState } from 'react'
import { FiPlus, FiEdit, FiTrash2, FiUpload } from 'react-icons/fi'

export default function ProductsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex space-x-4">
          <button className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            <FiUpload className="mr-2" />
            Bulk Upload (CSV)
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Image</th>
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-left">SKU</th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">Inventory</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b">
                <td className="px-6 py-4">
                  <div className="w-16 h-16 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold">Product Title {i}</div>
                  <div className="text-sm text-gray-500">Category Name</div>
                </td>
                <td className="px-6 py-4">SKU-{1000 + i}</td>
                <td className="px-6 py-4">${(Math.random() * 100 + 20).toFixed(2)}</td>
                <td className="px-6 py-4">{Math.floor(Math.random() * 100)}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <FiEdit />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-6">Add New Product</h2>
            <form>
              <div className="mb-4">
                <label className="block mb-2 font-semibold">Product Title</label>
                <input type="text" className="w-full border border-gray-300 px-4 py-2 rounded-lg" />
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-semibold">Description</label>
                <textarea className="w-full border border-gray-300 px-4 py-2 rounded-lg" rows={4}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-semibold">Price</label>
                  <input type="number" className="w-full border border-gray-300 px-4 py-2 rounded-lg" />
                </div>
                <div>
                  <label className="block mb-2 font-semibold">Inventory</label>
                  <input type="number" className="w-full border border-gray-300 px-4 py-2 rounded-lg" />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
