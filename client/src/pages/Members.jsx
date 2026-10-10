import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, deleteMember, exportAllMembers, updateVerification } from '../api/members';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import MemberProfile from '../components/MemberProfile';
import {
  MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon,
  CheckBadgeIcon, XCircleIcon, ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import MemberForm from "../pages/DataEntry";
import { useLanguage } from '../context/LanguageContext';
import { provinces, districts } from '../data/nepalLocations';

const EMPTY_FILTERS = {
  gender: '',
  status: '',
  generation: '',
  verificationStatus: '',
  family: '',
  district: '',
  province: '',
  house: '',
  vanshaGenerationNumber: '',
  lineageRole: '',
};

const BADGE = 'px-2 py-1 text-xs font-medium rounded-full';
const VERIFICATION_COLORS = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
};

const Members = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromHeader = searchParams.get('search') || '';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchFromHeader);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();

  // A search typed in the header arrives in the address: /members?search=...
  useEffect(() => {
    if (searchFromHeader) {
      setSearch(searchFromHeader);
      setPage(1);
    }
  }, [searchFromHeader]);

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, search, filters],
    queryFn: () => getMembers({
      page,
      limit: 10,
      search,
      ...filters
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success(t('member_deleted'));
    },
  });

  const verificationMutation = useMutation({
    mutationFn: ({ id, status }) => updateVerification(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(t('verification_saved'));
    },
  });

  const handleDelete = (id) => {
    if (window.confirm(t('delete_member_confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (member) => {
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
    if (searchFromHeader) setSearchParams({}, { replace: true });
  };

  const setFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      // a district belongs to its province
      ...(name === 'province' ? { district: '' } : {}),
    }));
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAllMembers({
        ...filters,
        search,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Members_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('members_exported'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('members_export_failed'));
    } finally {
      setExporting(false);
    }
  };

  const districtOptions = useMemo(
    () => (filters.province ? districts[filters.province] || [] : Object.values(districts).flat()),
    [filters.province]
  );

  const columns = [
    { key: 'photo', label: t('col_photo'), type: 'image' },
    { key: 'memberNumber', label: t('col_member_id') },
    { key: 'name', label: t('col_name'), sortable: true },
    { key: 'houseNumber', label: t('col_house'), render: (value, member) => member.family?.house?.houseNumber || value || '-' },
    { key: 'familyNumber', label: t('col_family'), render: (value, member) => member.family?.familyNumber || '-' },
    { key: 'vanshaGenerationNumber', label: t('col_vansha') },
    { key: 'generation', label: t('col_gen') },
    { key: 'lineageRole', label: t('col_role'),
      render: (value) => {
        const roles = {
          'lineage_head': t('role_head'),
          'lineage_member': t('role_member'),
          'spouse': t('role_spouse'),
          'other': t('other'),
        };
        return roles[value] || value || '-';
      }
    },
    { key: 'childBirthOrder', label: t('col_birth_order') },
    { key: 'gender', label: t('col_gender'), render: (value) => (value === 'male' ? t('male') : value === 'female' ? t('female') : t('other')) },
    { key: 'phone', label: t('col_phone') },
    { key: 'email', label: t('col_email') },
    { key: 'isAlive', label: t('status'),
      render: (value) => (
        <span className={`${BADGE} ${value === false ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}`}>
          {value === false ? t('deceased') : t('living')}
        </span>
      ),
    },
    { key: 'verificationStatus', label: t('col_verification'),
      render: (value) => (
        <span className={`${BADGE} ${VERIFICATION_COLORS[value] || VERIFICATION_COLORS.pending}`}>
          {t(value || 'pending')}
        </span>
      ),
    },
  ];

  // Approve or reject right from the list
  const verificationActions = (member) => {
    const current = member.verificationStatus || 'pending';
    const setStatus = (status) => verificationMutation.mutate({ id: member._id, status });
    return (
      <>
        {current !== 'verified' && (
          <button onClick={() => setStatus('verified')} className="text-green-600 hover:text-green-800 ml-2" title={t('verify')}>
            <CheckBadgeIcon className="h-5 w-5" />
          </button>
        )}
        {current !== 'rejected' && (
          <button onClick={() => setStatus('rejected')} className="text-orange-600 hover:text-orange-800 ml-2" title={t('reject')}>
            <XCircleIcon className="h-5 w-5" />
          </button>
        )}
        {current !== 'pending' && (
          <button onClick={() => setStatus('pending')} className="text-gray-500 hover:text-gray-700 ml-2" title={t('set_pending')}>
            <ArrowUturnLeftIcon className="h-5 w-5" />
          </button>
        )}
      </>
    );
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    handleSearchChange('');
  };

  const selectClass = 'px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('members')}</h1>
          <p className="text-gray-600">{t('members_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {exporting ? t('exporting') : t('export_all')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            {t('filter')}
          </Button>
          {isFilterOpen && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-sm"
            >
              {t('reset')}
            </Button>
          )}
        </div>
      </div>


      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_members_placeholder')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>


        {isFilterOpen && (
          <div className="p-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-gray-50">
            <select value={filters.gender} onChange={(e) => setFilter('gender', e.target.value)} className={selectClass}>
              <option value="">{t('all_genders')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
            </select>

            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass}>
              <option value="">{t('all_status')}</option>
              <option value="living">{t('living')}</option>
              <option value="deceased">{t('deceased')}</option>
            </select>

            <select value={filters.generation} onChange={(e) => setFilter('generation', e.target.value)} className={selectClass}>
              <option value="">{t('all_generations')}</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(gen => (<option key={gen} value={gen}>{t('generation')} {gen}</option>))}
            </select>

            <select value={filters.verificationStatus} onChange={(e) => setFilter('verificationStatus', e.target.value)} className={selectClass}>
              <option value="">{t('all_verification')}</option>
              <option value="verified">{t('verified')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="rejected">{t('rejected')}</option>
            </select>

            <input type="text" placeholder={t('house_number')} value={filters.house} onChange={(e) => setFilter('house', e.target.value)} className={selectClass} />

            <input type="text" placeholder={t('vansha_number')} value={filters.vanshaGenerationNumber} onChange={(e) => setFilter('vanshaGenerationNumber', e.target.value)} className={selectClass} />

            <select value={filters.lineageRole} onChange={(e) => setFilter('lineageRole', e.target.value)} className={selectClass}>
              <option value="">{t('all_roles')}</option>
              <option value="lineage_head">{t('role_head')}</option>
              <option value="lineage_member">{t('role_member')}</option>
              <option value="spouse">{t('role_spouse')}</option>
              <option value="other">{t('other')}</option>
            </select>

            {/* The same names the member form stores */}
            <select value={filters.province} onChange={(e) => setFilter('province', e.target.value)} className={selectClass}>
              <option value="">{t('all_provinces')}</option>
              {provinces.map((province) => (<option key={province} value={province}>{province}</option>))}
            </select>

            <select value={filters.district} onChange={(e) => setFilter('district', e.target.value)} className={selectClass}>
              <option value="">{t('all_districts')}</option>
              {districtOptions.map((district) => (<option key={district} value={district}>{district}</option>))}
            </select>
          </div>
        )}

        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          customActions={verificationActions}
          pagination={{
            currentPage: data?.pagination?.page || 1,
            totalPages: data?.pagination?.pages || 1,
            onPageChange: setPage,
          }}
        />
      </div>


      <Modal isOpen={isProfileOpen} onClose={() => { setIsProfileOpen(false); setSelectedMember(null); }} title={t('member_profile')} size="xl">
        {selectedMember && <MemberProfile member={selectedMember} />}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingMember(null); }} title={t('edit_member')} size="xl">
        <MemberForm
          member={editingMember}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingMember(null);
          }}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingMember(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default Members;
