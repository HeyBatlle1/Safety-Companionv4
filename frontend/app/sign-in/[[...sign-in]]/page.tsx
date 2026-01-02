import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <SignIn
                appearance={{
                    elements: {
                        formButtonPrimary: "bg-teal-600 hover:bg-teal-700",
                        card: "bg-slate-800 border-slate-700",
                        headerTitle: "text-white",
                        headerSubtitle: "text-slate-400",
                        socialButtonsBlockButton: "bg-slate-700 border-slate-600 text-white hover:bg-slate-600",
                        formFieldLabel: "text-slate-300",
                        formFieldInput: "bg-slate-700 border-slate-600 text-white",
                        footerActionLink: "text-teal-400 hover:text-teal-300",
                    }
                }}
            />
        </div>
    );
}
