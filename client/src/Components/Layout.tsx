import { Outlet } from "react-router";
import Header from "./Shared/Header/Header";
import Background from "./Shared/Background/Background";
import CompleteProfileModal from "./Shared/CompleteProfileModal";
import DemoNoticeModal from "./Shared/DemoNoticeModal";

interface LayoutProps {
    sonar?: boolean;
}

export function Layout({ sonar = false }: LayoutProps) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <Header />
            <Outlet />
            <Background sonar={sonar} />
            <CompleteProfileModal />
            <DemoNoticeModal />
        </div>
    );
}
