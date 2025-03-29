import {Link, Outlet, createRootRoute} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
    component: Root,
    notFoundComponent: NotFound,
})

function NotFound() {
    return (
        <div className="container mx-auto px-4 py-10 text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
            <p className="text-lg text-muted-foreground mb-6">The page you are looking for does not exist.</p>
            <Link to="/"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Go Home
            </Link>
        </div>
    )
}

function Root() {
    return (
        <>
            <header className="bg-background border-b sticky top-0 z-10">
                <div className="container mx-auto h-16 flex items-center justify-between px-4">
                    <Link to="/" className="text-xl font-bold [&.active]:font-bold">
                        Alcademic
                    </Link>
                </div>
            </header>

            <main
                className="container mx-auto px-4 py-8 min-h-[calc(100vh-128px)]">
                <Outlet/>
            </main>

            <footer className="bg-muted text-muted-foreground text-center p-4 mt-8">
                © {new Date().getFullYear()} Alcademic. All rights reserved.
            </footer>

            <TanStackRouterDevtools/>
        </>
    );
}
