import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaChevronDown, FaTimes } from 'react-icons/fa';

const SearchableSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Search...',
  required = false,
  icon: Icon,
  creatable = false,
  className = '',
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);


  const getSelectedLabel = () => {
    if (!value) return '';
    
  
    const searchValue = typeof value === 'object' && value !== null 
      ? (value._id || value.value || String(value))
      : String(value);
    
    const option = options.find(opt => String(opt.value) === searchValue);
    return option?.label || searchValue || '';
  };

  const displayValue = getSelectedLabel();

  useEffect(() => {

    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  useEffect(() => {
  
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    setIsOpen(false);
    setSearchTerm('');
    
   
    if (onChange) {
      onChange(name, option.value);
    }
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && creatable && searchTerm.trim()) {
      
      const newOption = { value: searchTerm.trim(), label: searchTerm.trim() };
      if (onChange) {
        onChange(name, newOption.value);
      }
      setIsOpen(false);
      setSearchTerm('');
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange(name, '');
    }
    setSearchTerm('');
  };

 
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen && inputRef.current) {
       
        setTimeout(() => {
          const searchInput = dropdownRef.current?.querySelector('input');
          if (searchInput) searchInput.focus();
        }, 50);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div
          className={`
            w-full px-3 py-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer
            ${Icon ? 'pl-9' : 'pl-3'}
            ${isOpen ? 'border-green-500 shadow-md ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'}
            ${error ? 'border-red-500 ring-2 ring-red-200' : ''}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          `}
          onClick={handleToggle}
          ref={inputRef}
        >
          <div className="flex items-center justify-between">
            <span className={`truncate ${displayValue ? 'text-gray-800' : 'text-gray-400'}`}>
              {displayValue || placeholder}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {displayValue && !disabled && (
                <button
                  onClick={clearSelection}
                  className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                  type="button"
                >
                  <FaTimes className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <FaChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-60 overflow-hidden">
          
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={String(option.value)}
                    className={`
                      px-3 py-2 text-sm cursor-pointer hover:bg-green-50 transition-colors
                      ${String(value) === String(option.value) ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-700'}
                    `}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </div>
                ))
              ) : creatable && searchTerm.trim() ? (
                <div
                  className="px-3 py-2 text-sm text-green-600 cursor-pointer hover:bg-green-50 transition-colors flex items-center gap-2"
                  onClick={() => {
                    const newOption = { value: searchTerm.trim(), label: searchTerm.trim() };
                    if (onChange) {
                      onChange(name, newOption.value);
                    }
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span>Create "{searchTerm}"</span>
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default SearchableSelect;