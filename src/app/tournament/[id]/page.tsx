'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    subscribeToTournament,
    addGuestToTournament,
    removePlayerFromTournament,
    startTeamSetup,
    startTournament,
    cancelTournament,
    createTeam,
    deleteTeam
} from '@/lib/firebase/tournaments';
import { Tournament, Player } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    UserPlusIcon,
    TrashIcon,
    PlayIcon,
    XMarkIcon,
    ClipboardDocumentIcon,
    CheckCircleIcon,
    ClockIcon,
    UsersIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { PageHeader } from '@/components/common/ui';
import s from './page.module.css';

/**
 * Dégradés d'avatar d'équipe.
 *
 * Ce sont des couleurs DÉCORATIVES : elles servent uniquement à distinguer les
 * équipes les unes des autres dans un tournoi. Elles ne participent pas à la
 * palette d'interface et n'ont pas à s'y accorder — d'où des valeurs littérales
 * plutôt que des tokens.
 */
const TEAM_AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #E74C3C, #C0392B)',
    'linear-gradient(135deg, #3498DB, #2980B9)',
    'linear-gradient(135deg, #2ECC71, #27AE60)',
    'linear-gradient(135deg, #9B59B6, #8E44AD)',
    'linear-gradient(135deg, #F39C12, #D68910)',
    'linear-gradient(135deg, #1ABC9C, #16A085)',
    'linear-gradient(135deg, #E91E63, #C2185B)',
    'linear-gradient(135deg, #00BCD4, #0097A7)',
];

export default function TournamentLobbyPage() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;
    const { user, initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [copied, setCopied] = useState(false);

    // Team creation state
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!tournamentId) return;

        const unsubscribe = subscribeToTournament(tournamentId, (updatedTournament) => {
            if (!updatedTournament) {
                router.push('/dashboard');
                return;
            }

            setTournament(updatedTournament);
            setIsLoading(false);

            // Redirect based on status
            if (updatedTournament.status === 'in_progress') {
                router.push(`/tournament/${tournamentId}/live`);
            } else if (updatedTournament.status === 'completed') {
                router.push(`/tournament/${tournamentId}/results`);
            }
        });

        return () => unsubscribe();
    }, [tournamentId, router]);

    const isHost = user?.userId === tournament?.hostId;

    const handleCopyCode = async () => {
        if (tournament?.pinCode) {
            await navigator.clipboard.writeText(tournament.pinCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAddGuest = async () => {
        if (!guestName.trim()) return;

        setIsAddingGuest(true);
        try {
            await addGuestToTournament(tournamentId, guestName.trim());
            setGuestName('');
            setShowGuestModal(false);
        } catch (err) {
            console.error('Error adding guest:', err);
            setError('Erreur lors de l\'ajout du guest');
        } finally {
            setIsAddingGuest(false);
        }
    };

    const handleRemovePlayer = async (playerId: string) => {
        try {
            await removePlayerFromTournament(tournamentId, playerId);
        } catch (err) {
            console.error('Error removing player:', err);
            setError('Erreur lors du retrait du joueur');
        }
    };

    const handleStartTeamSetup = async () => {
        try {
            await startTeamSetup(tournamentId);
        } catch (err) {
            console.error('Error starting team setup:', err);
            setError('Erreur lors du demarrage');
        }
    };


    const handleStartTournament = async () => {
        try {
            await startTournament(tournamentId);
        } catch (err) {
            console.error('Error starting tournament:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du demarrage';
            setError(errorMessage);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelTournament(tournamentId);
            router.push('/dashboard');
        } catch (err) {
            console.error('Error cancelling tournament:', err);
            setError('Erreur lors de l\'annulation');
        }
    };

    const handleLeave = () => {
        if (user && tournament) {
            removePlayerFromTournament(tournamentId, user.userId);
        }
        router.push('/dashboard');
    };

    // Team creation functions
    const togglePlayerSelection = (playerId: string) => {
        if (!tournament) return;

        const playersPerTeam = tournament.format === '1v1' ? 1 : 2;

        if (selectedPlayers.includes(playerId)) {
            setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
        } else if (selectedPlayers.length < playersPerTeam) {
            setSelectedPlayers([...selectedPlayers, playerId]);
        }
    };

    const handleCreateTeam = async () => {
        if (!tournament || selectedPlayers.length === 0) return;

        const playersPerTeam = tournament.format === '1v1' ? 1 : 2;
        if (selectedPlayers.length !== playersPerTeam) {
            setError(`Selectionnez ${playersPerTeam} joueur${playersPerTeam > 1 ? 's' : ''} pour l'equipe`);
            return;
        }

        setIsCreatingTeam(true);
        try {
            const defaultName = teamName.trim() || `Equipe ${tournament.teams.length + 1}`;
            await createTeam(tournamentId, defaultName, selectedPlayers);
            setTeamName('');
            setSelectedPlayers([]);
            setShowTeamModal(false);
        } catch (err) {
            console.error('Error creating team:', err);
            setError('Erreur lors de la creation de l\'equipe');
        } finally {
            setIsCreatingTeam(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        try {
            await deleteTeam(tournamentId, teamId);
        } catch (err) {
            console.error('Error deleting team:', err);
            setError('Erreur lors de la suppression de l\'equipe');
        }
    };

    const getUnassignedPlayers = (): Player[] => {
        if (!tournament) return [];
        return tournament.players.filter(p =>
            !tournament.teams.some(t => t.players.some(tp => tp.userId === p.userId))
        );
    };

    if (isLoading || !tournament) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    const minPlayers = tournament.format === '1v1' ? 2 : 4;
    const canStartSetup = tournament.players.length >= minPlayers;
    const canStartTournament = tournament.teams.length >= 2;
    const unassignedPlayers = getUnassignedPlayers();
    const playersPerTeam = tournament.format === '1v1' ? 1 : 2;

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <PageHeader title={tournament.status === 'waiting' ? 'Lobby' : 'Equipes'} back={'/dashboard'} />

                {error && (
                    <div className={`error-box ${s.errorBox}`}>
                        {error}
                        <button onClick={() => setError('')} className={s.errorClose}>
                            <XMarkIcon width={16} height={16} />
                        </button>
                    </div>
                )}

                {/* Code PIN et format */}
                <div className={s.infoCard}>
                    <p className={s.infoLabel}>Code PIN</p>
                    <div className={s.pinRow}>
                        <span className={s.pinCode}>{tournament.pinCode}</span>
                        <button onClick={handleCopyCode} className={`${s.iconButton} ${s.iconButtonMuted}`}>
                            {copied ? (
                                <CheckCircleIcon width={20} height={20} className={s.iconSuccess} />
                            ) : (
                                <ClipboardDocumentIcon width={20} height={20} className={s.iconDark} />
                            )}
                        </button>
                    </div>
                    <div className={s.infoMeta}>
                        {tournament.mode === 'round_robin' ? 'Tous contre tous' : 'Éliminatoire'} · {tournament.format}
                    </div>
                </div>

                {/* ─── Phase d'attente : qui est là ─────────────────────────── */}
                {tournament.status === 'waiting' && (
                    <>
                        <div className={s.section}>
                            <div className={s.sectionHead}>
                                <span className={s.sectionTitle}>Joueurs</span>
                                <span className={s.sectionCount}>
                                    {tournament.players.length}/{tournament.maxTeams * (tournament.format === '1v1' ? 1 : 2)}
                                </span>
                            </div>

                            <div className={s.stack}>
                                {tournament.players.map((player) => {
                                    const estMoi = player.userId === user?.userId;
                                    const estInvite = player.userId.startsWith('guest_');
                                    return (
                                        <div key={player.userId} className={`${s.card} ${estMoi ? s.cardSelf : ''}`}>
                                            <div className={`${s.avatar} ${estInvite ? s.avatarGuest : ''}`}>
                                                {player.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={s.nameColumn}>
                                                <p className={`${s.name} ${s.nameUpper}`}>
                                                    {player.username}
                                                    {estMoi && <span className={`${s.tag} ${s.tagSelf}`}>(vous)</span>}
                                                    {player.userId === tournament.hostId && (
                                                        <span className={`${s.tag} ${s.tagHost}`}>(hote)</span>
                                                    )}
                                                    {estInvite && <span className={`${s.tag} ${s.tagGuest}`}>(guest)</span>}
                                                </p>
                                            </div>
                                            {isHost && player.userId !== tournament.hostId && (
                                                <button
                                                    onClick={() => handleRemovePlayer(player.userId)}
                                                    className={`${s.iconButton} ${s.iconButtonDanger}`}
                                                >
                                                    <TrashIcon width={16} height={16} className={s.iconDanger} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {isHost && (
                            <div className={s.actions}>
                                <button onClick={() => setShowGuestModal(true)} className={s.actionButton}>
                                    <UserPlusIcon width={20} height={20} />
                                    Ajouter un guest
                                </button>

                                <button
                                    onClick={handleStartTeamSetup}
                                    disabled={!canStartSetup}
                                    className={`${s.actionButton} ${s.actionButtonPrimary}`}
                                >
                                    <UsersIcon width={20} height={20} />
                                    {tournament.format === '1v1' ? 'Continuer' : 'Former les equipes'}
                                </button>

                                {!canStartSetup && (
                                    <p className={s.hint}>Minimum {minPlayers} joueurs requis</p>
                                )}

                                <button onClick={handleCancel} className={s.linkDanger}>
                                    Annuler le tournoi
                                </button>
                            </div>
                        )}

                        {!isHost && (
                            <div className={s.waitBlock}>
                                <div className={`${s.waitNotice} ${s.waitNoticeSpaced}`}>
                                    <ClockIcon width={20} height={20} />
                                    <span>En attente de l&apos;organisateur...</span>
                                </div>
                                <button onClick={handleLeave} className={s.linkDanger}>
                                    Quitter le tournoi
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ─── Phase de formation des équipes ───────────────────────── */}
                {tournament.status === 'team_setup' && (
                    <>
                        {tournament.format === '1v1' ? (
                            <>
                                {/* En 1v1 une équipe est un joueur : rien à former. */}
                                <div className={s.section}>
                                    <div className={s.sectionHead}>
                                        <span className={s.sectionTitle}>Participants</span>
                                        <span className={s.sectionCount}>
                                            {tournament.teams.length} joueur{tournament.teams.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div className={s.stack}>
                                        {tournament.teams.map((team) => {
                                            const estInvite = !!team.players[0]?.userId.startsWith('guest_');
                                            return (
                                                <div key={team.teamId} className={s.card}>
                                                    <div className={`${s.avatar} ${estInvite ? s.avatarGuest : ''}`}>
                                                        {team.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className={s.nameColumn}>
                                                        <p className={s.name}>
                                                            {team.name}
                                                            {estInvite && <span className={`${s.tag} ${s.tagGuest}`}>(guest)</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isHost && (
                                    <div className={s.actions}>
                                        <button
                                            onClick={handleStartTournament}
                                            disabled={!canStartTournament}
                                            className={`${s.actionButton} ${s.actionButtonPrimary}`}
                                        >
                                            <PlayIcon width={20} height={20} />
                                            Demarrer le tournoi
                                        </button>
                                        {!canStartTournament && (
                                            <p className={s.hint}>Minimum 2 joueurs requis</p>
                                        )}
                                    </div>
                                )}

                                {!isHost && (
                                    <div className={s.waitBlock}>
                                        <div className={s.waitNotice}>
                                            <ClockIcon width={20} height={20} />
                                            <span>En attente du demarrage...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={s.section}>
                                    <div className={s.sectionHead}>
                                        <span className={s.sectionTitle}>Equipes formees</span>
                                        <span className={s.sectionCount}>
                                            {tournament.teams.length} equipe{tournament.teams.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {tournament.teams.length === 0 ? (
                                        <div className={s.emptyBox}>Aucune equipe formee</div>
                                    ) : (
                                        <div className={s.stack}>
                                            {tournament.teams.map((team, index) => (
                                                <div key={team.teamId} className={s.card}>
                                                    <div
                                                        className={`${s.avatar} ${s.avatarTeam}`}
                                                        style={{ '--team-gradient': TEAM_AVATAR_GRADIENTS[index % TEAM_AVATAR_GRADIENTS.length] } as CSSProperties}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                    <div className={s.nameColumn}>
                                                        <p className={`${s.name} ${s.teamName}`}>{team.name}</p>
                                                        <div className={s.chips}>
                                                            {team.players.map(player => (
                                                                <span
                                                                    key={player.userId}
                                                                    className={`${s.chip} ${player.userId.startsWith('guest_') ? s.chipGuest : ''}`}
                                                                >
                                                                    {player.username}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {isHost && (
                                                        <button
                                                            onClick={() => handleDeleteTeam(team.teamId)}
                                                            className={`${s.iconButton} ${s.iconButtonDanger}`}
                                                        >
                                                            <TrashIcon width={16} height={16} className={s.iconDanger} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {unassignedPlayers.length > 0 && (
                                    <div className={s.section}>
                                        <p className={s.slotLabel}>
                                            Joueurs non assignes ({unassignedPlayers.length})
                                        </p>
                                        <div className={s.slotGrid}>
                                            {unassignedPlayers.map(player => (
                                                <div key={player.userId} className={s.slot}>
                                                    <div
                                                        className={`${s.avatar} ${s.slotAvatar} ${player.userId.startsWith('guest_') ? s.slotAvatarGuest : ''}`}
                                                    >
                                                        {player.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className={s.slotName}>{player.username}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {isHost && (
                                    <div className={s.actions}>
                                        {unassignedPlayers.length >= playersPerTeam && (
                                            <button
                                                onClick={() => {
                                                    setSelectedPlayers([]);
                                                    setTeamName('');
                                                    setShowTeamModal(true);
                                                }}
                                                className={s.actionButton}
                                            >
                                                <PlusIcon width={20} height={20} />
                                                Creer une equipe
                                            </button>
                                        )}

                                        <button
                                            onClick={handleStartTournament}
                                            disabled={!canStartTournament}
                                            className={`${s.actionButton} ${s.actionButtonPrimary}`}
                                        >
                                            <PlayIcon width={20} height={20} />
                                            Demarrer le tournoi
                                        </button>

                                        {!canStartTournament && (
                                            <p className={s.hint}>Minimum 2 equipes requises</p>
                                        )}
                                    </div>
                                )}

                                {!isHost && (
                                    <div className={s.waitBlock}>
                                        <div className={s.waitNotice}>
                                            <ClockIcon width={20} height={20} />
                                            <span>L&apos;organisateur forme les equipes...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ─── Modale : ajouter un invité ───────────────────────────────── */}
            {showGuestModal && (
                <div className={s.overlay}>
                    <div className={`${s.modal} ${s.modalNarrow}`}>
                        <h3 className={s.modalTitle}>Ajouter un guest</h3>

                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Nom du joueur"
                            maxLength={20}
                            className={s.modalInput}
                        />

                        <div className={s.modalActions}>
                            <button
                                onClick={() => {
                                    setShowGuestModal(false);
                                    setGuestName('');
                                }}
                                className={`${s.modalButton} ${s.modalButtonGhost}`}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddGuest}
                                disabled={!guestName.trim() || isAddingGuest}
                                className={`${s.modalButton} ${s.modalButtonPrimary}`}
                            >
                                {isAddingGuest ? '...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modale : créer une équipe ────────────────────────────────── */}
            {showTeamModal && (
                <div className={s.overlay}>
                    <div className={`${s.modal} ${s.modalWide}`}>
                        <h3 className={s.modalTitle}>Creer une equipe</h3>

                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder={`Equipe ${tournament.teams.length + 1}`}
                            maxLength={20}
                            className={s.modalInput}
                        />

                        <p className={s.modalHint}>
                            Selectionnez {playersPerTeam} joueur{playersPerTeam > 1 ? 's' : ''} ({selectedPlayers.length}/{playersPerTeam})
                        </p>

                        <div className={s.pickList}>
                            {unassignedPlayers.map(player => {
                                const isSelected = selectedPlayers.includes(player.userId);
                                const estInvite = player.userId.startsWith('guest_');
                                return (
                                    <button
                                        key={player.userId}
                                        onClick={() => togglePlayerSelection(player.userId)}
                                        className={`${s.pickRow} ${isSelected ? s.pickRowSelected : ''}`}
                                    >
                                        <div
                                            className={`${s.avatar} ${s.pickAvatar} ${estInvite ? s.slotAvatarGuest : ''} ${isSelected && !estInvite ? s.pickAvatarSelected : ''}`}
                                        >
                                            {isSelected ? (
                                                <CheckCircleIcon width={20} height={20} />
                                            ) : (
                                                player.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <span className={`${s.pickName} ${isSelected ? s.pickNameSelected : ''}`}>
                                            {player.username}
                                            {estInvite && <span className={s.pickTag}>(guest)</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className={s.modalActions}>
                            <button
                                onClick={() => {
                                    setShowTeamModal(false);
                                    setSelectedPlayers([]);
                                    setTeamName('');
                                }}
                                className={`${s.modalButton} ${s.modalButtonGhost}`}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateTeam}
                                disabled={selectedPlayers.length !== playersPerTeam || isCreatingTeam}
                                className={`${s.modalButton} ${s.modalButtonPrimary}`}
                            >
                                {isCreatingTeam ? '...' : 'Creer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
