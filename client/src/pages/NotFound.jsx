// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
      <p className="text-5xl font-bold text-green-500">404</p>
      <h1 className="text-xl font-semibold text-gray-900 mt-4">{t('page_not_found')}</h1>
      <p className="text-gray-600 mt-2">{t('page_not_found_desc')}</p>
      <Link
        to="/"
        className="inline-block mt-6 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
      >
        {t('back_to_dashboard')}
      </Link>
    </div>
  );
};

export default NotFound;
