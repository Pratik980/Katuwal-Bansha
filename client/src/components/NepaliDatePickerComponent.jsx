// src/components/NepaliDatePickerComponent.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaCalendar, FaTimes } from 'react-icons/fa';
import { adToBs, bsToAd, NEPALI_MONTHS, getDaysInNepaliMonth, parseDateString, isApproximateBsYear, BS_YEAR_RANGE } from '../utils/nepaliDateConverter';

const pad = (number) => String(number).padStart(2, '0');
const formatParts = ({ year, month, day }) => `${year}-${pad(month)}-${pad(day)}`;
const formatAd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const looksComplete = (text) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test((text || '').trim());

// The value this field holds is always a BS date (YYYY-MM-DD).
// Type it, pick it from the calendar, or switch to AD to enter an English date.
const NepaliDatePickerComponent = ({
  label,
  name,
  value,
  onChange,
  required = false,
  error,
  className = '',
  disabled = false,
  placeholder = 'YYYY-MM-DD (BS)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [calendar, setCalendar] = useState('BS');
  const [viewYear, setViewYear] = useState(2080);
  const [viewMonth, setViewMonth] = useState(1);
  const [yearText, setYearText] = useState(null); // text of the year box while it is being typed in
  const [popupStyle, setPopupStyle] = useState({});
  const pickerRef = useRef(null);
  const inputRef = useRef(null);
  const keepTypedText = useRef(false);

  // Follow the value from outside, but never rewrite what is being typed:
  // "2047-02-1" must stay as typed so that "5" can still follow it.
  useEffect(() => {
    if (keepTypedText.current) {
      keepTypedText.current = false;
      return;
    }
    setInputValue((current) => {
      const typed = parseDateString(current);
      return typed && formatParts(typed) === value ? current : value || '';
    });
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const selected = parseDateString(value);
    const start = selected || adToBs(new Date());
    if (start) {
      setViewYear(start.year);
      setViewMonth(start.month);
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updatePopupPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPopupStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePopupPosition();
      window.addEventListener('scroll', updatePopupPosition, true);
      window.addEventListener('resize', updatePopupPosition);
      return () => {
        window.removeEventListener('scroll', updatePopupPosition, true);
        window.removeEventListener('resize', updatePopupPosition);
      };
    }
  }, [isOpen, updatePopupPosition]);

  const commitBs = (parts) => {
    onChange(name, formatParts(parts));
    setViewYear(parts.year);
    setViewMonth(parts.month);
  };

  // An English date is converted once it is complete, and the field goes back to BS
  const commitAd = (text) => {
    const parsed = parseDateString(text, 'AD');
    if (!parsed) return false;
    const bs = adToBs(new Date(parsed.year, parsed.month - 1, parsed.day));
    setCalendar('BS');
    setInputValue(bs.formatted);
    commitBs(bs);
    return true;
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    if (calendar === 'AD') return;

    const parsed = parseDateString(text);
    if (parsed) commitBs(parsed);
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      onChange(name, '');
      return;
    }
    if (calendar === 'AD') {
      if (!commitAd(inputValue)) {
        setCalendar('BS');
        setInputValue(value || '');
      }
      return;
    }
    const parsed = parseDateString(inputValue);
    if (parsed) {
      setInputValue(formatParts(parsed));
    } else if (inputValue !== value) {
      // Not a real date: leave the text and its warning on screen, and hold no date at all
      keepTypedText.current = !!value;
      onChange(name, '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && calendar === 'AD' && commitAd(inputValue)) {
      e.preventDefault();
    }
  };

  const handleDaySelect = (day) => {
    const parts = { year: viewYear, month: viewMonth, day };
    setCalendar('BS');
    setInputValue(formatParts(parts));
    commitBs(parts);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputValue('');
    onChange(name, '');
  };

  const toggleCalendar = () => {
    setCalendar((current) => (current === 'BS' ? 'AD' : 'BS'));
    setInputValue(calendar === 'BS' ? '' : value || '');
    inputRef.current?.focus();
  };

  const moveView = (months) => {
    const index = viewYear * 12 + (viewMonth - 1) + months;
    const year = Math.floor(index / 12);
    if (year < BS_YEAR_RANGE.min || year > BS_YEAR_RANGE.max) return;
    setViewYear(year);
    setViewMonth((index % 12) + 1);
  };

  // What the entered date is in the other calendar, so a slip is easy to notice
  const hint = (() => {
    const text = (inputValue || '').trim();
    if (!text) return null;

    if (calendar === 'AD') {
      const parsed = parseDateString(text, 'AD');
      if (parsed) return { text: `= BS ${adToBs(new Date(parsed.year, parsed.month - 1, parsed.day)).formatted}` };
      return looksComplete(text) ? { text: 'यो अंग्रेजी मिति मिलेन', invalid: true } : null;
    }

    const parsed = parseDateString(text);
    if (parsed) {
      const approximate = isApproximateBsYear(parsed.year);
      return { text: `= AD ${formatAd(bsToAd(parsed.year, parsed.month, parsed.day))}${approximate ? ' (अनुमानित)' : ''}` };
    }
    if (text === value) return null; // an older record's date, shown as stored
    return looksComplete(text)
      ? { text: 'यो मिति नेपाली पात्रोमा छैन', invalid: true }
      : { text: 'मिति YYYY-MM-DD ढाँचामा लेख्नुहोस्', invalid: !isOpen };
  })();

  const renderCalendar = () => {
    const daysInMonth = getDaysInNepaliMonth(viewYear, viewMonth);
    const firstDayOfMonth = bsToAd(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDayOfMonth ? firstDayOfMonth.getDay() : 0;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = value === `${viewYear}-${pad(viewMonth)}-${pad(d)}`;
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDaySelect(d)}
          className={`w-8 h-8 rounded-full text-xs transition-colors ${isSelected ? 'bg-green-500 text-white' : 'hover:bg-green-100 text-gray-700'}`}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-3">
          <div className="flex">
            <button type="button" onClick={() => moveView(-12)} title="अघिल्लो साल" className="p-1 hover:bg-gray-100 rounded-full text-xs">&laquo;</button>
            <button type="button" onClick={() => moveView(-1)} title="अघिल्लो महिना" className="p-1 hover:bg-gray-100 rounded-full text-xs">&lt;</button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{NEPALI_MONTHS[viewMonth - 1]}</span>
            <input
              type="number"
              value={yearText ?? viewYear}
              onFocus={() => setYearText(String(viewYear))}
              onBlur={() => setYearText(null)}
              min={BS_YEAR_RANGE.min}
              max={BS_YEAR_RANGE.max}
              title="साल"
              onChange={(e) => {
                setYearText(e.target.value);
                const year = parseInt(e.target.value, 10);
                if (year >= BS_YEAR_RANGE.min && year <= BS_YEAR_RANGE.max) setViewYear(year);
              }}
              className="w-16 text-sm font-semibold text-center border border-gray-200 rounded-md py-0.5 focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex">
            <button type="button" onClick={() => moveView(1)} title="अर्को महिना" className="p-1 hover:bg-gray-100 rounded-full text-xs">&gt;</button>
            <button type="button" onClick={() => moveView(12)} title="अर्को साल" className="p-1 hover:bg-gray-100 rounded-full text-xs">&raquo;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'].map(day => (
            <div key={day} className="text-[10px] text-gray-400 font-medium">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <FaCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={calendar === 'AD' ? 'YYYY-MM-DD (AD)' : placeholder}
          className={`w-full pl-10 pr-16 py-2.5 rounded-lg border-2 transition-all duration-200 ${error ? 'border-red-500' : 'border-gray-200'} ${isOpen ? 'border-green-500 shadow-md ring-2 ring-green-200' : 'hover:border-gray-300'} focus:outline-none`}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-gray-100 rounded-full">
              <FaTimes className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleCalendar}
            disabled={disabled}
            title={calendar === 'BS' ? 'अंग्रेजी (AD) मिति टाइप गर्न थिच्नुहोस्' : 'नेपाली (BS) मितिमा फर्कनुहोस्'}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${calendar === 'AD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {calendar}
          </button>
        </div>
      </div>
      {hint && <p className={`mt-1 text-[11px] ${hint.invalid ? 'text-red-500' : 'text-gray-400'}`}>{hint.text}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {isOpen && calendar === 'BS' && (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200" style={popupStyle}>
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default NepaliDatePickerComponent;
