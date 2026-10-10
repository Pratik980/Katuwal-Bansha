import React, { useMemo } from "react";
import Select from "react-select";
import { FaLocationDot } from "react-icons/fa6";
import {
  provinces,
  districts,
  municipalities,
} from "../data/nepalLocations";

const LocationSelect = ({
  value,
  onChange,
  label,
  type,
  province,
  district,
  required = false,
  placeholder = "Select...",
}) => {
 
  const wards = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        value: String(i + 1),
        label: `Ward ${i + 1}`,
      })),
    []
  );

  
  const options = useMemo(() => {
    switch (type) {
      case "province":
        return provinces.map((p) => ({
          value: p,
          label: p,
        }));

      case "district":
        return province
          ? (districts[province] || []).map((d) => ({
              value: d,
              label: d,
            }))
          : [];

      case "municipality":
        return district
          ? (municipalities[district] || []).map((m) => ({
              value: m,
              label: m,
            }))
          : [];

      case "ward":
        return wards;

      default:
        return [];
    }
  }, [type, province, district, wards]);

  const selectedOption =
    options.find((option) => option.value === value) || null;

  return (
    <div className="w-full">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
        <FaLocationDot className="text-blue-600" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      <Select
        options={options}
        value={selectedOption}
        onChange={(selected) => onChange(type, selected?.value || "")}
        placeholder={placeholder}
        isSearchable
        isClearable
        isDisabled={
          (type === "district" && !province) ||
          (type === "municipality" && !district)
        }
        noOptionsMessage={() => "No options available"}
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: "44px",
            borderRadius: "8px",
            borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
            boxShadow: state.isFocused
              ? "0 0 0 3px rgba(37,99,235,0.15)"
              : "none",
            "&:hover": {
              borderColor: "#2563eb",
            },
          }),

          valueContainer: (base) => ({
            ...base,
            padding: "2px 10px",
          }),

          placeholder: (base) => ({
            ...base,
            color: "#9ca3af",
          }),

          menu: (base) => ({
            ...base,
            zIndex: 9999,
          }),

          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? "#2563eb"
              : state.isFocused
              ? "#dbeafe"
              : "#fff",
            color: state.isSelected ? "#fff" : "#111827",
            cursor: "pointer",
          }),

          singleValue: (base) => ({
            ...base,
            color: "#111827",
          }),
        }}
      />
    </div>
  );
};

export default LocationSelect;