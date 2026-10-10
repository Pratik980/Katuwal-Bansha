import React, { useState, forwardRef } from 'react';
import { FaRegUser, FaEnvelope, FaPhone, FaCalendar, FaMapPin, FaIdCard, FaBriefcase, FaGraduationCap, FaHeartbeat, FaTransgender } from 'react-icons/fa';
import { PiGenderIntersexBold } from 'react-icons/pi';

const iconMap = {
  name: FaRegUser,
  email: FaEnvelope,
  phone: FaPhone,
  alternatePhone: FaPhone,
  dob: FaCalendar,
  placeOfBirth: FaMapPin,
  bloodGroup: FaHeartbeat,
  gender: PiGenderIntersexBold,
  occupation: FaBriefcase,
  education: FaGraduationCap,
  citizenshipNumber: FaIdCard,
  nationalIdNumber: FaIdCard,
  passportNumber: FaIdCard,
  drivingLicenseNumber: FaIdCard,
  houseNumber: FaMapPin,
  wardNumber: FaMapPin,
  toleVillage: FaMapPin,
};

const FloatingInput = forwardRef(({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  icon,
  className = '',
  disabled = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const Icon = icon || iconMap[name] || null;

  const hasValue = value && value.toString().length > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`
            w-full px-3 py-3 rounded-lg border-2 transition-all duration-200
            ${Icon ? 'pl-9' : 'pl-3'}
            ${isFocused || hasValue ? 'pt-5' : 'pt-3'}
            ${isFocused ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-gray-200'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            hover:border-gray-300
            focus:outline-none
            placeholder-transparent
          `}
          placeholder={placeholder || label}
          {...props}
        />
        <label
          className={`
            absolute left-3 transition-all duration-200 pointer-events-none
            ${Icon ? 'left-9' : 'left-3'}
            ${isFocused || hasValue ? 'text-xs top-1 text-primary' : 'text-sm top-3 text-gray-500'}
            ${disabled ? 'text-gray-400' : ''}
          `}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
    </div>
  );
});

FloatingInput.displayName = 'FloatingInput';

export default FloatingInput;