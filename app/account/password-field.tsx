"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
};

export function PasswordField({ name, label, autoComplete, minLength }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-1 flex h-10 overflow-hidden rounded-md border border-line bg-white focus-within:border-pitch">
        <input
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          className="min-w-0 flex-1 px-3 outline-none"
          required
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="inline-flex w-10 shrink-0 items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-ink"
          title={isVisible ? "Ocultar contraseña" : "Ver contraseña"}
          aria-label={isVisible ? "Ocultar contraseña" : "Ver contraseña"}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}
