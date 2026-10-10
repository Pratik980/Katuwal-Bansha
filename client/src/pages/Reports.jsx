import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFamilies, getFamilyById } from '../api/families';
import { getMembersByFamily } from '../api/members';
import {
  generateFamilyReport,
  generateAllFamiliesReport,
  generateMemberReport,
  generateGenerationReport,
  generateDonationReport,
  generateDemographicReport,
  generateGenealogyReport,
  exportAllMembers,
  exportFamilyTree
} from '../api/reports';
import Button from '../components/Button';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUsers, FaHome, FaFileExcel, FaTimes, FaChartBar,
  FaUser, FaUserFriends, FaHeart, FaDownload, FaTree,
  FaMapMarker, FaMoneyBillWave, FaFilter, FaChevronDown,
  FaChevronUp, FaPrint, FaSearch
} from 'react-icons/fa';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Reports = () => {
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState('family');
  const [filters, setFilters] = useState({
    family: '',
    generation: '',
    gender: '',
    province: '',
    district: '',
    status: '',
    verification: '',
    dateRange: '',
  });
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);


  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families-report'],
    queryFn: () => getFamilies({ limit: 1000 }),
  });


  const { data: familyDetails, isLoading: familyLoading } = useQuery({
    queryKey: ['family', selectedFamily?._id],
    queryFn: () => getFamilyById(selectedFamily?._id),
    enabled: !!selectedFamily,
  });



  const filteredFamilies = familiesData?.data?.filter(family =>
    family.familyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.familyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.clan?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getFamilyMemberCount = (familyId) =>
    familiesData?.data?.find(family => family._id === familyId)?.memberCount ?? 0;



  const handleFamilyClick = (family) => {
    setSelectedFamily(family);
    setIsFamilyModalOpen(true);
  };

  const handleExportFamilyReport = async (familyId, familyName) => {
    setExporting(true);
    try {
      const blob = await generateFamilyReport({
        familyId: familyId,
        format: 'excel'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-report-${familyName || 'family'}-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Family report exported successfully');
    } catch (error) {
      toast.error('Failed to export family report');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllFamilies = async () => {
    setExporting(true);
    try {
      const blob = await generateAllFamiliesReport({
        format: 'excel'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-families-report-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('All families report exported successfully');
    } catch (error) {
      toast.error('Failed to export all families report');
    } finally {
      setExporting(false);
    }
  };

  const handleExportMemberReport = async (type) => {
    setExporting(true);
    try {
      let blob;
      let filename;
      const queryParams = { format: 'excel', ...filters };

      switch(type) {
        case 'all':
          blob = await exportAllMembers({ ...queryParams });
          filename = `all-members-report-${Date.now()}.xlsx`;
          break;
        case 'verified':
          blob = await generateMemberReport({ ...queryParams, verification: 'verified' });
          filename = `verified-members-report-${Date.now()}.xlsx`;
          break;
        case 'pending':
          blob = await generateMemberReport({ ...queryParams, verification: 'pending' });
          filename = `pending-members-report-${Date.now()}.xlsx`;
          break;
        case 'male':
          blob = await generateMemberReport({ ...queryParams, gender: 'male' });
          filename = `male-members-report-${Date.now()}.xlsx`;
          break;
        case 'female':
          blob = await generateMemberReport({ ...queryParams, gender: 'female' });
          filename = `female-members-report-${Date.now()}.xlsx`;
          break;
        case 'living':
          blob = await generateMemberReport({ ...queryParams, status: 'living' });
          filename = `living-members-report-${Date.now()}.xlsx`;
          break;
        case 'deceased':
          blob = await generateMemberReport({ ...queryParams, status: 'deceased' });
          filename = `deceased-members-report-${Date.now()}.xlsx`;
          break;
        case 'generation':
          blob = await generateGenerationReport({ ...queryParams });
          filename = `generation-report-${Date.now()}.xlsx`;
          break;
        case 'donation':
          blob = await generateDonationReport({ ...queryParams });
          filename = `donation-report-${Date.now()}.xlsx`;
          break;
        case 'demographic':
          blob = await generateDemographicReport({ ...queryParams });
          filename = `demographic-report-${Date.now()}.xlsx`;
          break;
        case 'genealogy':
          blob = await generateGenealogyReport({ ...queryParams });
          filename = `genealogy-report-${Date.now()}.xlsx`;
          break;
        default:
          blob = await generateMemberReport({ ...queryParams });
          filename = `members-report-${Date.now()}.xlsx`;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleReportCardClick = (report) => {
    setSelectedReportCard(report);
    setIsReportCardModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFamilyGrid = () => {
    if (familiesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFamilies.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
            <FaHome className="text-4xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">कुनै परिवार फेला परेन</p>
          </div>
        ) : (
          filteredFamilies.map((family) => (
            <FamilyCard
              key={family._id}
              family={family}
              memberCount={getFamilyMemberCount(family._id)}
              onClick={handleFamilyClick}
              onExport={() => handleExportFamilyReport(family._id, family.familyName)}
              exporting={exporting}
            />
          ))
        )}
      </div>
    );
  };

  const renderReportCards = () => {
    const reportCards = [
      {
        id: 'members',
        title: 'Members Report',
        description: 'Complete list of members',
        icon: FaUsers,
        color: 'blue',
        onClick: () => handleReportCardClick('members')
      },
      {
        id: 'family',
        title: 'Family Report',
        description: 'Download one family or all families',
        icon: FaHome,
        color: 'green',
        onClick: () => handleReportCardClick('family')
      },
      {
        id: 'genealogy',
        title: 'Genealogy Report',
        description: 'Family tree summary',
        icon: FaTree,
        color: 'purple',
        onClick: () => handleReportCardClick('genealogy')
      },
      {
        id: 'donation',
        title: 'Donation Report',
        description: 'Donations and totals',
        icon: FaMoneyBillWave,
        color: 'orange',
        onClick: () => handleReportCardClick('donation')
      },
      {
        id: 'generation',
        title: 'Generation Report',
        description: 'Members grouped by generation',
        icon: FaChartBar,
        color: 'indigo',
        onClick: () => handleReportCardClick('generation')
      },
      {
        id: 'demographic',
        title: 'Demographic Report',
        description: 'Province, district and gender statistics',
        icon: FaMapMarker,
        color: 'pink',
        onClick: () => handleReportCardClick('demographic')
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {reportCards.map((card) => (
          <ReportCard key={card.id} {...card} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">View and export family and member reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <FaPrint className="mr-2" />
            Print
          </Button>
        </div>
      </div>


      <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setReportType('family')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            reportType === 'family'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FaHome className="inline mr-2" />
          Family Reports
        </button>
        <button
          onClick={() => setReportType('member')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            reportType === 'member'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FaUsers className="inline mr-2" />
          Member Reports
        </button>
      </div>


      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" />
          <h3 className="font-medium text-gray-700">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <select
            value={filters.family}
            onChange={(e) => setFilters({...filters, family: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Families</option>
            {familiesData?.data?.map(f => (
              <option key={f._id} value={f._id}>{f.familyName}</option>
            ))}
          </select>
          <select
            value={filters.generation}
            onChange={(e) => setFilters({...filters, generation: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Generations</option>
            <option value="1">Generation 1</option>
            <option value="2">Generation 2</option>
            <option value="3">Generation 3</option>
            <option value="4">Generation 4</option>
            <option value="5">Generation 5</option>
          </select>
          <select
            value={filters.gender}
            onChange={(e) => setFilters({...filters, gender: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select
            value={filters.province}
            onChange={(e) => setFilters({...filters, province: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Provinces</option>
            <option value="1">Province 1</option>
            <option value="2">Province 2</option>
            <option value="3">Province 3</option>
            <option value="4">Province 4</option>
            <option value="5">Province 5</option>
            <option value="6">Province 6</option>
            <option value="7">Province 7</option>
          </select>
          <select
            value={filters.district}
            onChange={(e) => setFilters({...filters, district: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Districts</option>
            <option value="kathmandu">Kathmandu</option>
            <option value="lalitpur">Lalitpur</option>
            <option value="bhaktapur">Bhaktapur</option>
            <option value="pokhara">Pokhara</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="living">Living</option>
            <option value="deceased">Deceased</option>
          </select>
          <select
            value={filters.verification}
            onChange={(e) => setFilters({...filters, verification: e.target.value})}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>


      {reportType === 'family' ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Families</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportAllFamilies}
                disabled={exporting}
              >
                <FaFileExcel className="mr-2" />
                {exporting ? 'Exporting...' : 'Export All Families'}
              </Button>
            </div>
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search families..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {renderFamilyGrid()}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Member Reports</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MemberReportButton
                label="All Members"
                icon={FaUsers}
                onClick={() => handleExportMemberReport('all')}
                color="blue"
                loading={exporting}
              />
              <MemberReportButton
                label="Verified Members"
                icon={FaUser}
                onClick={() => handleExportMemberReport('verified')}
                color="green"
                loading={exporting}
              />
              <MemberReportButton
                label="Pending Verification"
                icon={FaUser}
                onClick={() => handleExportMemberReport('pending')}
                color="yellow"
                loading={exporting}
              />
              <MemberReportButton
                label="Male Members"
                icon={FaUser}
                onClick={() => handleExportMemberReport('male')}
                color="blue"
                loading={exporting}
              />
              <MemberReportButton
                label="Female Members"
                icon={FaUserFriends}
                onClick={() => handleExportMemberReport('female')}
                color="pink"
                loading={exporting}
              />
              <MemberReportButton
                label="Living Members"
                icon={FaHeart}
                onClick={() => handleExportMemberReport('living')}
                color="green"
                loading={exporting}
              />
              <MemberReportButton
                label="Deceased Members"
                icon={FaHeart}
                onClick={() => handleExportMemberReport('deceased')}
                color="gray"
                loading={exporting}
              />
              <MemberReportButton
                label="Members by Generation"
                icon={FaChartBar}
                onClick={() => handleExportMemberReport('generation')}
                color="purple"
                loading={exporting}
              />
              <MemberReportButton
                label="Demographic Report"
                icon={FaMapMarker}
                onClick={() => handleExportMemberReport('demographic')}
                color="indigo"
                loading={exporting}
              />
            </div>
          </div>
        </>
      )}


      {renderReportCards()}


      <FamilyReportModal
        isOpen={isFamilyModalOpen}
        onClose={() => {
          setIsFamilyModalOpen(false);
          setSelectedFamily(null);
        }}
        family={selectedFamily}
        familyDetails={familyDetails}
        onExport={handleExportFamilyReport}
        exporting={exporting}
      />


      <ReportCardModal
        isOpen={isReportCardModalOpen}
        onClose={() => {
          setIsReportCardModalOpen(false);
          setSelectedReportCard(null);
        }}
        reportType={selectedReportCard}
        filters={filters}
        families={familiesData?.data || []}
        onExport={handleExportMemberReport}
        exporting={exporting}
      />
    </div>
  );
};


const FamilyCard = ({ family, memberCount, onClick, onExport, exporting }) => {
  const [expanded, setExpanded] = useState(false);

  const { data: membersData } = useQuery({
    queryKey: ['family-members', family._id],
    queryFn: () => getMembersByFamily(family._id),
    enabled: expanded,
  });
  const members = membersData?.data || [];

  const getRelationshipLabel = (relationship) => {
    const labels = {
      'member': 'सदस्य',
      'spouse': 'श्रीमान/श्रीमती',
      'child': 'सन्तान',
      'parent': 'आमा/बुवा',
      'sibling': 'दाजु/भाइ/दिदी/बहिनी',
      'grandparent': 'हजुरबा/हजुरआमा',
      'grandchild': 'नाति/नातिनी',
      'other': 'अन्य'
    };
    return labels[relationship] || relationship || 'सदस्य';
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => onClick(family)}
        >
          {family.familyPhoto ? (
            <img
              src={family.familyPhoto}
              alt={family.familyName}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <FaHome className="text-green-600 text-2xl" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-gray-800 truncate cursor-pointer hover:text-green-600"
            onClick={() => onClick(family)}
          >
            {family.familyName || 'Unnamed Family'}
          </h3>
          <p className="text-sm text-gray-500">
            घर नम्बर: {family.familyNumber || 'N/A'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {memberCount} सदस्यहरू
            </span>
            {family.clan && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {family.clan}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onExport(family._id, family.familyName)}
          disabled={exporting}
          className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600 disabled:opacity-50"
          title="Export Excel"
        >
          <FaFileExcel className="text-xl" />
        </button>
      </div>

      {memberCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 mt-2 text-sm text-green-600 hover:text-green-700 transition-colors"
        >
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
          {expanded ? 'सदस्यहरू लुकाउनुहोस्' : 'सदस्यहरू हेर्नुहोस्'}
        </button>
      )}

      <AnimatePresence>
        {expanded && members && members.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 max-h-40 overflow-y-auto">
              {members.map((member) => (
                <div key={member._id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.visibility = 'hidden'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                        <FaUser className="text-green-600 text-[8px]" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-700 flex-1">{member.name}</span>
                  <span className="text-xs text-gray-400">
                    {member.lineageRole === 'lineage_head' ? 'घरमुली' :
                     getRelationshipLabel(member.relationship)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const ReportCard = ({ id, title, description, icon: Icon, color, onClick }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="text-white text-2xl" />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <div className="mt-4 flex items-center text-sm text-green-600 font-medium">
        <FaDownload className="mr-2" />
        Download Excel
      </div>
    </motion.div>
  );
};


const MemberReportButton = ({ label, icon: Icon, onClick, color, loading }) => {
  const colorClasses = {
    blue: 'hover:bg-blue-50 border-blue-200 text-blue-600',
    green: 'hover:bg-green-50 border-green-200 text-green-600',
    yellow: 'hover:bg-yellow-50 border-yellow-200 text-yellow-600',
    pink: 'hover:bg-pink-50 border-pink-200 text-pink-600',
    purple: 'hover:bg-purple-50 border-purple-200 text-purple-600',
    indigo: 'hover:bg-indigo-50 border-indigo-200 text-indigo-600',
    orange: 'hover:bg-orange-50 border-orange-200 text-orange-600',
    red: 'hover:bg-red-50 border-red-200 text-red-600',
    gray: 'hover:bg-gray-50 border-gray-200 text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${colorClasses[color]} disabled:opacity-50`}
    >
      <Icon className="text-sm" />
      {label}
    </button>
  );
};


const FamilyReportModal = ({ isOpen, onClose, family, familyDetails, onExport, exporting }) => {
  if (!isOpen || !family || !familyDetails) return null;

  const members = familyDetails.members || [];
  const maleCount = members.filter(m => m.gender === 'male').length;
  const femaleCount = members.filter(m => m.gender === 'female').length;
  const livingCount = members.filter(m => m.isAlive !== false).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Family Report"
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto px-1">

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow">
              {family.familyPhoto ? (
                <img
                  src={family.familyPhoto}
                  alt={family.familyName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-green-200 flex items-center justify-center">
                  <FaHome className="text-green-600 text-2xl" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {family.familyName}
              </h3>
              <p className="text-sm text-gray-600">
                House No. {family.familyNumber}
              </p>
              {family.clan && (
                <p className="text-sm text-gray-500">Clan: {family.clan}</p>
              )}
            </div>
          </div>
        </div>


        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <FaUsers className="text-blue-500 text-xl mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-800">{members.length}</p>
            <p className="text-xs text-gray-500">Total Members</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <FaUser className="text-blue-500 text-xl mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-800">{maleCount}</p>
            <p className="text-xs text-gray-500">Male</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <FaUserFriends className="text-pink-500 text-xl mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-800">{femaleCount}</p>
            <p className="text-xs text-gray-500">Female</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <FaHeart className="text-red-500 text-xl mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-800">{livingCount}</p>
            <p className="text-xs text-gray-500">Living</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Member List</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Member ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Gender</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Generation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member, index) => (
                  <tr key={member._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs font-mono text-gray-500">{member.memberNumber || 'N/A'}</td>
                    <td className="px-4 py-2 font-medium text-gray-700">{member.name}</td>
                    <td className="px-4 py-2 text-gray-600 capitalize">{member.gender}</td>
                    <td className="px-4 py-2 text-gray-600">{member.generation || 'N/A'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        member.isAlive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {member.isAlive !== false ? 'Living' : 'Deceased'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={() => onExport(family._id, family.familyName)}
            disabled={exporting}
            className="flex items-center"
          >
            <FaFileExcel className="mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center"
          >
            <FaPrint className="mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center"
          >
            <FaTimes className="mr-2" />
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ReportCardModal = ({ isOpen, onClose, reportType, filters, families, onExport, exporting }) => {
  if (!isOpen) return null;

  const renderFamilySelect = () => {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Select Family</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <button
            onClick={() => onExport('all', 'all-families')}
            disabled={exporting}
            className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-gray-700">All Families</span>
            <span className="text-sm text-gray-500">Download All</span>
          </button>
          {families.map((family) => (
            <button
              key={family._id}
              onClick={() => onExport(family._id, family.familyName)}
              disabled={exporting}
              className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-gray-700">{family.familyName}</span>
              <span className="text-sm text-gray-500">House {family.familyNumber}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${reportType?.charAt(0).toUpperCase() + reportType?.slice(1)} Report`}
      size="lg"
    >
      <div className="space-y-6">
        {reportType === 'family' && renderFamilySelect()}

        {reportType === 'members' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Export all members with applied filters</p>
            <Button
              variant="primary"
              onClick={() => onExport('all')}
              disabled={exporting}
              className="w-full flex items-center justify-center"
            >
              <FaFileExcel className="mr-2" />
              {exporting ? 'Exporting...' : 'Download Members Report'}
            </Button>
          </div>
        )}

        {['genealogy', 'generation', 'donation', 'demographic'].includes(reportType) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Export {reportType} report with applied filters</p>
            <Button
              variant="primary"
              onClick={() => onExport(reportType)}
              disabled={exporting}
              className="w-full flex items-center justify-center"
            >
              <FaFileExcel className="mr-2" />
              {exporting ? 'Exporting...' : `Download ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
            </Button>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Reports;