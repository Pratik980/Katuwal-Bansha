import { formatDate } from '../utils/formatters';
import { getBsDateLabel } from '../utils/treeLabels';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  BookOpen,
  Heart,
  Smartphone,
  FileText,
  Home,
  Users,
  Activity,
  IdCard,
  CreditCard,
  BookMarked,
} from "lucide-react";

const MemberProfile = ({ member }) => {
  if (!member) return null;

  // Date of birth: the BS date that was typed, with the AD date after it
  const birthDate = member.dob
    ? (member.dobNepali ? `${member.dobNepali} BS (${formatDate(member.dob)})` : formatDate(member.dob))
    : '';
  const bsDate = (field) => {
    const label = getBsDateLabel(member, field);
    return label ? `${label} BS` : '';
  };


  const hasValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.length > 0;
      if (value._id) return true;
      return Object.keys(value).some(key => hasValue(value[key]));
    }
    return true;
  };

  const renderStatusBadge = (status) => {
    const colors = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const renderSection = (title, icon, children, condition = true) => {
    if (!condition) return null;
    return (
      <div className="border-b border-gray-200 pb-4 last:border-b-0">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          {icon}
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {children}
        </div>
      </div>
    );
  };

  const renderField = (label, value, fallback = 'Not specified') => {
    if (!hasValue(value)) return null;
    return (
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm text-gray-900">{typeof value === 'object' && value.name ? value.name : value}</span>
      </div>
    );
  };

  const hasSectionData = (fields) => {
    return fields.some(field => hasValue(member[field]));
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto px-2">

      <div className="flex items-center gap-4">
        <img
          src={member.photo || '/default-avatar.png'}
          alt={member.name}
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          onError={(e) => {
            if (e.target.dataset.fallback) return;
            e.target.dataset.fallback = 'true';
            e.target.src = '/default-avatar.png';
          }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
            {hasValue(member.surname) && (
              <span className="text-sm text-gray-600">{member.surname}</span>
            )}
            {hasValue(member.memberNumber) && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                #{member.memberNumber}
              </span>
            )}
            {hasValue(member.verificationStatus) && renderStatusBadge(member.verificationStatus)}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
            {hasValue(member.gender) && <span className="capitalize">{member.gender}</span>}
            {hasValue(member.gender) && <span>•</span>}
            <span className={member.isAlive === false ? 'text-red-600' : 'text-green-600'}>
              {member.isAlive === false ? 'Deceased' : 'Living'}
            </span>
            {hasValue(member.generation) && (
              <>
                <span>•</span>
                <span>Generation {member.generation}</span>
              </>
            )}
            {hasValue(member.familyNumber) && (
              <>
                <span>•</span>
                <span>Family #{member.familyNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>


      {renderSection('Personal Information', <User className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Date of Birth', birthDate)}
          {renderField('Place of Birth', member.placeOfBirth)}
          {renderField('Blood Group', member.bloodGroup)}
          {renderField('Marital Status', member.maritalStatus)}
          {renderField('Occupation', member.occupation)}
          {renderField('Education', member.education)}
          {renderField('Religion', member.religion)}
          {renderField('Caste/Ethnicity', member.casteEthnicity)}
          {renderField('Nationality', member.nationality)}

          {member.isAlive === false && member.dod && renderField('Date of Death', bsDate('dod'))}
        </>,

        hasSectionData(['dob', 'placeOfBirth', 'bloodGroup', 'maritalStatus', 'occupation', 'education', 'religion', 'casteEthnicity', 'nationality', 'dod'])
      )}


      {renderSection('Contact Information', <Smartphone className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Mobile Number', member.phone)}
          {renderField('Alternative Mobile', member.alternatePhone)}
          {renderField('Email', member.email)}
        </>,
        hasSectionData(['phone', 'alternatePhone', 'email'])
      )}

      {renderSection('Address Information', <Home className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('House Number', member.houseNumber)}
          {renderField('Ward Number', member.wardNumber)}
          {renderField('Tole/Village', member.toleVillage)}
          {renderField('Municipality', member.municipality)}
          {renderField('District', member.district)}
          {renderField('Province', member.province)}
          {renderField('Country', member.country)}
          {renderField('Current Address', member.currentAddress)}
          {renderField('Permanent Address', member.permanentAddress)}
          {renderField('Postal Code', member.postalCode)}
        </>,
        hasSectionData(['houseNumber', 'wardNumber', 'toleVillage', 'municipality', 'district', 'province', 'country', 'currentAddress', 'permanentAddress', 'postalCode'])
      )}


      {renderSection('Family Information', <Users className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Family', member.family?.familyName)}
          {renderField('Family Number', member.familyNumber)}
          {renderField('Roll Number', member.rollNumber)}
          {renderField('Generation', member.generation)}
          {renderField('Relationship', member.relationship)}
          {renderField('Father', member.father?.name)}
          {renderField('Mother', member.mother?.name)}
          {renderField('Grandfather', member.grandfather?.name)}
          {renderField('Grandmother', member.grandmother?.name)}
          {renderField('Spouse', member.spouse?.name)}
          {renderField('Guardian', member.guardian?.name)}
          {renderField('Family Contact', member.familyContact)}
        </>,
        hasSectionData(['family', 'familyNumber', 'rollNumber', 'generation', 'relationship', 'father', 'mother', 'grandfather', 'grandmother', 'spouse', 'guardian', 'familyContact'])
      )}


      {renderSection('Identification', <IdCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Citizenship Number', member.citizenshipNumber)}
          {renderField('Citizenship Issue Date', bsDate('citizenshipIssueDate'))}
          {renderField('Citizenship Issue District', member.citizenshipIssueDistrict)}
          {renderField('NID Number', member.nationalIdNumber)}
          {renderField('NID Issue Date', bsDate('nationalIdIssueDate'))}
        </>,
        hasSectionData(['citizenshipNumber', 'citizenshipIssueDate', 'citizenshipIssueDistrict', 'nationalIdNumber', 'nationalIdIssueDate'])
      )}


      {renderSection('Passport', <IdCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Passport Number', member.passportNumber)}
          {renderField('Passport Issue Date', bsDate('passportIssueDate'))}
          {renderField('Passport Expiry Date', bsDate('passportExpiryDate'))}
        </>,
        hasSectionData(['passportNumber', 'passportIssueDate', 'passportExpiryDate'])
      )}


      {renderSection('Driving License', <CreditCard className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('License Number', member.drivingLicenseNumber)}
          {renderField('License Category', member.drivingLicenseCategory)}
          {renderField('License Issue Date', bsDate('drivingLicenseIssueDate'))}
          {renderField('License Expiry Date', bsDate('drivingLicenseExpiryDate'))}
        </>,
        hasSectionData(['drivingLicenseNumber', 'drivingLicenseCategory', 'drivingLicenseIssueDate', 'drivingLicenseExpiryDate'])
      )}


      {renderSection('Additional Information', <BookMarked className="h-4 w-4 text-gray-500" />,
        <>
          {member.biography && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Biography</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.biography}</p>
            </div>
          )}
          {member.notes && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Notes</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
          {member.specialRemarks && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Special Remarks</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.specialRemarks}</p>
            </div>
          )}
          {member.medicalNotes && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Medical Notes</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.medicalNotes}</p>
            </div>
          )}
          {member.disabilityInfo && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Disability Information</span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{member.disabilityInfo}</p>
            </div>
          )}
        </>,
        hasSectionData(['biography', 'notes', 'specialRemarks', 'medicalNotes', 'disabilityInfo'])
      )}


      {renderSection('Status', <Activity className="h-4 w-4 text-gray-500" />,
        <>
          {renderField('Status', member.status)}
          {hasValue(member.verificationStatus) && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Verification Status</span>
              <span className="text-sm">{renderStatusBadge(member.verificationStatus)}</span>
            </div>
          )}
        </>,
        hasSectionData(['status', 'verificationStatus'])
      )}
    </div>
  );
};

export default MemberProfile;