import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";

type FieldMessageProps = {
  hint?: string;
  error?: string;
};

type FieldProps = InputHTMLAttributes<HTMLInputElement> & FieldMessageProps & {
  label: string;
};

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMessageProps & {
  label: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & FieldMessageProps & {
  label: string;
};

function FieldMessage({ id, hint, error }: FieldMessageProps & { id: string }) {
  if (!hint && !error) return null;
  return <span id={id} className={error ? "haven-field__error" : "haven-field__hint"}>{error ?? hint}</span>;
}

export function Field({ label, hint, error, id, className = "", ...props }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const messageId = `${controlId}-message`;
  return (
    <label className={`haven-field ${className}`.trim()} htmlFor={controlId}>
      <span className="haven-field__label">{label}</span>
      <input
        id={controlId}
        className="haven-field__control"
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </label>
  );
}

export function TextAreaField({ label, hint, error, id, className = "", ...props }: TextAreaFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const messageId = `${controlId}-message`;
  return (
    <label className={`haven-field ${className}`.trim()} htmlFor={controlId}>
      <span className="haven-field__label">{label}</span>
      <textarea
        id={controlId}
        className="haven-field__control haven-field__textarea"
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </label>
  );
}

export function SelectField({ label, hint, error, id, className = "", children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const messageId = `${controlId}-message`;
  return (
    <label className={`haven-field ${className}`.trim()} htmlFor={controlId}>
      <span className="haven-field__label">{label}</span>
      <select
        id={controlId}
        className="haven-field__control haven-field__select"
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? messageId : undefined}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </label>
  );
}
