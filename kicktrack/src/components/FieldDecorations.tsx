import styles from './FieldDecorations.module.css';

export function FieldLines() {
    return (
        <div className="field-lines">
            {/* Horizontal center line */}
            <div className="field-line h-1 w-full top-1/2 left-0" />

            {/* Vertical lines */}
            <div className="field-line w-1 h-full top-0 left-1/4" />
            <div className="field-line w-1 h-full top-0 left-1/2" />
            <div className="field-line w-1 h-full top-0 left-3/4" />

            {/* Diagonal lines */}
            <div
                className="field-line h-1"
                style={{
                    width: '141%',
                    top: '25%',
                    left: '-20%',
                    transform: 'rotate(45deg)',
                    transformOrigin: 'center'
                }}
            />
            <div
                className="field-line h-1"
                style={{
                    width: '141%',
                    top: '75%',
                    left: '-20%',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center'
                }}
            />

            {/* Center circle */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/10"
                style={{ width: '300px', height: '300px' }}
            />

            {/* Corner arcs */}
            <div
                className="absolute -top-12 -left-12 rounded-full border-4 border-white/10"
                style={{ width: '100px', height: '100px' }}
            />
            <div
                className="absolute -top-12 -right-12 rounded-full border-4 border-white/10"
                style={{ width: '100px', height: '100px' }}
            />
            <div
                className="absolute -bottom-12 -left-12 rounded-full border-4 border-white/10"
                style={{ width: '100px', height: '100px' }}
            />
            <div
                className="absolute -bottom-12 -right-12 rounded-full border-4 border-white/10"
                style={{ width: '100px', height: '100px' }}
            />
        </div>
    );
}

export function FieldBackground() {
    return (
        <div className={styles.fieldBackground}>
            {/* Geometric green accent */}
            <div className={styles.geometricAccentTop} />

            {/* Bottom left accent */}
            <div className={styles.geometricAccentBottom} />

            {/* Subtle field lines */}
            <FieldLines />
        </div>
    );
}
