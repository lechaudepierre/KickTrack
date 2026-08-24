'use client';

import { useState, useEffect } from 'react';
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
                {/* Header */}
                <PageHeader title={tournament.status === 'waiting' ? 'Lobby' : 'Equipes'} back={'/dashboard'} />

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                        <button onClick={() => setError('')} style={{ marginLeft: '8px' }}>
                            <XMarkIcon width={16} height={16} />
                        </button>
                    </div>
                )}

                {/* Tournament Info */}
                <div style={{
                    background: 'var(--color-surface)',
                    border: '3px solid var(--ink-700)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.7)', marginBottom: '4px' }}>
                        Code PIN
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em',
                            color: 'var(--ink-700)'
                        }}>
                            {tournament.pinCode}
                        </span>
                        <button onClick={handleCopyCode}
                            style={{
                                padding: '8px',
                                background: 'rgba(51,51,51,0.1)',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {copied ? (
                                <CheckCircleIcon width={20} height={20} style={{ color: 'var(--team-green)' }} />
                            ) : (
                                <ClipboardDocumentIcon width={20} height={20} style={{ color: 'var(--ink-700)' }} />
                            )}
                        </button>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)' }}>
                        {tournament.mode === 'round_robin' ? 'Tous contre tous' : 'Éliminatoire'} · {tournament.format}
                    </div>
                </div>

                {/* Status: Waiting - Show player list */}
                {tournament.status === 'waiting' && (
                    <>
                        {/* Player List */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 'var(--spacing-sm)'
                            }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', opacity: 0.6, fontWeight: 600 }}>
                                    Joueurs
                                </span>
                                <span style={{ fontSize: '0.875rem', color: 'var(--team-green)', fontWeight: 700 }}>
                                    {tournament.players.length}/{tournament.maxTeams * (tournament.format === '1v1' ? 1 : 2)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {tournament.players.map((player) => (
                                    <div key={player.userId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: player.userId === user?.userId ? 'var(--team-green-tint)' : 'var(--color-surface)',
                                            border: `3px solid ${player.userId === user?.userId ? 'var(--team-green)' : 'var(--ink-700)'}`,
                                            borderRadius: 'var(--radius-md)'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            background: player.userId.startsWith('guest_') ? 'linear-gradient(to bottom right, var(--color-accent), var(--team-orange))' : 'linear-gradient(to bottom right, var(--team-green), var(--team-green))',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--ink-700)',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            border: '2px solid var(--ink-700)'
                                        }}>
                                            {player.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{
                                                fontWeight: 700,
                                                color: 'var(--color-text-dark)',
                                                textTransform: 'uppercase',
                                                fontSize: '0.875rem'
                                            }}>
                                                {player.username}
                                                {player.userId === user?.userId && (
                                                    <span style={{ color: 'var(--team-green)', fontSize: '0.75rem', marginLeft: '8px' }}>(vous)</span>
                                                )}
                                                {player.userId === tournament.hostId && (
                                                    <span style={{ color: 'var(--team-orange)', fontSize: '0.75rem', marginLeft: '8px' }}>(hote)</span>
                                                )}
                                                {player.userId.startsWith('guest_') && (
                                                    <span style={{ color: 'var(--team-purple)', fontSize: '0.75rem', marginLeft: '8px' }}>(guest)</span>
                                                )}
                                            </p>
                                        </div>
                                        {isHost && player.userId !== tournament.hostId && (
                                            <button onClick={() => handleRemovePlayer(player.userId)}
                                                style={{
                                                    padding: '8px',
                                                    background: 'rgba(231, 76, 60, 0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <TrashIcon width={16} height={16} style={{ color: 'var(--color-danger)' }} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Host Actions */}
                        {isHost && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                <button onClick={() => setShowGuestModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--color-surface)',
                                        border: '3px solid var(--ink-700)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-text-dark)',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <UserPlusIcon width={20} height={20} />
                                    Ajouter un guest
                                </button>

                                <button onClick={handleStartTeamSetup}
                                    disabled={!canStartSetup}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: 'var(--spacing-md)',
                                        background: canStartSetup ? 'var(--team-green)' : 'rgba(46, 204, 113, 0.3)',
                                        border: '3px solid var(--ink-700)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: canStartSetup ? 'pointer' : 'not-allowed',
                                        opacity: canStartSetup ? 1 : 0.5
                                    }}
                                >
                                    <UsersIcon width={20} height={20} />
                                    {tournament.format === '1v1' ? 'Continuer' : 'Former les equipes'}
                                </button>

                                {!canStartSetup && (
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)', textAlign: 'center' }}>
                                        Minimum {minPlayers} joueurs requis
                                    </p>
                                )}

                                <button onClick={handleCancel}
                                    style={{
                                        marginTop: 'var(--spacing-md)',
                                        padding: 'var(--spacing-sm)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-danger)',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Annuler le tournoi
                                </button>
                            </div>
                        )}

                        {/* Non-host message */}
                        {!isHost && (
                            <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    color: 'rgba(51,51,51,0.6)',
                                    marginBottom: 'var(--spacing-lg)'
                                }}>
                                    <ClockIcon width={20} height={20} />
                                    <span>En attente de l'organisateur...</span>
                                </div>
                                <button onClick={handleLeave}
                                    style={{
                                        padding: 'var(--spacing-sm)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-danger)',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Quitter le tournoi
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Status: Team Setup */}
                {tournament.status === 'team_setup' && (
                    <>
                        {/* For 1v1: Show participants list and start button directly */}
                        {tournament.format === '1v1' ? (
                            <>
                                {/* Participants */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 'var(--spacing-sm)'
                                    }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', opacity: 0.6, fontWeight: 600 }}>
                                            Participants
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--team-green)', fontWeight: 700 }}>
                                            {tournament.teams.length} joueur{tournament.teams.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {tournament.teams.map((team) => (
                                            <div key={team.teamId}
                                                style={{
                                                    padding: '12px',
                                                    background: 'var(--color-surface)',
                                                    border: '3px solid var(--ink-700)',
                                                    borderRadius: 'var(--radius-md)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}
                                            >
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: team.players[0]?.userId.startsWith('guest_')
                                                        ? 'linear-gradient(to bottom right, var(--color-accent), var(--team-orange))'
                                                        : 'linear-gradient(to bottom right, var(--team-green), var(--team-green))',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--ink-700)',
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    border: '2px solid var(--ink-700)'
                                                }}>
                                                    {team.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        fontWeight: 700,
                                                        color: 'var(--color-text-dark)',
                                                        fontSize: '0.875rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {team.name}
                                                        {team.players[0]?.userId.startsWith('guest_') && (
                                                            <span style={{ color: 'var(--team-purple)', fontSize: '0.75rem', marginLeft: '8px' }}>(guest)</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Host Actions for 1v1 */}
                                {isHost && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                        <button onClick={handleStartTournament}
                                            disabled={!canStartTournament}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: 'var(--spacing-md)',
                                                background: canStartTournament ? 'var(--team-green)' : 'rgba(46, 204, 113, 0.3)',
                                                border: '3px solid var(--ink-700)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'white',
                                                fontWeight: 700,
                                                cursor: canStartTournament ? 'pointer' : 'not-allowed',
                                                opacity: canStartTournament ? 1 : 0.5
                                            }}
                                        >
                                            <PlayIcon width={20} height={20} />
                                            Demarrer le tournoi
                                        </button>

                                        {!canStartTournament && (
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)', textAlign: 'center' }}>
                                                Minimum 2 joueurs requis
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Non-host message */}
                                {!isHost && (
                                    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            color: 'rgba(51,51,51,0.6)'
                                        }}>
                                            <ClockIcon width={20} height={20} />
                                            <span>En attente du demarrage...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* For 2v2: Show team formation interface */}
                                {/* Formed Teams */}
                                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 'var(--spacing-sm)'
                                    }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', opacity: 0.6, fontWeight: 600 }}>
                                            Equipes formees
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--team-green)', fontWeight: 700 }}>
                                            {tournament.teams.length} equipe{tournament.teams.length > 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {tournament.teams.length === 0 ? (
                                        <div style={{
                                            padding: 'var(--spacing-lg)',
                                            background: 'var(--color-surface)',
                                            border: '3px solid var(--ink-700)',
                                            borderRadius: 'var(--radius-md)',
                                            textAlign: 'center',
                                            color: 'rgba(51,51,51,0.6)'
                                        }}>
                                            Aucune equipe formee
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {tournament.teams.map((team, index) => (
                                                <div key={team.teamId}
                                                    style={{
                                                        padding: '12px',
                                                        background: 'var(--color-surface)',
                                                        border: '3px solid var(--ink-700)',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        flexShrink: 0,
                                                        background: TEAM_AVATAR_GRADIENTS[index % TEAM_AVATAR_GRADIENTS.length],
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 800,
                                                        fontSize: '1rem',
                                                        border: '2px solid var(--ink-700)'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontWeight: 700,
                                                            color: 'var(--color-text-dark)',
                                                            fontSize: '0.875rem',
                                                            marginBottom: '4px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {team.name}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {team.players.map(player => (
                                                                <span key={player.userId}
                                                                    style={{
                                                                        padding: '2px 8px',
                                                                        background: player.userId.startsWith('guest_') ? 'var(--team-purple)' : 'var(--team-green)',
                                                                        borderRadius: '4px',
                                                                        color: 'white',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        maxWidth: '100px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {player.username}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {isHost && (
                                                        <button onClick={() => handleDeleteTeam(team.teamId)}
                                                            style={{
                                                                padding: '8px',
                                                                flexShrink: 0,
                                                                background: 'rgba(231, 76, 60, 0.1)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <TrashIcon width={16} height={16} style={{ color: 'var(--color-danger)' }} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Unassigned Players */}
                                {unassignedPlayers.length > 0 && (
                                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', opacity: 0.6, fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                            Joueurs non assignes ({unassignedPlayers.length})
                                        </p>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '8px'
                                        }}>
                                            {unassignedPlayers.map(player => (
                                                <div key={player.userId}
                                                    style={{
                                                        padding: '12px',
                                                        background: 'var(--color-surface)',
                                                        border: '2px dashed var(--ink-700)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        textAlign: 'center',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        background: player.userId.startsWith('guest_') ? 'var(--team-purple)' : 'var(--team-green)',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        margin: '0 auto 8px',
                                                        border: '2px solid var(--ink-700)'
                                                    }}>
                                                        {player.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--color-text-dark)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {player.username}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Host Actions for Team Setup */}
                                {isHost && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                        {/* Create team button */}
                                        {unassignedPlayers.length >= playersPerTeam && (
                                            <button onClick={() => {
                                                    setSelectedPlayers([]);
                                                    setTeamName('');
                                                    setShowTeamModal(true);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: 'var(--spacing-md)',
                                                    background: 'var(--color-surface)',
                                                    border: '3px solid var(--ink-700)',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: 'var(--color-text-dark)',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <PlusIcon width={20} height={20} />
                                                Creer une equipe
                                            </button>
                                        )}

                                        <button onClick={handleStartTournament}
                                            disabled={!canStartTournament}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: 'var(--spacing-md)',
                                                background: canStartTournament ? 'var(--team-green)' : 'rgba(46, 204, 113, 0.3)',
                                                border: '3px solid var(--ink-700)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'white',
                                                fontWeight: 700,
                                                cursor: canStartTournament ? 'pointer' : 'not-allowed',
                                                opacity: canStartTournament ? 1 : 0.5
                                            }}
                                        >
                                            <PlayIcon width={20} height={20} />
                                            Demarrer le tournoi
                                        </button>

                                        {!canStartTournament && (
                                            <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)', textAlign: 'center' }}>
                                                Minimum 2 equipes requises
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Non-host message */}
                                {!isHost && (
                                    <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            color: 'rgba(51,51,51,0.6)'
                                        }}>
                                            <ClockIcon width={20} height={20} />
                                            <span>L'organisateur forme les equipes...</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Guest Modal */}
            {showGuestModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--spacing-lg)',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--spacing-lg)',
                        width: '100%',
                        maxWidth: '320px',
                        border: '3px solid var(--ink-700)'
                    }}>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            Ajouter un guest
                        </h3>

                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Nom du joueur"
                            maxLength={20}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '2px solid var(--ink-700)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '1rem',
                                marginBottom: 'var(--spacing-md)',
                                color: 'var(--ink-700)',
                                background: 'white'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => {
                                    setShowGuestModal(false);
                                    setGuestName('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--color-surface)',
                                    border: '2px solid var(--ink-700)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--ink-700)'
                                }}
                            >
                                Annuler
                            </button>
                            <button onClick={handleAddGuest}
                                disabled={!guestName.trim() || isAddingGuest}
                                style={{
                                    flex: 1,
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--team-green)',
                                    border: '2px solid var(--ink-700)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: guestName.trim() && !isAddingGuest ? 'pointer' : 'not-allowed',
                                    opacity: guestName.trim() && !isAddingGuest ? 1 : 0.5,
                                    color: 'white'
                                }}
                            >
                                {isAddingGuest ? '...' : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Creation Modal */}
            {showTeamModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--spacing-lg)',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--spacing-lg)',
                        width: '100%',
                        maxWidth: '360px',
                        border: '3px solid var(--ink-700)',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            Creer une equipe
                        </h3>

                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder={`Equipe ${tournament.teams.length + 1}`}
                            maxLength={20}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '2px solid var(--ink-700)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '1rem',
                                marginBottom: 'var(--spacing-md)',
                                color: 'var(--ink-700)',
                                background: 'white'
                            }}
                        />

                        <p style={{
                            fontSize: '0.875rem',
                            color: 'rgba(51,51,51,0.6)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            Selectionnez {playersPerTeam} joueur{playersPerTeam > 1 ? 's' : ''} ({selectedPlayers.length}/{playersPerTeam})
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            {unassignedPlayers.map(player => {
                                const isSelected = selectedPlayers.includes(player.userId);
                                return (
                                    <button key={player.userId}
                                        onClick={() => togglePlayerSelection(player.userId)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: isSelected ? 'var(--team-green)' : 'var(--color-surface)',
                                            border: `3px solid ${isSelected ? '#27AE60' : 'var(--ink-700)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            background: player.userId.startsWith('guest_') ? 'var(--team-purple)' : (isSelected ? 'white' : 'var(--team-green)'),
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isSelected ? 'var(--team-green)' : 'white',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            border: '2px solid var(--ink-700)'
                                        }}>
                                            {isSelected ? (
                                                <CheckCircleIcon width={20} height={20} />
                                            ) : (
                                                player.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <span style={{
                                            fontWeight: 600,
                                            color: isSelected ? 'white' : 'var(--color-text-dark)',
                                            fontSize: '0.875rem'
                                        }}>
                                            {player.username}
                                            {player.userId.startsWith('guest_') && (
                                                <span style={{ opacity: 0.7, marginLeft: '4px' }}>(guest)</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => {
                                    setShowTeamModal(false);
                                    setSelectedPlayers([]);
                                    setTeamName('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--color-surface)',
                                    border: '2px solid var(--ink-700)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--ink-700)'
                                }}
                            >
                                Annuler
                            </button>
                            <button onClick={handleCreateTeam}
                                disabled={selectedPlayers.length !== playersPerTeam || isCreatingTeam}
                                style={{
                                    flex: 1,
                                    padding: 'var(--spacing-sm)',
                                    background: selectedPlayers.length === playersPerTeam ? 'var(--team-green)' : 'rgba(46, 204, 113, 0.3)',
                                    border: '2px solid var(--ink-700)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: selectedPlayers.length === playersPerTeam && !isCreatingTeam ? 'pointer' : 'not-allowed',
                                    opacity: selectedPlayers.length === playersPerTeam && !isCreatingTeam ? 1 : 0.5,
                                    color: 'white'
                                }}
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
