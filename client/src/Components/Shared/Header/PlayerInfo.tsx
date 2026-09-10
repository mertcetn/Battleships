import { NavLink } from "react-router";

interface PlayerInfoProps {
    playerName: string;
    playerElo: number;
    playerRank: string;
}

export default function PlayerInfo({
    playerName,
    playerElo,
    playerRank,
}: PlayerInfoProps) {
    return (
        <div id="player-info" className="flex items-center space-x-2">
            <NavLink
                to="/profile"
                id="header-username-link"
                title="View Profile"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:flex items-center truncate max-w-37.5 group cursor-pointer"
            >
                <span className="bg-blue-900/80 text-blue-100 group-hover:border-blue-500 text-xs font-bold px-2 py-0.5 rounded border border-blue-700 mr-2 shadow-sm min-w-10 text-center inline-flex items-center justify-center tracking-wide transition-colors">
                    {playerRank}
                </span>
                <span className="truncate group-hover:underline underline-offset-2">
                    {playerName}
                </span>
            </NavLink>

            <span className="bg-yellow-800 text-yellow-300 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                ELO: {playerElo}
            </span>
        </div>
    );
}
