import RegisterContainer from "../../Components/RegisterPage/RegisterContainer";
import MiscInfo from "../../Components/Shared/MiscInfo/MiscInfo";
import PlayerCount from "../../Components/Shared/PlayerCount/PlayerCount";
import GithubIcon from "../../assets/github.svg";

export default function Register() {
    return (
        <main className="flex-1 flex items-center justify-center px-4 py-12 relative min-h-screen w-full p-4 overflow-y-auto">
            <div className="w-full max-w-md">
                <PlayerCount />
                <RegisterContainer />
                <div className="flex items-center justify-center gap-3 mt-6">
                    <MiscInfo
                        text="mertcetn"
                        svg={GithubIcon}
                        onClick={handleGithubClick}
                    />
                </div>
            </div>
        </main>
    );
}

function handleGithubClick() {
    window.open("https://github.com/mertcetn", "_blank");
}
