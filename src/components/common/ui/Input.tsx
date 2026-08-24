/**
 * Input — étage 2 du design system.
 *
 * Remplace la version en Tailwind, dont la palette slate/emerald était
 * étrangère au reste de l'app.
 *
 * Ne lit QUE des tokens.
 */

import { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, error, hint, type, className = '', id, ...props },
    ref
) {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const isPassword = type === 'password';

    return (
        <div className={styles.field}>
            {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}

            <div className={styles.wrapper}>
                <input
                    ref={ref}
                    id={inputId}
                    type={isPassword && showPassword ? 'text' : type}
                    aria-invalid={error ? true : undefined}
                    className={[
                        styles.input,
                        error ? styles.invalid : '',
                        isPassword ? styles.withToggle : '',
                        className,
                    ].filter(Boolean).join(' ')}
                    {...props}
                />

                {isPassword && (
                    <button type="button"
                        className={styles.toggle}
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {showPassword
                            ? <EyeSlashIcon width={20} height={20} />
                            : <EyeIcon width={20} height={20} />}
                    </button>
                )}
            </div>

            {error ? <span className={styles.error}>{error}</span>
                : hint ? <span className={styles.hint}>{hint}</span>
                    : null}
        </div>
    );
});

export default Input;
