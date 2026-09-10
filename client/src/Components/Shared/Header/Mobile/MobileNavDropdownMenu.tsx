import MobileNavButton from "./MobileNavButton";
import { useUserStore } from "../../../../stores/useUserStore";

export default function MobileNavDropdownMenu() {
    const user = useUserStore((state) => state.user);
    const isLoggedIn = user.id !== "-1";

    return (
        <nav
            id="mobile-nav-menu"
            className="block md:hidden px-4 pt-2 pb-4 space-y-2 border-t border-color-border bg-primary"
        >
            {isLoggedIn && (
                <MobileNavButton name="Profile" redirectTo="/profile" />
            )}
            <MobileNavButton name="Leaderboard" redirectTo="/leaderboard" />
            <MobileNavButton name="Shop" redirectTo="/shop" />
            <MobileNavButton name="Play Now" redirectTo="/play" primary />
        </nav>
    );
}
