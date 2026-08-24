/**
 * LE CHRONOMÈTRE DES MODES AU TEMPS — chantier 7.10.
 *
 * Affiche le compte à rebours, et c'est l'HÔTE qui applique le coup de sifflet.
 * Les autres appareils ne font que regarder : ils calculent la même seconde à
 * partir des mêmes données, mais n'écrivent rien.
 *
 * Pourquoi l'hôte plutôt que tout le monde : trois téléphones qui voient zéro
 * en même temps déclencheraient trois fins de partie. Les écritures sont
 * transactionnelles et la route de fin est idempotente, donc rien ne casserait
 * — mais on évite d'y compter.
 *
 * Filet de sécurité : si l'hôte a quitté la table, n'importe quel participant
 * prend le relais au bout de quelques secondes. Un match ne doit jamais rester
 * bloqué parce que celui qui a lancé la partie est parti aux toilettes.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/types/game';
import type { ModeTiming } from '@/lib/gamemodes/types';
import {
    remainingSeconds,
    outcomeAtZero,
    formatChrono,
    isCritical,
    type ChronoState,
} from '@/lib/gamemodes/chrono';
import { grantExtraTime, startGoldenGoal, setPaused } from '@/lib/firebase/chrono';
import { toMillis, gameStartMs } from '@/lib/game/dates';
import styles from './ChronoBar.module.css';

/** Délai après lequel un participant supplée l'hôte absent. */
const RELAIS_MS = 4000;


interface ChronoBarProps {
    game: Game;
    timing: ModeTiming;
    isHost: boolean;
    /** Termine la partie. Fourni par la page, qui sait aussi rediriger. */
    onTimeUp: () => void;
}

export default function ChronoBar({ game, timing, isHost, onTimeUp }: ChronoBarProps) {
    const chrono = game.chrono ?? {};
    const goldenGoal = chrono.goldenGoal === true;
    const enPause = !!chrono.pausedAt;

    const state: ChronoState = {
        startedAtMs: gameStartMs(game),
        goalCount: game.goals?.length ?? 0,
        goalCountAtOvertime: chrono.goalCountAtOvertime ?? null,
        extraPeriods: chrono.extraPeriods ?? 0,
        pausedTotalMs: chrono.pausedTotalMs ?? 0,
        pausedAtMs: chrono.pausedAt ? toMillis(chrono.pausedAt) : null,
    };

    const [restant, setRestant] = useState(() => remainingSeconds(state, timing, Date.now(), goldenGoal));
    // Empêche de déclencher deux fois le même coup de sifflet pendant qu'une
    // écriture est en vol.
    const traitement = useRef(false);
    const zeroDepuis = useRef<number | null>(null);

    // Le rendu ne calcule rien à partir de l'horloge : c'est ce battement qui
    // rafraîchit, et lui seul. Un composant qui lirait `Date.now()` pendant le
    // rendu ne serait plus idempotent.
    useEffect(() => {
        const battre = () => setRestant(remainingSeconds(state, timing, Date.now(), goldenGoal));
        battre();
        const id = setInterval(battre, 250);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        state.startedAtMs, state.goalCount, state.goalCountAtOvertime,
        state.extraPeriods, state.pausedTotalMs, state.pausedAtMs, goldenGoal,
        timing.baseSeconds, timing.bonusPerGoal, timing.extraSeconds,
    ]);

    // ─── Le coup de sifflet ──────────────────────────────────────────────────
    useEffect(() => {
        if (goldenGoal || enPause || restant > 0 || traitement.current) {
            if (restant > 0) zeroDepuis.current = null;
            return;
        }

        // L'hôte agit tout de suite ; les autres attendent, au cas où il serait
        // parti. On mémorise depuis quand on voit zéro.
        if (!isHost) {
            if (zeroDepuis.current === null) zeroDepuis.current = Date.now();
            if (Date.now() - zeroDepuis.current < RELAIS_MS) return;
        }

        traitement.current = true;
        const issue = outcomeAtZero(game.score as [number, number], timing);

        const appliquer = async () => {
            try {
                if (issue.kind === 'winner') onTimeUp();
                else if (issue.kind === 'golden-goal') await startGoldenGoal(game.gameId);
                else await grantExtraTime(game.gameId, chrono.extraPeriods ?? 0);
            } catch (err) {
                console.error('[chrono] coup de sifflet impossible', err);
            } finally {
                traitement.current = false;
            }
        };
        void appliquer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restant, goldenGoal, enPause, isHost, game.score?.[0], game.score?.[1]]);

    // ─── Le but en or : le prochain but tranche ──────────────────────────────
    useEffect(() => {
        if (!goldenGoal || !isHost) return;
        if (game.score[0] === game.score[1]) return;
        onTimeUp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goldenGoal, isHost, game.score?.[0], game.score?.[1]]);

    const critique = isCritical(restant);
    const prolongation = (chrono.extraPeriods ?? 0) > 0;

    // ─── Le « +30 s » qui monte, à chaque but ────────────────────────────────
    // Sans lui, on voit le chronomètre REMONTER sans comprendre pourquoi.
    //
    // Aucun état : l'élément porte `key={goalCount}`, donc chaque but le
    // remonte et rejoue son animation. Un `useState` dans un effet aurait
    // provoqué des rendus en cascade, ce que React 19 refuse à juste titre.
    //
    // Le compte au montage sert de repère : après un rafraîchissement en
    // pleine partie, on ne rejoue pas le bonus du but précédent.
    const goalsAuMontage = useRef(state.goalCount);
    const bonusVientDeTomber =
        state.goalCount > goalsAuMontage.current
        // Pas de bonus en prolongation : rien à annoncer non plus.
        && (state.goalCountAtOvertime === null || state.goalCount <= (state.goalCountAtOvertime ?? Infinity));

    return (
        <div className={styles.wrap}>
            {/* Emplacement de hauteur FIXE, qui rogne ce qui dépasse.
                Le bonus y monte sans jamais sortir du tableau de score, et sans
                décaler quoi que ce soit quand il apparaît ou disparaît.
                La version précédente le posait en absolu au-dessus du bloc : il
                débordait par le haut, par-dessus le reste de l'écran. */}
            <span className={styles.bonusSlot} aria-hidden="true">
                {bonusVientDeTomber && (
                    <span key={state.goalCount} className={styles.bonus}>
                        +{timing.bonusPerGoal}s
                    </span>
                )}
            </span>

            <div className={[
                styles.time,
                critique ? styles.critical : '',
                goldenGoal ? styles.golden : '',
                enPause ? styles.paused : '',
            ].filter(Boolean).join(' ')}
                aria-live={critique ? 'polite' : 'off'}
            >
                {goldenGoal ? 'BUT EN OR' : formatChrono(restant)}
            </div>

            {prolongation && !goldenGoal && (
                <span className={styles.tag}>Prolongation {chrono.extraPeriods}</span>
            )}

            {/* Rappelé PENDANT la partie, pas seulement dans la fiche du mode :
                personne ne lit la fiche avant de jouer, et l'apprendre après
                coup est le meilleur moyen de gâcher un match. */}
            {/* Court et sur UNE ligne : la colonne centrale du tableau de score
                est étroite, et « Ne compte pas au classement » s'y cassait en
                trois lignes illisibles. */}
            <span className={styles.unranked}>Hors classement</span>

            {isHost && !goldenGoal && (
                <button type="button"
                    className={styles.pause}
                    onClick={() => setPaused(game.gameId, !enPause)}
                >
                    {enPause ? 'Reprendre' : 'Pause'}
                </button>
            )}
        </div>
    );
}
