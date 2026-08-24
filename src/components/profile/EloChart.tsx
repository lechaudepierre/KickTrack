/**
 * Courbe d'évolution de l'ELO — graphique SVG fait à la main.
 *
 * Était défini À L'INTÉRIEUR du composant `ProfileContent`, donc recréé à
 * chaque rendu du profil : React le voyait comme un composant différent à
 * chaque fois et remontait tout son arbre. Sorti ici, il est stable.
 */

'use client';

import styles from './ProfileContent.module.css';

export const EloChart = ({ data }: { data: Array<{ date: string, elo: number }> }) => {
    if (data.length < 2) return <div className={styles.chartEmpty}>Pas assez de données pour le graphique</div>;

    const width = 300;
    const height = 120;
    const padX = 20;
    const padY = 25;

    const values = data.map(d => d.elo);
    const minElo = Math.min(...values);
    const maxElo = Math.max(...values);

    const range = maxElo - minElo;
    const displayRange = range === 0 ? 40 : range;
    const displayMin = range === 0 ? minElo - 20 : minElo;

    const getX = (i: number) => (i / (data.length - 1)) * (width - 2 * padX) + padX;
    const getY = (val: number) => height - (((val - displayMin) / displayRange) * (height - 2 * padY) + padY);

    const points = data.map((d, i) => `${getX(i)},${getY(d.elo)}`).join(' ');

    return (
        <div className={styles.chartContainer}>
            <div className={styles.chartEloLegend}>
                <span style={{ fontWeight: 'var(--weight-black)' }}>{Math.round(maxElo)}</span>
                <span style={{ fontWeight: 'var(--weight-black)' }}>{Math.round(minElo)}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className={styles.svgChart}>
                {/* Grid lines (min/max) */}
                <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="rgba(51,51,51,0.05)" strokeDasharray="2" />
                <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="rgba(51,51,51,0.05)" strokeDasharray="2" />

                {/* The line */}
                <polyline
                    fill="none"
                    stroke="var(--green-600)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />

                {/* Dots and Labels */}
                {data.map((d, i) => {
                    const x = getX(i);
                    const y = getY(d.elo);
                    const isLast = i === data.length - 1;
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="3" fill="var(--ink-700)" />
                            {isLast && (
                                <g>
                                    <rect x={x - 15} y={y - 20} width="30" height="14" rx="4" fill="var(--ink-700)" />
                                    <text x={x} y={y - 10} fontSize="9" fontWeight="900" textAnchor="middle" fill="white">
                                        {Math.round(d.elo)}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
            <div className={styles.chartLabels}>
                <span style={{ opacity: '0.4', fontWeight: 'var(--weight-black)', textTransform: 'uppercase' }}>{data[0].date}</span>
                <span style={{ fontWeight: 'var(--weight-black)', textTransform: 'uppercase' }}>Progression Elo (20p)</span>
                <span style={{ opacity: '0.4', fontWeight: 'var(--weight-black)', textTransform: 'uppercase' }}>{data[data.length - 1].date}</span>
            </div>
        </div>
    );
};
