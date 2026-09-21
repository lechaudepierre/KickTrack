import type { NextConfig } from "next";

/**
 * L'IDENTIFIANT DE LA VERSION DÉPLOYÉE.
 *
 * Sur Vercel, `VERCEL_GIT_COMMIT_SHA` est fourni automatiquement au moment du
 * build. En local il n'existe pas : on retombe sur `dev`, ce qui DÉSACTIVE la
 * détection de mise à jour — c'est voulu, on ne veut pas qu'un serveur de
 * développement recharge la page sans arrêt.
 *
 * La valeur part à DEUX endroits, et c'est tout l'intérêt :
 *   - dans le bundle client, figée au build (`env`) : c'est ce que le
 *     navigateur du joueur connaît de LUI-MÊME ;
 *   - dans la route `/api/version`, qui appartient au déploiement EN COURS.
 *
 * Quand les deux diffèrent, c'est que le joueur fait tourner du code périmé.
 */
const VERSION_DEPLOIEMENT = process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev';

const nextConfig: NextConfig = {
  env: {
    VERSION_DEPLOIEMENT,
  },
  // Le même identifiant sert d'identifiant de build : les ressources d'un
  // ancien déploiement gardent ainsi leur propre chemin, et un client périmé
  // continue de fonctionner jusqu'à son rechargement.
  generateBuildId: () => VERSION_DEPLOIEMENT,
};

export default nextConfig;
