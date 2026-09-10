import ProfileContainer from "../../Components/ProfilePage/ProfileContainer";

export default function Profile() {
    return (
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-y-auto">
            <div className="w-full max-w-lg my-auto">
                <ProfileContainer />
            </div>
        </main>
    );
}
