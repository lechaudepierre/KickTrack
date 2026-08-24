import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    updateDoc,
    deleteDoc,
    Unsubscribe
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import {
    Tournament,
    TournamentTeam,
    TournamentMatch,
    TournamentFormat,
    TournamentMode,
    BracketRound,
    Player,
    Game,
    Team
} from '@/types';
import { generatePinCode } from '@/lib/utils/code-generator';
import { saisonCourante } from '@/lib/game/season';
import {
    classementInitial,
    genererMatchsRoundRobin,
    genererTableau,
    nouvelIdParDefaut,
} from '@/lib/tournament/format';

const TOURNAMENTS_COLLECTION = 'tournaments';

// Une seule fabrique d'identifiants pour les équipes et pour les matchs.
const generateId = nouvelIdParDefaut;


// Create a new tournament
export async function createTournament(
    hostId: string,
    hostName: string,
    venueId: string,
    venueName: string,
    format: TournamentFormat,
    mode: TournamentMode,
    modeId: string = 'normal'
): Promise<Tournament> {
    const db = getFirebaseDb();
    const tournamentRef = doc(collection(db, TOURNAMENTS_COLLECTION));
    const pinCode = generatePinCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes for tournaments

    const maxTeams = mode === 'round_robin' ? 8 : 64;

    const tournament: Tournament = {
        tournamentId: tournamentRef.id,
        name: `Tournoi de ${hostName}`,
        pinCode,
        format,
        mode,
        modeId,
        venueId,
        venueName,
        hostId,
        hostName,
        maxTeams,
        players: [{
            userId: hostId,
            username: hostName
        }],
        teams: [],
        matches: [],
        createdAt: now,
        expiresAt,
        status: 'waiting'
    };

    await setDoc(tournamentRef, tournament);
    return tournament;
}

// Get tournament by ID
export async function getTournament(tournamentId: string): Promise<Tournament | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as Tournament;
    }
    return null;
}

// Get tournament by PIN code
export async function getTournamentByPinCode(pinCode: string): Promise<Tournament | null> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, TOURNAMENTS_COLLECTION),
        where('pinCode', '==', pinCode.toUpperCase()),
        where('status', 'in', ['waiting', 'team_setup'])
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as Tournament;
}

// Subscribe to tournament updates (real-time)
export function subscribeToTournament(
    tournamentId: string,
    callback: (tournament: Tournament | null) => void
): Unsubscribe {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);

    return onSnapshot(tournamentRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as Tournament);
        } else {
            callback(null);
        }
    });
}

// Join a tournament
export async function joinTournament(
    tournamentId: string,
    player: Player
): Promise<Tournament | null> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) return null;

    const tournament = tournamentSnap.data() as Tournament;

    // Check if player already joined
    if (tournament.players.some(p => p.userId === player.userId)) {
        return tournament;
    }

    // Check status
    if (tournament.status !== 'waiting' && tournament.status !== 'team_setup') {
        throw new Error('Le tournoi a deja commence');
    }

    // Check if tournament is expired
    if (new Date() > new Date(tournament.expiresAt)) {
        throw new Error('Le tournoi a expire');
    }

    // Sanitize player object
    const safePlayer = {
        userId: player.userId,
        username: player.username,
        avatarUrl: player.avatarUrl || null
    };

    const updatedPlayers = [...tournament.players, safePlayer];

    await updateDoc(tournamentRef, {
        players: updatedPlayers
    });

    return { ...tournament, players: updatedPlayers };
}

// Add a guest player to tournament
export async function addGuestToTournament(
    tournamentId: string,
    guestName: string
): Promise<Tournament | null> {
    const guestPlayer: Player = {
        userId: `guest_${generateId()}`,
        username: guestName,
        avatarUrl: null
    };

    return joinTournament(tournamentId, guestPlayer);
}

// Remove player from tournament
export async function removePlayerFromTournament(
    tournamentId: string,
    playerId: string
): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    // Can't remove host
    if (playerId === tournament.hostId) {
        throw new Error('Impossible de retirer le createur du tournoi');
    }

    const updatedPlayers = tournament.players.filter(p => p.userId !== playerId);

    // Also remove from any team
    const updatedTeams = tournament.teams.map(team => ({
        ...team,
        players: team.players.filter(p => p.userId !== playerId)
    })).filter(team => team.players.length > 0);

    await updateDoc(tournamentRef, {
        players: updatedPlayers,
        teams: updatedTeams
    });
}

// Start team setup phase
export async function startTeamSetup(tournamentId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    // For 1v1, auto-assign teams immediately (skip team creation step)
    if (tournament.format === '1v1') {
        const teams: TournamentTeam[] = tournament.players.map((player) => ({
            teamId: generateId(),
            name: player.username,
            players: [player]
        }));

        await updateDoc(tournamentRef, {
            status: 'team_setup',
            teams
        });
    } else {
        await updateDoc(tournamentRef, {
            status: 'team_setup'
        });
    }
}

// Create a team
export async function createTeam(
    tournamentId: string,
    teamName: string,
    playerIds: string[]
): Promise<TournamentTeam> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    // Get player objects
    const teamPlayers = playerIds
        .map(id => tournament.players.find(p => p.userId === id))
        .filter((p): p is Player => p !== undefined);

    if (teamPlayers.length !== playerIds.length) {
        throw new Error('Certains joueurs non trouves');
    }

    const newTeam: TournamentTeam = {
        teamId: generateId(),
        name: teamName,
        players: teamPlayers
    };

    const updatedTeams = [...tournament.teams, newTeam];

    await updateDoc(tournamentRef, {
        teams: updatedTeams
    });

    return newTeam;
}

// Update a team
export async function updateTeam(
    tournamentId: string,
    teamId: string,
    teamName: string,
    playerIds: string[]
): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    const teamPlayers = playerIds
        .map(id => tournament.players.find(p => p.userId === id))
        .filter((p): p is Player => p !== undefined);

    const updatedTeams = tournament.teams.map(team => {
        if (team.teamId === teamId) {
            return { ...team, name: teamName, players: teamPlayers };
        }
        return team;
    });

    await updateDoc(tournamentRef, {
        teams: updatedTeams
    });
}

// Delete a team
export async function deleteTeam(tournamentId: string, teamId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;
    const updatedTeams = tournament.teams.filter(t => t.teamId !== teamId);

    await updateDoc(tournamentRef, {
        teams: updatedTeams
    });
}

// Auto-assign players to teams (for 1v1)
export async function autoAssignTeams(tournamentId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    if (tournament.format !== '1v1') {
        throw new Error('Auto-assign uniquement pour le format 1v1');
    }

    const teams: TournamentTeam[] = tournament.players.map((player) => ({
        teamId: generateId(),
        name: player.username,
        players: [player]
    }));

    await updateDoc(tournamentRef, {
        teams
    });
}

// Generate Round Robin matches with proper scheduling
// Uses circle method to ensure fair distribution of matches
// Start the tournament
export async function startTournament(tournamentId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    // Validate teams
    const playersPerTeam = tournament.format === '1v1' ? 1 : 2;
    const validTeams = tournament.teams.filter(t => t.players.length === playersPerTeam);

    if (validTeams.length < 2) {
        throw new Error('Il faut au moins 2 equipes completes');
    }

    if (tournament.mode === 'round_robin' && validTeams.length > 8) {
        throw new Error('Maximum 8 equipes pour le mode tous contre tous');
    }

    const updateData: Partial<Tournament> = {
        status: 'in_progress',
        teams: validTeams,
        currentMatchIndex: 0
    };

    if (tournament.mode === 'round_robin') {
        const matches = genererMatchsRoundRobin(validTeams);
        const standings = classementInitial(validTeams);
        updateData.matches = matches;
        updateData.standings = standings;
    } else {
        const bracket = genererTableau(validTeams);
        updateData.bracket = bracket;
        // Flatten matches for easy access
        updateData.matches = bracket.flatMap(round => round.matches);
    }

    await updateDoc(tournamentRef, updateData);
}

// Start a specific match in the tournament
export async function startTournamentMatch(
    tournamentId: string,
    matchId: string
): Promise<string> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    const matchIndex = tournament.matches.findIndex(m => m.matchId === matchId);
    if (matchIndex === -1) throw new Error('Match non trouve');

    const updatedMatches = [...tournament.matches];
    updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        status: 'in_progress'
    };

    await updateDoc(tournamentRef, {
        matches: updatedMatches,
        currentMatchIndex: matchIndex
    });

    return matchId;
}

// Complete a tournament match
export async function completeTournamentMatch(
    tournamentId: string,
    matchId: string,
    gameId: string,
    winnerId: string,
    score: [number, number]
): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);

    if (!tournamentSnap.exists()) throw new Error('Tournoi non trouve');

    const tournament = tournamentSnap.data() as Tournament;

    // Update match
    const matchIndex = tournament.matches.findIndex(m => m.matchId === matchId);
    if (matchIndex === -1) throw new Error('Match non trouve');

    const match = tournament.matches[matchIndex];
    const updatedMatches = [...tournament.matches];
    updatedMatches[matchIndex] = {
        ...match,
        gameId,
        winnerId,
        score,
        status: 'completed'
    };

    let updateData: Partial<Tournament> = {
        matches: updatedMatches
    };

    if (tournament.mode === 'round_robin') {
        // Update standings
        const standings = tournament.standings ? [...tournament.standings] : classementInitial(tournament.teams);

        const team1Index = standings.findIndex(s => s.teamId === match.team1.teamId);
        const team2Index = standings.findIndex(s => s.teamId === match.team2.teamId);

        if (team1Index !== -1 && team2Index !== -1) {
            standings[team1Index].played++;
            standings[team2Index].played++;
            standings[team1Index].goalsFor += score[0];
            standings[team1Index].goalsAgainst += score[1];
            standings[team2Index].goalsFor += score[1];
            standings[team2Index].goalsAgainst += score[0];

            if (winnerId === match.team1.teamId) {
                standings[team1Index].wins++;
                standings[team1Index].points += 3;
                standings[team2Index].losses++;
            } else {
                standings[team2Index].wins++;
                standings[team2Index].points += 3;
                standings[team1Index].losses++;
            }

            // Sort standings
            standings.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const aGoalDiff = a.goalsFor - a.goalsAgainst;
                const bGoalDiff = b.goalsFor - b.goalsAgainst;
                if (bGoalDiff !== aGoalDiff) return bGoalDiff - aGoalDiff;
                return b.goalsFor - a.goalsFor;
            });

            updateData.standings = standings;
        }

        // Check if tournament is complete
        const completedMatches = updatedMatches.filter(m => m.status === 'completed').length;
        if (completedMatches === updatedMatches.length) {
            updateData.status = 'completed';
        }
    } else {
        // Bracket mode - advance winner to next round
        updateData = await advanceBracket(tournament, updatedMatches, matchId, winnerId);
    }

    await updateDoc(tournamentRef, updateData);
}

// Advance bracket after match completion
async function advanceBracket(
    tournament: Tournament,
    updatedMatches: TournamentMatch[],
    completedMatchId: string,
    winnerId: string
): Promise<Partial<Tournament>> {
    if (!tournament.bracket) return { matches: updatedMatches };

    // Deep copy the bracket to avoid mutation issues
    const updatedBracket: BracketRound[] = tournament.bracket.map(round => ({
        ...round,
        matches: round.matches.map(m => ({ ...m }))
    }));

    let roundIndex = -1;
    let matchIndex = -1;

    // Find the completed match in bracket
    for (let r = 0; r < updatedBracket.length; r++) {
        const idx = updatedBracket[r].matches.findIndex(m => m.matchId === completedMatchId);
        if (idx !== -1) {
            roundIndex = r;
            matchIndex = idx;
            break;
        }
    }

    if (roundIndex === -1 || matchIndex === -1) {
        return { matches: updatedMatches, bracket: updatedBracket };
    }

    // Get the match data from updatedMatches (which has the score and winnerId)
    const completedMatchData = updatedMatches.find(m => m.matchId === completedMatchId);
    if (!completedMatchData) {
        return { matches: updatedMatches, bracket: updatedBracket };
    }

    // Update the match in bracket with completed data
    updatedBracket[roundIndex].matches[matchIndex] = {
        ...updatedBracket[roundIndex].matches[matchIndex],
        ...completedMatchData,
        status: 'completed'
    };

    // Find the winner team
    const completedMatch = updatedBracket[roundIndex].matches[matchIndex];
    const winnerTeam = completedMatch.team1.teamId === winnerId
        ? completedMatch.team1
        : completedMatch.team2;

    // Check if there's a next round
    if (roundIndex + 1 < updatedBracket.length) {
        const nextRound = updatedBracket[roundIndex + 1];
        const nextMatchIndex = Math.floor(matchIndex / 2);

        if (nextMatchIndex < nextRound.matches.length) {
            const nextMatch = nextRound.matches[nextMatchIndex];
            // Determine if winner goes to team1 or team2 slot
            if (matchIndex % 2 === 0) {
                nextRound.matches[nextMatchIndex] = {
                    ...nextMatch,
                    team1: winnerTeam
                };
            } else {
                nextRound.matches[nextMatchIndex] = {
                    ...nextMatch,
                    team2: winnerTeam
                };
            }
        }
    }

    // Check if tournament is complete (final match completed)
    const finalRound = updatedBracket[updatedBracket.length - 1];
    const finalMatch = finalRound.matches[0];
    const isComplete = completedMatchId === finalMatch.matchId;

    // Flatten the bracket to update matches array
    const flatMatches = updatedBracket.flatMap(round => round.matches);

    return {
        matches: flatMatches,
        bracket: updatedBracket,
        status: isComplete ? 'completed' : tournament.status
    };
}

// Get next pending match
export function getNextPendingMatch(tournament: Tournament): TournamentMatch | null {
    if (tournament.mode === 'round_robin') {
        return tournament.matches.find(m => m.status === 'pending') || null;
    } else if (tournament.bracket) {
        // For bracket, find the first pending match in the lowest round
        for (const round of tournament.bracket) {
            const pendingMatch = round.matches.find(m =>
                m.status === 'pending' &&
                m.team1.teamId !== '' &&
                m.team2.teamId !== ''
            );
            if (pendingMatch) return pendingMatch;
        }
    }
    return null;
}

// Cancel tournament
export async function cancelTournament(tournamentId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    await updateDoc(tournamentRef, { status: 'cancelled' });
}

// Delete tournament
export async function deleteTournament(tournamentId: string): Promise<void> {
    const db = getFirebaseDb();
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    await deleteDoc(tournamentRef);
}

// Create a game for a tournament match
export async function createTournamentGame(
    tournament: Tournament,
    match: TournamentMatch
): Promise<string> {
    const db = getFirebaseDb();
    const gameRef = doc(collection(db, 'games'));

    // Convert tournament teams to game teams
    //
    // BUG CORRIGÉ (chantier 9.11) : le repli de couleur écrivait un OBJET
    // `{ primary, secondary }` alors que `Team.color` attend une valeur de
    // `TeamColor` ('red' | 'blue' | …). GameBoard fait `styles[team.color]`
    // pour choisir son thème : avec un objet, la clé n'existait pas et toutes
    // les parties de tournoi s'affichaient en gris neutre.
    const teams: [Team, Team] = [
        {
            name: match.team1.name,
            color: match.team1.color ?? 'red',
            players: match.team1.players.map(p => ({
                userId: p.userId,
                username: p.username,
                avatarUrl: p.avatarUrl || null
            })),
            score: 0
        },
        {
            name: match.team2.name,
            color: match.team2.color ?? 'blue',
            players: match.team2.players.map(p => ({
                userId: p.userId,
                username: p.username,
                avatarUrl: p.avatarUrl || null
            })),
            score: 0
        }
    ];

    // Check if any player is a guest
    const hasGuestPlayers = teams.some(team =>
        team.players.some(player => player.userId.startsWith('guest_'))
    );

    // Typé explicitement : sans annotation, TypeScript ne vérifiait rien de cet
    // objet — c'est ce qui a laissé passer la couleur d'équipe malformée.
    const game: Game = {
        gameId: gameRef.id,
        venueId: tournament.venueId,
        venueName: tournament.venueName,
        teams,
        score: [0, 0],
        multiplier: 1,
        startTime: new Date(),
        duration: 0,
        status: 'in_progress',
        goals: [],
        startedAt: new Date(),
        playerIds: teams.flatMap(t => t.players.map(p => p.userId)).filter(id => id !== ''),
        hostId: tournament.hostId,
        isGuestGame: hasGuestPlayers,
        // La saison suit la partie, écrite une fois pour toutes (chantier 3.8).
        seasonId: await saisonCourante(),
        // Le mode de jeu du tournoi s'applique à chacun de ses matchs
        // (chantier 9.11). C'est le contexte où le bibitif a le plus de sens :
        // plusieurs matchs d'affilée, au bar, entre les mêmes personnes.
        modeId: tournament.modeId || 'normal',
        tournamentId: tournament.tournamentId,
        tournamentMatchId: match.matchId
    };

    await setDoc(gameRef, game);

    return gameRef.id;
}
