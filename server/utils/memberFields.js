// utils/memberFields.js
// Groups of Member fields that several parts of the server treat alike.

// Uploaded files: field name on the form -> where the link is stored on the member
export const PHOTO_FIELDS = [
  'photo',
  'citizenshipFront',
  'citizenshipBack',
  'nationalIdFront',
  'passportPhoto',
  'drivingLicensePhoto',
];
export const DOCUMENT_FIELDS = ['birthCertificate', 'marriageCertificate', 'deathCertificate', 'panCard', 'voterId'];
export const FILE_FIELDS = [...PHOTO_FIELDS, ...DOCUMENT_FIELDS];

// Dates typed in BS on the form (besides the date of birth, which has its own handling).
// Each is stored twice: the AD date in the field itself and the BS text in `<field>Nepali`.
export const BS_DATE_FIELDS = [
  'dod',
  'wifeDob',
  'husbandDob',
  'citizenshipIssueDate',
  'nationalIdIssueDate',
  'passportIssueDate',
  'passportExpiryDate',
  'drivingLicenseIssueDate',
  'drivingLicenseExpiryDate',
];

// Links to other members that the edit form can clear
export const RELATION_FIELDS = ['father', 'mother', 'grandfather', 'grandmother', 'guardian', 'spouse'];
