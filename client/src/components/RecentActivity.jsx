import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = ({ title, items, type }) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">No recent {type}s</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item._id} className="flex items-center space-x-3">
            {item.photo ? (
              <img
                src={item.photo}
                alt={item.name || 'Anonymous'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link
                to={type === 'member' ? `/members` : `#`}
                className="text-sm font-medium text-gray-900 hover:text-green-600 truncate block"
              >
                {item.name || item.donorName || 'Anonymous'}
              </Link>
              <p className="text-xs text-gray-500">
                {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                }) : ''}
              </p>
            </div>
            {type === 'donation' && item.amount && (
              <span className="text-sm font-semibold text-green-600">
                Rs. {(item.amount || 0).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;