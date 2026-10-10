import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFamilies, closeFamily, reopenFamily, createFamily, updateFamily, deleteFamily } from '../api/families';
import { getMembersByFamily } from '../api/members';
import Modal from '../components/Modal';
import FamilyTreeView from '../components/FamilyTreeView';
import MemberProfileModal from '../components/tree/MemberProfileModal';
import Button from '../components/Button';
import FloatingInput from '../components/FloatingInput';
import SearchableSelect from '../components/SearchableSelect';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FaHome, FaPlus, FaUser, FaTimes, FaSave, FaTree, FaBuilding, FaPhone, FaUsers, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Families = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [profileMemberId, setProfileMemberId] = useState(null);
  const queryClient = useQueryClient();

  const initialFamilyForm = {
    familyName: '',
    familyNumber: '',
    houseNumber: '',
    houseName: '',
    vanshaGenerationNumber: '',
    familyHead: '',
    clan: '',
    origin: '',
    currentAddress: '',
    description: '',
    status: 'open',
  };

  const [familyForm, setFamilyForm] = useState(initialFamilyForm);
  const [formErrors, setFormErrors] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['families', page, search],
    queryFn: () => getFamilies({ page, limit: 10, search }),
  });

  // Members of the one family whose details or edit form is open
  const openFamilyId = (isDetailsModalOpen && selectedFamily?._id) || (isEditModalOpen && editingFamily?._id) || null;
  const { data: openFamilyMembers } = useQuery({
    queryKey: ['family-members', openFamilyId],
    queryFn: () => getMembersByFamily(openFamilyId),
    enabled: !!openFamilyId,
  });
  const familyMembers = openFamilyMembers?.data || [];

  const getFamilyMemberCount = (familyId) =>
    data?.data?.find(family => family._id === familyId)?.memberCount ?? 0;
  const getFamilyGenerations = (familyId) =>
    data?.data?.find(family => family._id === familyId)?.generationCount ?? 0;

  // The head of a family is chosen from that family's own members
  const memberOptions = useMemo(() => {
    if (!isEditModalOpen) return [];
    return familyMembers.map(m => ({
      value: m._id,
      label: `${m.name}${m.surname ? ` ${m.surname}` : ''} (${m.memberNumber || 'N/A'})`,
    }));
  }, [familyMembers, isEditModalOpen]);

  const closeMutation = useMutation({
    mutationFn: ({ id, reason }) => closeFamily(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      toast.success('परिवार सफलतापूर्वक बन्द गरियो');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'परिवार बन्द गर्न असफल'),
  });

  const reopenMutation = useMutation({
    mutationFn: (id) => reopenFamily(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      toast.success('परिवार पुन: खोलियो');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'परिवार पुन: खोल्न असफल'),
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: (id) => deleteFamily(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('परिवार मेटाइयो');
    },
  });

  const createFamilyMutation = useMutation({
    mutationFn: createFamily,
    onSuccess: () => {
      toast.success('परिवार सफलतापूर्वक थपियो 🎉');
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      setIsCreateModalOpen(false);
      setFamilyForm(initialFamilyForm);
      setFormErrors({});
    },
    onError: (error) => toast.error(error.response?.data?.message || 'परिवार थप्न असफल'),
  });

  const updateFamilyMutation = useMutation({
    mutationFn: ({ id, data }) => updateFamily(id, data),
    onSuccess: () => {
      toast.success('परिवार सफलतापूर्वक अद्यावधिक गरियो');
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      setIsEditModalOpen(false);
      setEditingFamily(null);
      setFamilyForm(initialFamilyForm);
      setFormErrors({});
    },
    onError: (error) => toast.error(error.response?.data?.message || 'परिवार अद्यावधिक गर्न असफल'),
  });

  const handleViewTree = (family) => { setSelectedFamily(family); setIsTreeModalOpen(true); };
  const handleViewDetails = (family) => { setSelectedFamily(family); setIsDetailsModalOpen(true); };
  const handleCloseFamily = (family) => {
    const reason = window.prompt('परिवार बन्द गर्ने कारण लेख्नुहोस्:');
    if (reason !== null) closeMutation.mutate({ id: family._id, reason });
  };
  const handleReopenFamily = (family) => {
    if (window.confirm('के तपाईं यो परिवार पुन: खोल्न निश्चित हुनुहुन्छ?')) reopenMutation.mutate(family._id);
  };
  const handleDeleteFamily = (family) => {
    if (getFamilyMemberCount(family._id) > 0) {
      toast.error('सदस्य भएको परिवार मेटाउन मिल्दैन। पहिले सदस्यहरू सार्नुहोस् वा मेटाउनुहोस्।');
      return;
    }
    if (window.confirm(`"${family.familyName}" परिवार मेटाउने? यो फिर्ता हुँदैन।`)) {
      deleteFamilyMutation.mutate(family._id);
    }
  };
  const handleAddFamily = () => { setFamilyForm(initialFamilyForm); setFormErrors({}); setIsCreateModalOpen(true); };
  const handleEditFamily = (family) => {
    setEditingFamily(family);
    setFamilyForm({
      familyName: family.familyName || '',
      familyNumber: family.familyNumber || '',
      houseNumber: family.house?.houseNumber || '',
      houseName: family.house?.houseName || '',
      vanshaGenerationNumber: family.vanshaGenerationNumber || '',
      familyHead: family.familyHead?._id || family.familyHead || '',
      clan: family.clan || '',
      origin: family.origin || '',
      currentAddress: family.currentAddress || '',
      description: family.description || '',
      status: family.status || 'open',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleFamilyFormChange = (e) => {
    const { name, value } = e.target;
    setFamilyForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFamilySelectChange = (name, value) => {
    setFamilyForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateFamilyForm = () => {
    const errors = {};
    if (!familyForm.familyName?.trim()) errors.familyName = 'परिवारको नाम आवश्यक छ';
    if (!familyForm.houseNumber?.trim()) errors.houseNumber = 'घर नम्बर आवश्यक छ';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFamilySubmit = async (e) => {
    e.preventDefault();
    if (!validateFamilyForm()) {
      Object.values(formErrors).forEach(err => toast.error(err));
      return;
    }

    const submitData = {
      familyName: familyForm.familyName.trim(),
      houseNumber: familyForm.houseNumber.trim(),
      houseName: familyForm.houseName?.trim() || undefined,
      vanshaGenerationNumber: familyForm.vanshaGenerationNumber?.trim() || undefined,
      familyHead: familyForm.familyHead || undefined,
      clan: familyForm.clan?.trim() || undefined,
      origin: familyForm.origin?.trim() || undefined,
      currentAddress: familyForm.currentAddress?.trim() || undefined,
      description: familyForm.description?.trim() || undefined,
      status: familyForm.status || 'open',
    };

    if (editingFamily) {
      await updateFamilyMutation.mutateAsync({ id: editingFamily._id, data: submitData });
    } else {
      await createFamilyMutation.mutateAsync(submitData);
    }
  };

  const getRelationshipLabel = (relationship) => {
    const labels = {
      'member': 'सदस्य', 'spouse': 'श्रीमान/श्रीमती', 'child': 'सन्तान',
      'parent': 'आमा/बुवा', 'sibling': 'दाजु/भाइ/दिदी/बहिनी',
      'grandparent': 'हजुरबा/हजुरआमा', 'grandchild': 'नाति/नातिनी', 'other': 'अन्य'
    };
    return labels[relationship] || relationship || 'सदस्य';
  };

  const renderFamilyForm = (isEdit = false) => (
    <form onSubmit={handleFamilySubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FloatingInput label="परिवारको नाम *" name="familyName" value={familyForm.familyName} onChange={handleFamilyFormChange} icon={FaHome} required error={formErrors.familyName} />
        </div>
        <FloatingInput label="घर नम्बर *" name="houseNumber" value={familyForm.houseNumber} onChange={handleFamilyFormChange} icon={FaBuilding} required error={formErrors.houseNumber} placeholder="जस्तै: 123" />
        <FloatingInput label="घरको नाम" name="houseName" value={familyForm.houseName} onChange={handleFamilyFormChange} icon={FaBuilding} placeholder="जस्तै: मेन हाउस" />
        <FloatingInput label="परिवार नम्बर" name="familyNumber" value={familyForm.familyNumber} onChange={handleFamilyFormChange} icon={FaTree} disabled placeholder="खाली छोड्नुहोस् - स्वत: जेनेरेट हुनेछ" />
        <FloatingInput label="वंश / पुस्ता नम्बर" name="vanshaGenerationNumber" value={familyForm.vanshaGenerationNumber} onChange={handleFamilyFormChange} icon={FaTree} placeholder="खाली छोड्नुहोस् - स्वत: जेनेरेट हुनेछ" />
        <SearchableSelect label="घरमुली" name="familyHead" value={familyForm.familyHead} onChange={handleFamilySelectChange} options={memberOptions} placeholder="घरमुली खोज्नुहोस्..." />
        <FloatingInput label="कुल / गोत्र" name="clan" value={familyForm.clan} onChange={handleFamilyFormChange} icon={FaUsers} />
        <FloatingInput label="मूल स्थान" name="origin" value={familyForm.origin} onChange={handleFamilyFormChange} icon={FaHome} />
        <FloatingInput label="हालको ठेगाना" name="currentAddress" value={familyForm.currentAddress} onChange={handleFamilyFormChange} icon={FaHome} />
        <div className="md:col-span-2">
          <FloatingInput label="विवरण" name="description" value={familyForm.description} onChange={handleFamilyFormChange} type="textarea" rows={2} icon={FaInfoCircle} />
        </div>
        <SearchableSelect label="स्थिति" name="status" value={familyForm.status} onChange={handleFamilySelectChange} options={[{ value: 'open', label: 'खुला' }, { value: 'closed', label: 'बन्द' }]} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" disabled={createFamilyMutation.isLoading || updateFamilyMutation.isLoading} className="flex-1">
          {(createFamilyMutation.isLoading || updateFamilyMutation.isLoading) ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEdit ? 'अद्यावधिक गर्दै...' : 'थप्दै...'}
            </span>
          ) : (
            <><FaSave className="mr-1.5" />{isEdit ? 'परिवार अद्यावधिक गर्नुहोस्' : 'परिवार थप्नुहोस्'}</>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); setEditingFamily(null); setFamilyForm(initialFamilyForm); setFormErrors({}); }}>
          <FaTimes className="mr-1.5" /> रद्द गर्नुहोस्
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FaHome className="text-green-500" /> परिवारहरू</h1>
          <p className="text-gray-600">सबै परिवार र तिनीहरूको विवरण व्यवस्थापन गर्नुहोस्</p>
        </div>
        <Button variant="primary" onClick={handleAddFamily} className="flex items-center"><FaPlus className="mr-2" /> परिवार थप्नुहोस्</Button>
      </div>

      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input type="text" placeholder="परिवारको नाम, नम्बर, वंश/पुस्ता द्वारा खोज्नुहोस्..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
      </div>

      {data?.data?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FaHome className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">कुनै परिवार फेला परेन</p>
          <p className="text-sm text-gray-400">आफ्नो खोज समायोजन गर्नुहोस् वा नयाँ परिवार थप्नुहोस्</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.map((family) => {
            const isClosed = family.status === 'closed';
            return (
              <div key={family._id} className={`bg-white rounded-2xl border ${isClosed ? 'border-gray-300' : 'border-green-200'} overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer`} onClick={() => handleViewDetails(family)}>
                <div className="relative">
                  <div className={`h-32 ${isClosed ? 'bg-gray-300' : 'bg-gradient-to-r from-green-400 to-emerald-500'} flex items-center justify-center`}>
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                      {family.familyPhoto ? <img src={family.familyPhoto} alt={family.familyName} className="w-full h-full object-cover rounded-full" /> : <FaHome className={`text-white text-3xl ${isClosed ? 'opacity-50' : ''}`} />}
                    </div>
                  </div>
                  {family.familyPhoto && <div className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg"><img src={family.familyPhoto} alt={family.familyName} className="w-full h-full object-cover" /></div>}
                </div>
                <div className="pt-8 pb-4 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800 truncate">{family.familyName || 'Unnamed Family'}</h3>
                      <p className="text-sm text-gray-500">
                        घर नं. {family.house?.houseNumber || 'N/A'} • परिवार नं. {family.familyNumber} • <span className="font-medium text-green-600 ml-1">{family.houseIdentifier || 'N/A'}</span>
                      </p>
                      {family.vanshaGenerationNumber && <p className="text-xs text-gray-400 mt-0.5">वंश/पुस्ता: {family.vanshaGenerationNumber}</p>}
                    </div>
                    {isClosed && <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">बन्द</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5"><FaUsers className={`${isClosed ? 'text-gray-400' : 'text-blue-500'} text-sm`} /><span className={`text-sm font-medium ${isClosed ? 'text-gray-500' : 'text-gray-700'}`}>{getFamilyMemberCount(family._id)} सदस्यहरू</span></div>
                    {family.clan && <div className="flex items-center gap-1.5"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{family.clan}</span></div>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleViewTree(family); }} className="text-xs"><FaTree className="mr-1" /> वृक्ष</Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEditFamily(family); }} className="text-xs">सम्पादन</Button>
                    {isClosed ? (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleReopenFamily(family); }} className="text-xs text-green-600 border-green-300 hover:bg-green-50">पुन: खोल्नुहोस्</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleCloseFamily(family); }} className="text-xs text-red-600 border-red-300 hover:bg-red-50">बन्द गर्नुहोस्</Button>
                    )}
                    {getFamilyMemberCount(family._id) === 0 && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDeleteFamily(family); }} className="text-xs text-red-600 border-red-300 hover:bg-red-50">मेटाउनुहोस्</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>पछिल्लो</Button>
          <span className="flex items-center px-3 text-sm text-gray-600">{page} / {data.pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages}>अर्को</Button>
        </div>
      )}

      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setFamilyForm(initialFamilyForm); setFormErrors({}); }} title="नयाँ परिवार थप्नुहोस्" size="lg">
        {renderFamilyForm(false)}
      </Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingFamily(null); setFamilyForm(initialFamilyForm); setFormErrors({}); }} title="परिवार अद्यावधिक गर्नुहोस्" size="lg">
        {renderFamilyForm(true)}
      </Modal>
      <Modal isOpen={isTreeModalOpen} onClose={() => { if (profileMemberId) { setProfileMemberId(null); return; } setIsTreeModalOpen(false); setSelectedFamily(null); }} title={`पारिवारिक वृक्ष - ${selectedFamily?.familyName || ''}`} size="xl">
        {selectedFamily && (
          <div className="min-h-[400px] max-h-[75vh] overflow-auto">
            <FamilyTreeView familyId={selectedFamily._id} onMemberClick={(member) => setProfileMemberId(member._id)} />
            <MemberProfileModal memberId={profileMemberId} onClose={() => setProfileMemberId(null)} />
          </div>
        )}
      </Modal>
      <Modal isOpen={isDetailsModalOpen} onClose={() => { setIsDetailsModalOpen(false); setSelectedFamily(null); }} title="परिवार विवरण" size="lg">
        {selectedFamily && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">परिवारको नाम</p><p className="font-medium">{selectedFamily.familyName}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">परिवार नम्बर</p><p className="font-medium">{selectedFamily.familyNumber}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">घर नम्बर</p><p className="font-medium">{selectedFamily.house?.houseNumber || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">घर आइडी</p><p className="font-medium text-green-600">{selectedFamily.houseIdentifier || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">घरको नाम</p><p className="font-medium">{selectedFamily.house?.houseName || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">वंश/पुस्ता</p><p className="font-medium">{selectedFamily.vanshaGenerationNumber || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">कुल सदस्य</p><p className="font-medium">{getFamilyMemberCount(selectedFamily._id)}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">पुस्ताहरू</p><p className="font-medium">{getFamilyGenerations(selectedFamily._id)}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">स्थिति</p><span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedFamily.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{selectedFamily.status === 'closed' ? 'बन्द' : 'खुला'}</span></div>
              {selectedFamily.familyHead && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">घरमुली</p><p className="font-medium">{typeof selectedFamily.familyHead === 'object' ? selectedFamily.familyHead.name : selectedFamily.familyHead}</p></div>}
              {selectedFamily.clan && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">कुल / गोत्र</p><p className="font-medium">{selectedFamily.clan}</p></div>}
              {selectedFamily.currentAddress && <div className="p-3 bg-gray-50 rounded-lg col-span-2"><p className="text-xs text-gray-500">हालको ठेगाना</p><p className="font-medium">{selectedFamily.currentAddress}</p></div>}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FaUser className="text-green-500" /> सदस्यहरू ({getFamilyMemberCount(selectedFamily._id)})</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">क्र.सं.</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">नाम</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">सम्बन्ध</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">पुस्ता</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">स्थिति</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {familyMembers.map((member, index) => (
                      <tr key={member._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-700">{member.name}</td>
                        <td className="px-4 py-2 text-gray-600">{member.lineageRole === 'lineage_head' ? 'घरमुली' : getRelationshipLabel(member.relationship)}</td>
                        <td className="px-4 py-2 text-gray-600">{member.generation || 'N/A'}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${member.isAlive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{member.isAlive !== false ? 'जीवित' : 'मृत'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Families;