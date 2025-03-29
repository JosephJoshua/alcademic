// src/routes/index.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {fetchPapers} from '@/lib/api';
import type {PaperMeta} from '@/types';
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {ExclamationTriangleIcon} from '@radix-ui/react-icons';
import debounce from 'lodash.debounce';
import {z} from 'zod';

const ITEMS_PER_PAGE = 15;

const paperSearchSchema = z.object({
    page: z.number().int().positive().catch(1),
    query: z.string().optional().catch(''),
});

export const Route = createFileRoute('/')({
    validateSearch: paperSearchSchema,
    loaderDeps: ({search: {page, query}}) => ({page, query}),
    loader: ({deps: {page, query}}) =>
        fetchPapers(page, ITEMS_PER_PAGE, query),
    pendingComponent: PaperListLoading,
    errorComponent: PaperListError,
    component: PaperListPage,
});

function PaperListPage() {
    const {papers, totalPages, currentPage} = Route.useLoaderData();
    const {query} = Route.useSearch();
    const navigate = useNavigate({from: Route.fullPath});

    const [searchQueryInput, setSearchQueryInput] = useState(query || '');

    const debouncedSearch = useCallback(
        debounce(async (newQuery: string) => {
            await navigate({
                search: (prev) => ({...prev, query: newQuery || undefined, page: 1}),
                replace: true,
            });
        }, 500),
        [navigate],
    );

    useEffect(() => {
        setSearchQueryInput(query || '');
    }, [query]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = event.target.value;
        setSearchQueryInput(newQuery);
        debouncedSearch(newQuery);
    };

    const handlePageChange = async (newPage: number) => {
        await navigate({
            search: (prev) => ({...prev, page: newPage}),
            resetScroll: true,
        });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-center">Academic Papers</h1>

            {/* Search Bar */}
            <div className="my-4 w-full max-w-xl mx-auto">
                <Input
                    type="text"
                    placeholder="Search papers by title, author, keyword..."
                    value={searchQueryInput}
                    onChange={handleInputChange}
                    className="w-full"
                />
            </div>

            {/* Paper List */}
            {papers.length > 0 ? (
                <div className="space-y-4">
                    {papers.map((paper) => (
                        <PaperListItem key={paper.id} paper={paper}/>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground mt-10">
                    No papers found matching your criteria.
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
}

interface PaperListItemProps {
    paper: PaperMeta;
}

function PaperListItem({paper}: PaperListItemProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    <Link
                        to="/paper/$id"
                        params={{id: paper.id}}
                        className="text-primary hover:underline"
                    >
                        {paper.title}
                    </Link>
                </CardTitle>
                <CardDescription>
                    {paper.authors.join(', ')} {paper.year && `(${paper.year})`} {paper.publicationVenue && `- ${paper.publicationVenue}`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {paper.abstractSnippet && (
                    <p className="text-sm text-muted-foreground mb-3">{paper.abstractSnippet}</p>
                )}
                {paper.keywords && paper.keywords.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                        {paper.keywords.map(kw => (
                            <Badge key={kw} variant="secondary">{kw}</Badge>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <Badge variant={paper.hasPdf ? "default" : "outline"}
                       className={paper.hasPdf ? "bg-green-100 text-green-800 border-green-200" : ""}>
                    {paper.hasPdf ? 'PDF Available' : 'Meta Only'}
                </Badge>
                <Link
                    to="/paper/$id"
                    params={{id: paper.id}}
                    className="text-sm text-primary hover:underline"
                >
                    View Details →
                </Link>
            </CardFooter>
        </Card>
    );
}

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function Pagination({currentPage, totalPages, onPageChange}: PaginationProps) {
    const handlePrevious = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    return (
        <div className="flex justify-center items-center space-x-4 my-6">
            <Button onClick={handlePrevious} disabled={currentPage <= 1} variant="outline">
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
         Page {currentPage} of {totalPages}
       </span>
            <Button onClick={handleNext} disabled={currentPage >= totalPages} variant="outline">
                Next
            </Button>
        </div>
    );
}

function PaperListLoading() {
    const {query} = Route.useSearch();
    const [searchInput] = useState(query || '');

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-center">Academic Papers</h1>
            <div className="my-4 w-full max-w-xl mx-auto">
                <Input
                    type="text"
                    placeholder="Search papers..."
                    value={searchInput}
                    disabled
                    className="w-full"
                />
            </div>

            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4 mb-2"/>
                            <Skeleton className="h-4 w-1/2"/>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-1"/>
                            <Skeleton className="h-4 w-5/6 mb-3"/>
                            <div className="mb-2 flex flex-wrap gap-1">
                                <Skeleton className="h-5 w-16 rounded-full"/>
                                <Skeleton className="h-5 w-20 rounded-full"/>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center">
                            <Skeleton className="h-5 w-24 rounded-full"/>
                            <Skeleton className="h-5 w-28"/>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="flex justify-center items-center space-x-4 my-6">
                <Skeleton className="h-10 w-24"/>
                <Skeleton className="h-5 w-20"/>
                <Skeleton className="h-10 w-24"/>
            </div>
        </div>
    );
}

function PaperListError({error}: { error: Error }) {
    console.error("Paper list loading error:", error);

    const {query} = Route.useSearch();
    const navigate = useNavigate({from: Route.fullPath});
    const [searchInput, setSearchInput] = useState(query || '');

    const debouncedSearch = useCallback(
        debounce(async (newQuery: string) => {
            await navigate({search: (prev) => ({...prev, query: newQuery || undefined, page: 1}), replace: true});
        }, 500), [navigate]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.target.value);
        debouncedSearch(event.target.value);
    };

    const retry = async () => {
        await navigate({search: s => ({...s}), replace: true});
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-center">Academic Papers</h1>
            <div className="my-4 w-full max-w-xl mx-auto">
                <Input
                    type="text"
                    placeholder="Search papers..."
                    value={searchInput}
                    onChange={handleInputChange}
                    className="w-full"
                />
            </div>
            <Alert variant="destructive" className="my-6 max-w-xl mx-auto">
                <ExclamationTriangleIcon className="h-4 w-4"/>
                <AlertTitle>Error Loading Papers</AlertTitle>
                <AlertDescription>
                    There was a problem fetching the paper list. Please check your connection or try again.
                    {error?.message && <p className='mt-2'>Details: {error.message}</p>}
                </AlertDescription>
            </Alert>
            <div className="text-center">
                <Button onClick={retry}>Retry</Button>
            </div>
        </div>
    );
}
