import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createMember, updateMember, getMemberOptions } from '../api/members';
import { getFamilies, getFamilyBanshaNumbers } from '../api/families';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import FloatingInput from '../components/FloatingInput';
import SearchableSelect from '../components/SearchableSelect';
import LocationSelect from '../components/LocationSelect';
import ImageUpload from '../components/ImageUpload';
import NepaliDatePickerComponent from '../components/NepaliDatePickerComponent';
import Button from '../components/Button';
import VanshNoAutocomplete from '../components/VanshNoAutocomplete';
import { getBsDateLabel } from '../utils/treeLabels';
import { saveDraftFiles, loadDraftFiles, clearDraftFiles } from '../utils/draftFiles';

// Data
import { jobTitles, educationLevels, bloodGroups, maritalStatuses, relationships } from '../data/options';

// Icons
import {
  FaUser, FaEnvelope, FaPhone, FaCalendar, FaMapPin,
  FaIdCard, FaBriefcase, FaGraduationCap, FaHeart,
  FaUsers, FaAddressCard, FaPassport, FaCar, FaFile,
  FaInfoCircle, FaSave, FaTimes, FaCamera,
  FaChevronLeft, FaChevronRight, FaTrash,
  FaHome, FaTree, FaChild, FaBuilding, FaClone, FaPrint,
  FaQuestionCircle, FaUserSlash, FaMale, FaFemale
} from 'react-icons/fa';

const PHOTO_FIELDS = [
  'photo', 'citizenshipFront', 'citizenshipBack',
  'nationalIdFront', 'passportPhoto', 'drivingLicensePhoto',
];

// Dates other than the date of birth. All are typed in BS.
const BS_DATE_FIELDS = [
  'dod', 'wifeDob', 'husbandDob', 'citizenshipIssueDate', 'nationalIdIssueDate',
  'passportIssueDate', 'passportExpiryDate', 'drivingLicenseIssueDate', 'drivingLicenseExpiryDate',
];

// Fields that always keep a value: emptying them on an edit changes nothing
const NEVER_CLEARED = [
  'name', 'gender', 'dob', 'district', 'country', 'family', 'familyNumber', 'generation', 'generationMode',
  'personStatus', 'isAlive', 'maritalStatus', 'lineageRole', 'bloodGroup', 'sons', 'daughters',
];

const DRAFT_KEY = 'memberDraft';

const DataEntry = ({ member, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDraft, setIsDraft] = useState(false);

  const tabOrder = ['personal', 'contact', 'family', 'identification', 'passport', 'documents', 'additional'];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const initialFormData = {
    name: '',
    surname: '',
    gender: 'male',
    dob: '',
    district: '',
    country: 'Nepal',

    placeOfBirth: '',
    bloodGroup: 'unknown',
    isAlive: true,
    dod: '',
    occupation: '',
    education: '',
    religion: '',
    casteEthnicity: '',
    nationality: 'Nepali',
    spouse: '',
    wifeName: '',
    wifeDob: '',
    husbandName: '',
    husbandDob: '',
    personStatus: 'known',
    unknownNameNote: '',
    phone: '',
    alternatePhone: '',
    email: '',
    wardNumber: '',
    toleVillage: '',
    municipality: '',
    province: '',
    currentAddress: '',
    permanentAddress: '',
    postalCode: '',
    family: '',
    familyNumber: '',
    vanshaGenerationNumber: '',
    generation: 1,
    generationMode: 'auto',
    relationship: '',
    father: '',
    mother: '',
    grandfather: '',
    grandmother: '',
    guardian: '',
    childBirthOrder: '',
    lineageRole: 'lineage_member',
    familyContact: '',
    maritalStatus: 'single',
    sons: [],
    daughters: [],
    citizenshipNumber: '',
    citizenshipIssueDate: '',
    citizenshipIssueDistrict: '',
    nationalIdNumber: '',
    nationalIdIssueDate: '',
    passportNumber: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    drivingLicenseNumber: '',
    drivingLicenseCategory: '',
    drivingLicenseIssueDate: '',
    drivingLicenseExpiryDate: '',
    birthCertificate: '',
    marriageCertificate: '',
    deathCertificate: '',
    panCard: '',
    voterId: '',
    biography: '',
    notes: '',
    specialRemarks: '',
    medicalNotes: '',
    disabilityInfo: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [photos, setPhotos] = useState({
    photo: null, photoPreview: '',
    citizenshipFront: null, citizenshipFrontPreview: '',
    citizenshipBack: null, citizenshipBackPreview: '',
    nationalIdFront: null, nationalIdFrontPreview: '',
    passportPhoto: null, passportPhotoPreview: '',
    drivingLicensePhoto: null, drivingLicensePhotoPreview: '',
  });

  const [documents, setDocuments] = useState({
    birthCertificate: null, marriageCertificate: null,
    deathCertificate: null, panCard: null, voterId: null,
  });


  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families'],
    queryFn: () => getFamilies({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });


  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members-dropdown'],
    queryFn: getMemberOptions,
    staleTime: 5 * 60 * 1000,
  });


  const { data: banshaData } = useQuery({
    queryKey: ['family-bansha', formData.family],
    queryFn: () => getFamilyBanshaNumbers(formData.family),
    enabled: !!formData.family,
    staleTime: 5 * 60 * 1000,
  });

  const refreshMemberData = () => {
    [
      'members', 'members-dropdown', 'members-tree', 'members-for-families',
      'familyTree', 'member', 'families', 'dashboardStats', 'family-bansha',
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      toast.success('Member created successfully');
      refreshMemberData();
      onSuccess?.();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMember(id, data),
    onSuccess: () => {
      toast.success('Member updated successfully');
      refreshMemberData();
      onSuccess?.();
    },
  });

  const saveDraft = async () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));

      const files = {};
      PHOTO_FIELDS.forEach((field) => {
        if (photos[field] instanceof File) files[field] = photos[field];
      });
      Object.entries(documents).forEach(([field, file]) => {
        if (file instanceof File) files[field] = file;
      });
      await saveDraftFiles(DRAFT_KEY, files);

      toast.success('Draft saved successfully');
      setIsDraft(true);
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };


  const loadDraft = async () => {
    try {
      const savedData = localStorage.getItem(DRAFT_KEY);
      if (!savedData) {
        toast.error('No draft found');
        return;
      }
      setFormData({ ...initialFormData, ...JSON.parse(savedData) });

      const files = (await loadDraftFiles(DRAFT_KEY).catch(() => null)) || {};
      setPhotos((prev) => {
        const next = { ...prev };
        PHOTO_FIELDS.forEach((field) => {
          next[field] = files[field] || null;
          next[`${field}Preview`] = files[field] ? URL.createObjectURL(files[field]) : '';
        });
        return next;
      });
      setDocuments((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((field) => {
          next[field] = files[field] || null;
        });
        return next;
      });

      toast.success('Draft loaded');
      setIsDraft(true);
    } catch (error) {
      toast.error('Failed to load draft');
    }
  };

  useEffect(() => {
    if (member) {
      const populatedData = { ...initialFormData };
      const fieldsToPopulate = { ...member };

      if (member.family && typeof member.family === 'object') {
        fieldsToPopulate.family = member.family._id || '';
        fieldsToPopulate.familyNumber = member.family.familyNumber || '';
        fieldsToPopulate.vanshaGenerationNumber = member.vanshaGenerationNumber || '';
      }

      const relationFields = ['father', 'mother', 'grandfather', 'grandmother', 'spouse', 'guardian'];
      relationFields.forEach(field => {
        if (member[field] && typeof member[field] === 'object') {
          fieldsToPopulate[field] = member[field]._id || '';
        }
      });

      // The date picker works in BS: show the date exactly as it was entered
      if (member.dobNepali) {
        fieldsToPopulate.dob = member.dobNepali;
      }
      BS_DATE_FIELDS.forEach(field => {
        if (member[field]) fieldsToPopulate[field] = getBsDateLabel(member, field);
      });

      if (member.sons && Array.isArray(member.sons)) {
        fieldsToPopulate.sons = member.sons.map(s => typeof s === 'object' ? s._id : s);
      }
      if (member.daughters && Array.isArray(member.daughters)) {
        fieldsToPopulate.daughters = member.daughters.map(d => typeof d === 'object' ? d._id : d);
      }

      Object.keys(fieldsToPopulate).forEach(key => {
        if (fieldsToPopulate[key] !== undefined && fieldsToPopulate[key] !== null) {
          populatedData[key] = fieldsToPopulate[key];
        }
      });

      setFormData(populatedData);

      setPhotos(prev => ({
        ...prev,
        photoPreview: member.photo || '',
        citizenshipFrontPreview: member.citizenshipFront || '',
        citizenshipBackPreview: member.citizenshipBack || '',
        nationalIdFrontPreview: member.nationalIdFront || '',
        passportPhotoPreview: member.passportPhoto || '',
        drivingLicensePhotoPreview: member.drivingLicensePhoto || '',
      }));
    }
  }, [member]);

  const resetForm = () => {
    Object.values(photos).forEach(value => {
      if (typeof value === 'string' && value.startsWith('blob:')) {
        URL.revokeObjectURL(value);
      }
    });

    setFormData(initialFormData);
    setPhotos({
      photo: null, photoPreview: '',
      citizenshipFront: null, citizenshipFrontPreview: '',
      citizenshipBack: null, citizenshipBackPreview: '',
      nationalIdFront: null, nationalIdFrontPreview: '',
      passportPhoto: null, passportPhotoPreview: '',
      drivingLicensePhoto: null, drivingLicensePhotoPreview: '',
    });
    setDocuments({
      birthCertificate: null, marriageCertificate: null,
      deathCertificate: null, panCard: null, voterId: null,
    });
    setActiveTab('personal');
    setValidationErrors({});
    setIsDraft(false);
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem('memberDraftPhotos');
    clearDraftFiles(DRAFT_KEY).catch(() => {});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'sons' || name === 'daughters') {
      if (Array.isArray(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      } else {
        setFormData(prev => {
          const current = prev[name] || [];
          if (current.includes(value)) {
            return { ...prev, [name]: current.filter(v => v !== value) };
          } else {
            return { ...prev, [name]: [...current, value] };
          }
        });
      }
      return;
    }

    if (name === 'family') {
      const familyId = typeof value === 'object' && value !== null
        ? (value._id || value.value || String(value))
        : String(value || '');

      setFormData(prev => ({
        ...prev,
        [name]: familyId,
        familyNumber: '',
        vanshaGenerationNumber: '',
      }));

      if (familyId) {
        const selectedFamily = familiesData?.data?.find(f => f._id === familyId);
        if (selectedFamily) {
          setFormData(prev => ({
            ...prev,
            familyNumber: selectedFamily.familyNumber || '',
            vanshaGenerationNumber: selectedFamily.vanshaGenerationNumber || '',
          }));
          toast.success(`परिवार चयन गरियो: ${selectedFamily.familyName}`);
        }
      }

      if (validationErrors[name]) {
        setValidationErrors(prev => ({ ...prev, [name]: '' }));
      }
      return;
    }


    if (name === 'maritalStatus') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || '',
        spouse: value !== 'single' ? prev.spouse : '',
        wifeName: value !== 'single' ? prev.wifeName : '',
        wifeDob: value !== 'single' ? prev.wifeDob : '',
        husbandName: value !== 'single' ? prev.husbandName : '',
        husbandDob: value !== 'single' ? prev.husbandDob : '',
      }));
      return;
    }


    if (name === 'personStatus') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || 'known',
        name: value === 'unknown_name' ? '' : prev.name,
        unknownNameNote: value === 'unknown_name' ? prev.unknownNameNote : '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageSelect = (type, file, preview) => {
    const existingPreview = photos[`${type}Preview`];
    if (typeof existingPreview === 'string' && existingPreview.startsWith('blob:')) {
      URL.revokeObjectURL(existingPreview);
    }

    setPhotos((prev) => ({
      ...prev,
      [type]: file,
      [`${type}Preview`]: preview || (file ? URL.createObjectURL(file) : ''),
    }));
  };

  const handlePhotoRemove = (type) => {
    const preview = photos[`${type}Preview`];
    if (typeof preview === 'string' && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setPhotos((prev) => ({
      ...prev,
      [type]: null,
      [`${type}Preview`]: '',
    }));
  };

  const handleDocumentUpload = (type, file) => {
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const validateForm = () => {
    const errors = {};

    if (formData.personStatus !== 'unknown_name') {
      if (!formData.name?.trim()) {
        errors.name = 'Full Name is required';
      }
    }

    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }

    if (formData.personStatus !== 'unknown_name') {
      if (!formData.dob) {
        errors.dob = 'Date of Birth is required';
      }
    }

    if (!formData.district) {
      errors.district = 'District is required';
    }

    if (!formData.country?.trim()) {
      errors.country = 'Country is required';
    }

    if (!formData.family) {
      errors.family = 'परिवार चयन गर्नुहोस् (Family is required)';
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(msg => toast.error(msg));
      return;
    }

    setLoading(true);

    const buildSubmitData = (confirmDuplicate = false) => {
      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        const value = formData[key];
        // files are added below, from what was picked on this form
        if (PHOTO_FIELDS.includes(key)) return;
        if (value === undefined || value === null || value === '') return;

        if (key === 'generation' || key === 'childBirthOrder') {
          submitData.append(key, Number(value));
        } else if (typeof value === 'boolean') {
          submitData.append(key, String(value));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            submitData.append(`${key}[${index}]`, item);
          });
        } else if (typeof value === 'object' && value._id) {
          submitData.append(key, value._id);
        } else {
          submitData.append(key, value);
        }
      });

      PHOTO_FIELDS.forEach(field => {
        if (photos[field] && photos[field] instanceof File) {
          submitData.append(field, photos[field]);
        }
      });

      Object.entries(documents).forEach(([key, file]) => {
        if (file && file instanceof File) {
          submitData.append(key, file);
        }
      });

      // Editing: a field or photo that had a value and was emptied is sent as
      // empty, which tells the server to remove it.
      if (member) {
        Object.keys(initialFormData)
          .filter(key => !NEVER_CLEARED.includes(key))
          .forEach(key => {
            if (formData[key] === '' && member[key]) submitData.append(key, '');
          });
        if (formData.personStatus === 'unknown_name' && formData.dob === '' && member.dob) {
          submitData.append('dob', '');
        }
        PHOTO_FIELDS.forEach(field => {
          if (member[field] && !photos[`${field}Preview`] && !(photos[field] instanceof File)) {
            submitData.append(field, '');
          }
        });
      }

      if (confirmDuplicate) submitData.append('confirmDuplicate', 'true');
      return submitData;
    };

    const save = (submitData) =>
      member
        ? updateMutation.mutateAsync({ id: member._id, data: submitData })
        : createMutation.mutateAsync(submitData);

    try {
      await save(buildSubmitData());
    } catch (error) {
      // Someone with the same name is already in this family: the same person
      // entered twice, or a different person with the same name? The user decides.
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.code === 'POSSIBLE_DUPLICATE') {
        const isDifferentPerson = window.confirm(
          `${data.message}\n\nयो फरक व्यक्ति हो भने OK थिच्नुहोस् र save हुनेछ। उही व्यक्ति हो भने Cancel थिच्नुहोस्।`
        );
        if (isDifferentPerson) {
          await save(buildSubmitData(true)).catch((retryError) => console.error('Submit error:', retryError));
        }
      } else {
        console.error('Submit error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const goToNextTab = () => {
    if (activeTab === 'personal') {
      const personalErrors = {};
      if (formData.personStatus !== 'unknown_name' && !formData.name?.trim()) personalErrors.name = 'Full Name is required';
      if (!formData.gender) personalErrors.gender = 'Gender is required';
      if (formData.personStatus !== 'unknown_name' && !formData.dob) personalErrors.dob = 'Date of Birth is required';

      if (Object.keys(personalErrors).length > 0) {
        setValidationErrors(personalErrors);
        Object.values(personalErrors).forEach(msg => toast.error(msg));
        return;
      }
    }

    if (activeTab === 'contact') {
      const contactErrors = {};
      if (!formData.district) contactErrors.district = 'District is required';
      if (!formData.country?.trim()) contactErrors.country = 'Country is required';

      if (Object.keys(contactErrors).length > 0) {
        setValidationErrors(contactErrors);
        Object.values(contactErrors).forEach(msg => toast.error(msg));
        return;
      }
    }

    const nextIndex = currentTabIndex + 1;
    if (nextIndex < tabOrder.length) {
      setActiveTab(tabOrder[nextIndex]);
      setValidationErrors({});
    }
  };

  const goToPrevTab = () => {
    const prevIndex = currentTabIndex - 1;
    if (prevIndex >= 0) {
      setActiveTab(tabOrder[prevIndex]);
      setValidationErrors({});
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setValidationErrors({});
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: FaUser },
    { id: 'contact', label: 'Contact & Address', icon: FaAddressCard },
    { id: 'family', label: 'Family', icon: FaUsers },
    { id: 'identification', label: 'ID Cards', icon: FaIdCard },
    { id: 'passport', label: 'Passport & License', icon: FaPassport },
    { id: 'documents', label: 'Documents', icon: FaFile },
    { id: 'additional', label: 'Additional', icon: FaInfoCircle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal': return renderPersonalInfo();
      case 'contact': return renderContactAddress();
      case 'family': return renderFamilyInfo();
      case 'identification': return renderIdentification();
      case 'passport': return renderPassportLicense();
      case 'documents': return renderDocuments();
      case 'additional': return renderAdditionalInfo();
      default: return null;
    }
  };

  const renderPhotoUpload = (type, label, preview, required = false, size = 'md') => {
    const sizeClasses = { sm: 'w-32 h-32', md: 'w-40 h-40', lg: 'w-48 h-48', xl: 'w-56 h-56' };
    const hasError = validationErrors[type];

    return (
      <div className="flex flex-col items-center">
        {preview ? (
          <div className="relative group">
            <div className={`${sizeClasses[size]} rounded-xl overflow-hidden border-2 ${hasError ? 'border-red-500' : 'border-green-200'} shadow-md hover:shadow-lg transition-all duration-300`}>
              <img src={preview} alt={label} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
              <button type="button" onClick={() => handlePhotoRemove(type)} className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors" title="Remove photo">
                <FaTrash className="h-5 w-5 text-red-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`${sizeClasses[size]}`}>
            <ImageUpload onImageSelect={(file, preview) => handleImageSelect(type, file, preview)} label={label} maxSize={5} />
          </div>
        )}
        {hasError && <span className="text-xs text-red-500 mt-1">{validationErrors[type]}</span>}
      </div>
    );
  };

  const renderPersonalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2 space-y-3">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <label className="block text-xs font-medium text-amber-700 mb-2">व्यक्तिको स्थिति (Person Status)</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleSelectChange('personStatus', 'known')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.personStatus === 'known' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'}`}>
              <FaUser className="inline mr-1.5 text-xs" /> ज्ञात व्यक्ति
            </button>
            <button type="button" onClick={() => handleSelectChange('personStatus', 'missing')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.personStatus === 'missing' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
              <FaUserSlash className="inline mr-1.5 text-xs" /> हराएको / फेला नपरेको
            </button>
            <button type="button" onClick={() => handleSelectChange('personStatus', 'unknown_name')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.personStatus === 'unknown_name' ? 'bg-gray-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              <FaQuestionCircle className="inline mr-1.5 text-xs" /> नाम अज्ञात
            </button>
          </div>
          {formData.personStatus === 'unknown_name' && <p className="text-xs text-amber-600 mt-2">💡 नाम अज्ञात भए पनि वंशावलीमा स्थान सुरक्षित रहनेछ।</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <FloatingInput label={formData.personStatus === 'unknown_name' ? 'नाम अज्ञात (Name Unknown)' : 'Full Name'} name="name" value={formData.name} onChange={handleChange} required={formData.personStatus !== 'unknown_name'} icon={FaUser} error={validationErrors.name} disabled={formData.personStatus === 'unknown_name'} placeholder={formData.personStatus === 'unknown_name' ? 'नाम अज्ञात' : ''} />
          </div>

          {formData.personStatus === 'unknown_name' && (
            <div className="md:col-span-2">
              <FloatingInput label="थप जानकारी (Additional Note)" name="unknownNameNote" value={formData.unknownNameNote} onChange={handleChange} icon={FaInfoCircle} placeholder="जस्तै: हजुरबुबाको दाजुको नाम थाहा छैन" />
            </div>
          )}

          <FloatingInput label="Surname (Last Name) - Optional" name="surname" value={formData.surname} onChange={handleChange} icon={FaUser} />

          <SearchableSelect label="Gender" name="gender" value={formData.gender} onChange={handleSelectChange} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} icon={FaMale} required error={validationErrors.gender} />

          <NepaliDatePickerComponent label="Date of Birth (BS)" name="dob" value={formData.dob} onChange={handleSelectChange} required={formData.personStatus !== 'unknown_name'} error={validationErrors.dob} />

          <FloatingInput label="Place of Birth" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} icon={FaMapPin} />

          <SearchableSelect label="Blood Group - Optional" name="bloodGroup" value={formData.bloodGroup} onChange={handleSelectChange} options={bloodGroups} />

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isAlive" checked={formData.isAlive} onChange={handleChange} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
              <span className="text-sm text-gray-700">जीवित (Is Alive)</span>
            </label>
          </div>
          {!formData.isAlive && (
            <div className="md:col-span-2">
              <NepaliDatePickerComponent label="मृत्यु मिति (Date of Death) - Optional" name="dod" value={formData.dod} onChange={handleSelectChange} placeholder="मृत्यु मिति चयन गर्नुहोस्" required={false} />
            </div>
          )}

          <SearchableSelect label="Occupation" name="occupation" value={formData.occupation} onChange={handleSelectChange} options={jobTitles} creatable placeholder="Search or enter occupation" />
          <SearchableSelect label="Education" name="education" value={formData.education} onChange={handleSelectChange} options={educationLevels} creatable placeholder="Search or enter education" />

          <FloatingInput label="Religion" name="religion" value={formData.religion} onChange={handleChange} icon={FaHeart} />
          <FloatingInput label="Caste / Ethnicity" name="casteEthnicity" value={formData.casteEthnicity} onChange={handleChange} icon={FaUsers} />
          <FloatingInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} icon={FaAddressCard} />
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 sticky top-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaCamera className="text-green-600 text-2xl" />
            </div>
            <h4 className="text-sm font-semibold text-green-800">Passport Photo - Optional</h4>
            <p className="text-xs text-gray-500">2x2 inch, white background</p>
          </div>
          <div className="flex justify-center">
            {renderPhotoUpload('photo', 'Photo', photos.photoPreview, false, 'xl')}
          </div>
          <div className="mt-3 flex justify-center gap-2 text-xs text-gray-400">
            <span>PNG</span><span>•</span><span>JPG</span><span>•</span><span>JPEG</span><span>•</span><span>5MB</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactAddress = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FloatingInput label="Mobile Number" name="phone" value={formData.phone} onChange={handleChange} type="tel" icon={FaPhone} />
      <FloatingInput label="Alternate Mobile" name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} type="tel" icon={FaPhone} />
      <FloatingInput label="Email" name="email" value={formData.email} onChange={handleChange} type="email" icon={FaEnvelope} />
      <LocationSelect label="Province" type="province" value={formData.province} onChange={(type, value) => handleSelectChange('province', value)} />
      <LocationSelect label="District" type="district" province={formData.province} value={formData.district} onChange={(type, value) => handleSelectChange('district', value)} required error={validationErrors.district} />
      <LocationSelect label="Municipality" type="municipality" district={formData.district} value={formData.municipality} onChange={(type, value) => handleSelectChange('municipality', value)} />
      <FloatingInput label="Tole / Village" name="toleVillage" value={formData.toleVillage} onChange={handleChange} icon={FaMapPin} />
      <LocationSelect label="Ward" type="ward" value={formData.wardNumber} onChange={(type, value) => handleSelectChange('wardNumber', value)} />
      <FloatingInput label="Country" name="country" value={formData.country} onChange={handleChange} icon={FaMapPin} required error={validationErrors.country} />
      <FloatingInput label="Postal Code" name="postalCode" value={formData.postalCode} onChange={handleChange} icon={FaMapPin} />
      <div className="md:col-span-2"><FloatingInput label="Current Address" name="currentAddress" value={formData.currentAddress} onChange={handleChange} type="textarea" rows={2} icon={FaMapPin} /></div>
      <div className="md:col-span-2"><FloatingInput label="Permanent Address" name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} type="textarea" rows={2} icon={FaMapPin} /></div>
    </div>
  );

  const renderFamilyInfo = () => {
    const allMembers = (membersData?.data || []).filter(m => m._id !== member?._id);
    const maleMembers = allMembers.filter(m => m.gender === 'male');
    const femaleMembers = allMembers.filter(m => m.gender === 'female');
    const spouseCandidates =
      formData.gender === 'male' ? femaleMembers : formData.gender === 'female' ? maleMembers : allMembers;

    const familyOptions = (familiesData?.data || []).map(f => ({
      value: f._id,
      label: `${f.familyName} (घर: ${f.house?.houseNumber || 'N/A'})${f.vanshaGenerationNumber ? ` - पुस्ता: ${f.vanshaGenerationNumber}` : ''}`,
    }));

    const createMemberOptions = (members) => members.map(m => ({
      value: m._id,
      label: `${m.name}${m.surname ? ` ${m.surname}` : ''} (${m.memberNumber || 'N/A'})`,
    }));

    const selectedFamily = familiesData?.data?.find(f => f._id === formData.family);

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FaInfoCircle className="text-blue-600 text-lg" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">परिवार चयन गर्नुहोस्</p>
              <p className="text-xs text-blue-600">नयाँ परिवार थप्नको लागि कृपया "परिवारहरू" पृष्ठमा जानुहोस्।</p>
            </div>
          </div>
        </div>

        <SearchableSelect
          label="परिवार"
          name="family"
          value={formData.family}
          onChange={handleSelectChange}
          options={familyOptions}
          placeholder="परिवार खोज्नुहोस्..."
          required
          error={validationErrors.family}
          disabled={familiesLoading}
        />

        {selectedFamily && (
          <div className="space-y-4 pt-4 border-t border-gray-200">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <FloatingInput label="घर नम्बर (House No.)" value={selectedFamily.house?.houseNumber || 'N/A'} disabled />
              <FloatingInput label="परिवार नम्बर" value={formData.familyNumber} disabled />
              <FloatingInput label="घर आइडी (House ID)" value={selectedFamily.houseIdentifier || 'N/A'} disabled />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <VanshNoAutocomplete
                label="वंश नं. (Bansha No.)"
                name="vanshaGenerationNumber"
                value={formData.vanshaGenerationNumber}
                onChange={handleSelectChange}
                placeholder="खोज्नुहोस् वा नयाँ वंश नं. प्रविष्ट गर्नुहोस्..."
                familyId={formData.family}
                required={false}
              />
              <SearchableSelect label="सम्बन्ध (Relationship)" name="relationship" value={formData.relationship} onChange={handleSelectChange} options={relationships} placeholder="सम्बन्ध चयन गर्नुहोस्..." />

              <div className="flex items-end gap-2">
                <FloatingInput label="पुस्ता (Generation)" name="generation" value={formData.generation} onChange={handleChange} type="number" icon={FaUsers} />
                <Button
                  type="button"
                  variant={formData.generationMode === 'manual' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, generationMode: prev.generationMode === 'manual' ? 'auto' : 'manual' }))}
                  className="mb-1"
                >
                  {formData.generationMode === 'manual' ? 'Manual' : 'Auto'}
                </Button>
              </div>

              <SearchableSelect label="बुवा" name="father" value={formData.father} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder="बुवा खोज्नुहोस्..." />
              <SearchableSelect label="आमा" name="mother" value={formData.mother} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder="आमा खोज्नुहोस्..." />
              <SearchableSelect label="हजुरबा" name="grandfather" value={formData.grandfather} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder="हजुरबा खोज्नुहोस्..." />
              <SearchableSelect label="हजुरआमा" name="grandmother" value={formData.grandmother} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder="हजुरआमा खोज्नुहोस्..." />


              <div className="md:col-span-2 p-4 bg-pink-50 rounded-xl border border-pink-200 mt-2">
                <h4 className="text-sm font-medium text-pink-700 mb-3 flex items-center gap-2">
                  <FaHeart className="text-pink-500" /> वैवाहिक स्थिति र श्रीमान/श्रीमतीको विवरण
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SearchableSelect label="वैवाहिक स्थिति" name="maritalStatus" value={formData.maritalStatus} onChange={handleSelectChange} options={maritalStatuses} />
                  {formData.maritalStatus && formData.maritalStatus !== 'single' && (
                    <>
                      <SearchableSelect label="विद्यमान सदस्यबाट श्रीमान/श्रीमती छान्नुहोस्" name="spouse" value={formData.spouse} onChange={handleSelectChange} options={createMemberOptions(spouseCandidates)} placeholder="श्रीमान/श्रीमती खोज्नुहोस्..." />
                      {!formData.spouse && formData.gender === 'male' && (
                        <>
                          <FloatingInput label="श्रीमतीको नाम (Wife Name)" name="wifeName" value={formData.wifeName} onChange={handleChange} placeholder="श्रीमतीको पूरा नाम" icon={FaUser} />
                          <NepaliDatePickerComponent label="श्रीमतीको जन्म मिति (Wife DOB)" name="wifeDob" value={formData.wifeDob} onChange={handleSelectChange} placeholder="श्रीमतीको जन्म मिति" />
                        </>
                      )}
                      {!formData.spouse && formData.gender === 'female' && (
                        <>
                          <FloatingInput label="श्रीमानको नाम (Husband Name)" name="husbandName" value={formData.husbandName} onChange={handleChange} placeholder="श्रीमानको पूरा नाम" icon={FaUser} />
                          <NepaliDatePickerComponent label="श्रीमानको जन्म मिति (Husband DOB)" name="husbandDob" value={formData.husbandDob} onChange={handleSelectChange} placeholder="श्रीमानको जन्म मिति" />
                        </>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">💡 विद्यमान सदस्य छान्नुहोस् वा श्रीमान/श्रीमतीको नाम प्रविष्ट गर्नुहोस्। पछि त्यही नामको सदस्य थपिँदा सम्बन्ध स्वत: जोडिनेछ, वृक्षमा दोहोरो देखिने छैन।</p>
                <p className="text-xs text-gray-500 mt-1">💡 दोस्रो श्रीमती थप्न: नयाँ श्रीमतीको form मा श्रीमानलाई छान्नुहोस्। गलत सम्बन्ध हटाउन: छानिएको नामको छेउको ✕ थिचेर save गर्नुहोस्।</p>
              </div>


              <div className="md:col-span-2 pt-2">
                <SearchableSelect label="छोराहरू (Sons)" name="sons" value={formData.sons || []} onChange={handleSelectChange} options={createMemberOptions(maleMembers)} placeholder="छोराहरू चयन गर्नुहोस्..." isMulti />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect label="छोरीहरू (Daughters)" name="daughters" value={formData.daughters || []} onChange={handleSelectChange} options={createMemberOptions(femaleMembers)} placeholder="छोरीहरू चयन गर्नुहोस्..." isMulti />
              </div>

              <SearchableSelect label="अभिभावक" name="guardian" value={formData.guardian} onChange={handleSelectChange} options={createMemberOptions(allMembers)} placeholder="अभिभावक खोज्नुहोस्..." />
              <FloatingInput label="सन्तान क्रम" name="childBirthOrder" value={formData.childBirthOrder} onChange={handleChange} type="number" icon={FaChild} />
              <SearchableSelect label="पुस्ताको भूमिका" name="lineageRole" value={formData.lineageRole} onChange={handleSelectChange} options={[{ value: 'lineage_head', label: 'घरमुली' }, { value: 'lineage_member', label: 'सदस्य' }, { value: 'spouse', label: 'श्रीमान/श्रीमती' }, { value: 'other', label: 'अन्य' }]} />
              <FloatingInput label="परिवार सम्पर्क" name="familyContact" value={formData.familyContact} onChange={handleChange} type="tel" icon={FaPhone} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIdentification = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label="Citizenship Number" name="citizenshipNumber" value={formData.citizenshipNumber} onChange={handleChange} icon={FaIdCard} />
        <NepaliDatePickerComponent label="Citizenship Issue Date (BS)" name="citizenshipIssueDate" value={formData.citizenshipIssueDate} onChange={handleSelectChange} />
        <LocationSelect label="Citizenship Issue District" type="district" value={formData.citizenshipIssueDistrict} onChange={(type, value) => handleSelectChange('citizenshipIssueDistrict', value)} />
        <FloatingInput label="National ID Number" name="nationalIdNumber" value={formData.nationalIdNumber} onChange={handleChange} icon={FaIdCard} />
        <NepaliDatePickerComponent label="NID Issue Date (BS)" name="nationalIdIssueDate" value={formData.nationalIdIssueDate} onChange={handleSelectChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Citizenship Front</h5>
          <div className="flex justify-center">{renderPhotoUpload('citizenshipFront', 'Citizenship Front', photos.citizenshipFrontPreview, false, 'md')}</div>
        </div>
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Citizenship Back</h5>
          <div className="flex justify-center">{renderPhotoUpload('citizenshipBack', 'Citizenship Back', photos.citizenshipBackPreview, false, 'md')}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
          <h5 className="text-xs font-medium text-green-700 mb-2 text-center">National ID Front</h5>
          <div className="flex justify-center">{renderPhotoUpload('nationalIdFront', 'National ID Front', photos.nationalIdFrontPreview, false, 'md')}</div>
        </div>
      </div>
    </div>
  );

  const renderPassportLicense = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label="Passport Number" name="passportNumber" value={formData.passportNumber} onChange={handleChange} icon={FaPassport} />
        <NepaliDatePickerComponent label="Passport Issue Date (BS)" name="passportIssueDate" value={formData.passportIssueDate} onChange={handleSelectChange} />
        <NepaliDatePickerComponent label="Passport Expiry Date (BS)" name="passportExpiryDate" value={formData.passportExpiryDate} onChange={handleSelectChange} />
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Passport Photo</h5>
        <div className="flex justify-center">{renderPhotoUpload('passportPhoto', 'Passport Photo', photos.passportPhotoPreview, false, 'lg')}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingInput label="Driving License Number" name="drivingLicenseNumber" value={formData.drivingLicenseNumber} onChange={handleChange} icon={FaCar} />
        <FloatingInput label="DL Category" name="drivingLicenseCategory" value={formData.drivingLicenseCategory} onChange={handleChange} icon={FaCar} />
        <NepaliDatePickerComponent label="DL Issue Date (BS)" name="drivingLicenseIssueDate" value={formData.drivingLicenseIssueDate} onChange={handleSelectChange} />
        <NepaliDatePickerComponent label="DL Expiry Date (BS)" name="drivingLicenseExpiryDate" value={formData.drivingLicenseExpiryDate} onChange={handleSelectChange} />
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Driving License Photo</h5>
        <div className="flex justify-center">{renderPhotoUpload('drivingLicensePhoto', 'Driving License Photo', photos.drivingLicensePhotoPreview, false, 'lg')}</div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Birth Certificate</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('birthCertificate', file)} label="Upload Birth Certificate" maxSize={5} /></div>
        {documents.birthCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ File ready to upload</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Marriage Certificate</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('marriageCertificate', file)} label="Upload Marriage Certificate" maxSize={5} /></div>
        {documents.marriageCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ File ready to upload</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Death Certificate</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('deathCertificate', file)} label="Upload Death Certificate" maxSize={5} /></div>
        {documents.deathCertificate && <p className="text-xs text-green-600 mt-1 text-center">✓ File ready to upload</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">PAN Card</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('panCard', file)} label="Upload PAN Card" maxSize={5} /></div>
        {documents.panCard && <p className="text-xs text-green-600 mt-1 text-center">✓ File ready to upload</p>}
      </div>
      <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-4 hover:border-green-400 transition-all duration-300 md:col-span-2 max-w-md mx-auto">
        <h5 className="text-xs font-medium text-green-700 mb-2 text-center">Voter ID</h5>
        <div className="flex justify-center"><ImageUpload onImageSelect={(file) => handleDocumentUpload('voterId', file)} label="Upload Voter ID" maxSize={5} /></div>
        {documents.voterId && <p className="text-xs text-green-600 mt-1 text-center">✓ File ready to upload</p>}
      </div>
    </div>
  );

  const renderAdditionalInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2"><FloatingInput label="Biography" name="biography" value={formData.biography} onChange={handleChange} type="textarea" rows={3} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label="Notes" name="notes" value={formData.notes} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label="Special Remarks" name="specialRemarks" value={formData.specialRemarks} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label="Medical Notes" name="medicalNotes" value={formData.medicalNotes} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
      <div className="md:col-span-2"><FloatingInput label="Disability Information" name="disabilityInfo" value={formData.disabilityInfo} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} /></div>
    </div>
  );

  const isSubmitting = loading || createMutation.isLoading || updateMutation.isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 rounded-xl p-4 shadow-sm border border-green-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-green-800 flex items-center gap-2">
              {member ? <><span>✏️</span> Edit Member</> : <><span>➕</span> Add New Member</>}
            </h2>
            <p className="text-xs text-green-600 mt-0.5">
              {member ? 'Update member information' : 'Enter member details'} • Step {currentTabIndex + 1} of {tabOrder.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!member && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={saveDraft} className="flex items-center">
                  <FaClone className="mr-1.5 text-xs" /> Save Draft
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={loadDraft} className="flex items-center">
                  <FaFile className="mr-1.5 text-xs" /> Load Draft
                </Button>
              </>
            )}
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              {member ? 'Editing' : 'New'}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-500" style={{ width: `${((currentTabIndex + 1) / tabOrder.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-green-100">
          <div className="bg-green-50/30 px-3 pt-2 overflow-x-auto rounded-t-xl">
            <div className="flex min-w-max gap-1">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300 relative rounded-t-lg ${activeTab === tab.id ? 'text-green-700 bg-white shadow-sm' : 'text-gray-500 hover:text-green-600 hover:bg-green-50/50'} ${index < currentTabIndex ? 'text-green-500' : ''}`}
                >
                  {index < currentTabIndex && <span className="text-green-500 mr-0.5">✓</span>}
                  <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.id ? 'text-green-600' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" transition={{ duration: 0.3 }} />}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 md:p-4">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-3">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex gap-2 order-2 sm:order-1">
              <Button type="button" variant="outline" onClick={onCancel} size="sm" className="px-4">
                <FaTimes className="mr-1.5 text-xs" /> Cancel
              </Button>
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              {!isFirstTab && (
                <Button type="button" variant="secondary" onClick={goToPrevTab} size="sm" className="px-4">
                  <FaChevronLeft className="mr-1.5 text-xs" /> Previous
                </Button>
              )}
              {isLastTab ? (
                <Button key="save" type="submit" disabled={isSubmitting} variant="primary" size="sm" className="px-5">
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <FaSave className="mr-1.5 text-xs" />
                      {member ? 'Update Member' : 'Save Member'}
                    </>
                  )}
                </Button>
              ) : (
                <Button key="next" type="button" variant="primary" onClick={goToNextTab} size="sm" className="px-5">
                  Next <FaChevronRight className="ml-1.5 text-xs" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default DataEntry;