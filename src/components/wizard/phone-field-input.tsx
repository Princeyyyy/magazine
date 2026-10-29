"use client";

import React, { useState, useEffect } from "react";
import { type CountryCode } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { EditorialSelect } from "@/components/ui/editorial-select";
import { normalizePhoneToE164 } from "@/config/form";
import { cn } from "@/lib/utils";

interface CountryOption {
  code: CountryCode;
  dial: string;
  label: string;
}

const COUNTRY_OPTIONS: readonly CountryOption[] = [
  { code: "KE", dial: "+254", label: "Kenya (+254)" },
  { code: "UG", dial: "+256", label: "Uganda (+256)" },
  { code: "TZ", dial: "+255", label: "Tanzania (+255)" },
  { code: "RW", dial: "+250", label: "Rwanda (+250)" },
  { code: "ZA", dial: "+27", label: "South Africa (+27)" },
  { code: "NG", dial: "+234", label: "Nigeria (+234)" },
  { code: "GH", dial: "+233", label: "Ghana (+233)" },
  { code: "GB", dial: "+44", label: "United Kingdom (+44)" },
  { code: "US", dial: "+1", label: "United States (+1)" },
  { code: "CA", dial: "+1", label: "Canada (+1)" },
  { code: "AE", dial: "+971", label: "UAE (+971)" },
  { code: "AU", dial: "+61", label: "Australia (+61)" },
];

const SELECT_COUNTRY_OPTIONS = COUNTRY_OPTIONS.map((c) => ({
  value: c.code,
  label: c.label,
}));

interface PhoneFieldInputProps {
  id: string;
  value: string;
  defaultCountry: CountryCode;
  placeholder?: string;
  onChange: (nextValue: string) => void;
  onBlur: () => void;
  hasError?: boolean;
}

export function PhoneFieldInput({
  id,
  value,
  defaultCountry = "KE",
  placeholder,
  onChange,
  onBlur,
  hasError,
}: PhoneFieldInputProps) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [localInput, setLocalInput] = useState(value || "");

  useEffect(() => {
    if (value && value !== localInput) {
      setLocalInput(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleInputChange = (raw: string) => {
    setLocalInput(raw);
    const norm = normalizePhoneToE164(raw, country);
    if (norm.valid) {
      onChange(norm.e164);
    } else {
      onChange(raw);
    }
  };

  const handleCountryChange = (nextCountry: CountryCode) => {
    setCountry(nextCountry);
    if (localInput.trim()) {
      const norm = normalizePhoneToE164(localInput, nextCountry);
      if (norm.valid) {
        onChange(norm.e164);
      }
    }
  };

  const handleFieldBlur = () => {
    const norm = normalizePhoneToE164(localInput, country);
    if (norm.valid) {
      setLocalInput(norm.e164);
      onChange(norm.e164);
    }
    onBlur();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <EditorialSelect
        ariaLabel="Country code"
        value={country}
        options={SELECT_COUNTRY_OPTIONS}
        onChange={(val) => handleCountryChange(val as CountryCode)}
        className="sm:w-56"
        triggerClassName="h-11"
      />

      <Input
        id={id}
        type="tel"
        value={localInput}
        placeholder={placeholder || "712 345 678"}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleFieldBlur}
        className={cn("flex-1", hasError ? "border-[#B91C1C]" : undefined)}
      />
    </div>
  );
}
