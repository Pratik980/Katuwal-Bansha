import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const Table = ({
  columns,
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  pagination,
  customActions,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data found
      </div>
    );
  }

  const renderCellContent = (item, column) => {
    const value = item[column.key];

    if (column.render) {
      return <span className="text-sm text-gray-900">{column.render(value, item)}</span>;
    }

    switch (column.type) {
      case 'member':

        if (value && typeof value === 'object') {
          return <span className="text-sm text-gray-900">{value.name || 'Unknown'}</span>;
        }
        return <span className="text-sm text-gray-900">{value || '-'}</span>;

      case 'verified':
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {value ? 'Verified' : 'Pending'}
          </span>
        );

      case 'image':
        return value ? (
          <img
            src={value}
            alt={item.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No img</span>
          </div>
        );

      case 'status':
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              value === 'completed' || value === 'success'
                ? 'bg-green-100 text-green-800'
                : value === 'pending' || value === 'processing'
                ? 'bg-yellow-100 text-yellow-800'
                : value === 'failed' || value === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {value || 'Unknown'}
          </span>
        );

      case 'boolean':
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {value ? 'Yes' : 'No'}
          </span>
        );

      case 'filesize':
        return <span className="text-sm text-gray-900">{formatFileSize(value)}</span>;

      case 'date':
        return <span className="text-sm text-gray-900">{formatDate(value)}</span>;

      default:

        if (value && typeof value === 'object') {
          return <span className="text-sm text-gray-900">{value.name || value.title || JSON.stringify(value)}</span>;
        }
        return <span className="text-sm text-gray-900">{value || '-'}</span>;
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={item._id || index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {renderCellContent(item, column)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {onView && (
                    <button
                      onClick={() => onView(item)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      title="View"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                  {customActions?.(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;