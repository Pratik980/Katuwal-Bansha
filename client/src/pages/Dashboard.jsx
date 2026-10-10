import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api/dashboard';
import StatCard from '../components/StatCard';
import RecentActivity from '../components/RecentActivity';
import { useLanguage } from '../context/LanguageContext';
import {
  UsersIcon,
  BuildingOfficeIcon,
  HeartIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { t } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {t('failed_dashboard')}
      </div>
    );
  }

  const stats = data?.summary || {};
  const demographics = data?.demographics || {};


  const maleCount = demographics.gender?.find(g => g._id === 'male')?.count || 0;
  const femaleCount = demographics.gender?.find(g => g._id === 'female')?.count || 0;

  const recentMembers = data?.recent?.members || [];
  // const recentDonations = data?.recent?.donations || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="text-gray-600">{t('dashboard_subtitle')}</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('total_members')}
          value={stats.totalMembers || 0}
          icon={UsersIcon}
          color="green"
        />
        <StatCard
          title={t('total_families')}
          value={stats.totalFamilies || 0}
          icon={BuildingOfficeIcon}
          color="blue"
        />
        <StatCard
          title={t('total_male')}
          value={maleCount}
          icon={UserGroupIcon}
          color="indigo"
        />
        <StatCard
          title={t('total_female')}
          value={femaleCount}
          icon={UserGroupIcon}
          color="pink"
        />
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* <StatCard
          title="Total Donations"
          value={`Rs. ${(stats.totalDonationAmount || 0).toLocaleString()}`}
          icon={HeartIcon}
          color="red"
        /> */}
        <StatCard
          title={t('living_members')}
          value={demographics.lifeStatus?.find(s => s._id === true)?.count || 0}
          icon={UsersIcon}
          color="emerald"
        />
        <StatCard
          title={t('generations')}
          value={demographics.generations?.length || 0}
          icon={UserGroupIcon}
          color="purple"
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity
          title={t('recent_members')}
          items={recentMembers}
          type="member"
        />
        {/* <RecentActivity
          title="Recent Donations"
          items={recentDonations}
          type="donation"
        /> */}
      </div>
    </div>
  );
};

export default Dashboard;