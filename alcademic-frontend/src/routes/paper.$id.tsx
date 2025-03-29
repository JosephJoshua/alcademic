import React from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import { fetchPaperDetail } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import {Button} from "@/components/ui/button.tsx";

export const Route = createFileRoute('/paper/$id')({
    loader: ({ params: { id } }) => fetchPaperDetail(id),
    pendingComponent: PaperDetailLoading,
    errorComponent: PaperDetailError,
    component: PaperDetailPage,
});

function PaperDetailPage() {
    const paper = Route.useLoaderData();
    const { id } = Route.useParams();

    if (!paper) {
        return <NotFound id={id} />;
    }

    const { title, authors, year, publicationVenue, abstract, extractedInfo, hasPdf } = paper;

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back to Paper List
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription>
                        {authors.join(', ')} <br />
                        {publicationVenue && `${publicationVenue} `}{year && `(${year})`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Abstract</h2>
                        <Separator className="mb-3" />
                        <p className="text-muted-foreground whitespace-pre-wrap">{abstract}</p>
                    </div>

                    {extractedInfo && (
                        <div>
                            <div className="flex items-center mb-2">
                                <h2 className="text-lg font-semibold">Extracted Information</h2>
                                <Badge variant="secondary" className={`ml-3 ${extractedInfo.source === 'pdf' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                                    Source: {extractedInfo.source === 'pdf' ? 'PDF' : 'Metadata'}
                                </Badge>
                                {!hasPdf && extractedInfo.source !== 'pdf' && (
                                    <Badge variant="outline" className="ml-2">PDF Not Processed</Badge>
                                )}
                            </div>
                            <Separator className="mb-3" />
                            <div className="space-y-3">
                                <InfoSection title="Research Problem" content={extractedInfo.problemStatement} />
                                <InfoSection title="Methodology" content={extractedInfo.methodology} />
                                <InfoSection title="Code Link" content={extractedInfo.codeLink} isLink />
                                <InfoSection title="Benchmark" content={extractedInfo.benchmark} />
                                <InfoSection title="Dataset" content={extractedInfo.dataset} />
                                <InfoSection title="Results" content={extractedInfo.results} />
                            </div>
                        </div>
                    )}

                    {!extractedInfo && hasPdf && (
                        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                            <AlertTitle>Processing Information</AlertTitle>
                            <AlertDescription>
                                Detailed information from the PDF is being processed or is not yet available. Check back later.
                            </AlertDescription>
                        </Alert>
                    )}
                    {!extractedInfo && !hasPdf && (
                        <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                            <AlertTitle>Metadata Only</AlertTitle>
                            <AlertDescription>
                                Only metadata is available for this paper. No PDF was provided for detailed extraction.
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

const InfoSection: React.FC<{ title: string; content?: string | null; isLink?: boolean }> = ({ title, content, isLink }) => {
    if (!content) return null;
    return (
        <div className="text-sm">
            <h3 className="font-medium text-foreground mb-0.5">{title}:</h3>
            {isLink && content.startsWith('http') ? (
                <a href={content} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{content}</a>
            ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">{content}</p>
            )}
        </div>
    );
};


function PaperDetailLoading() {
    return (
        <div className="max-w-4xl mx-auto">
            <Skeleton className="h-5 w-40 mb-4" /> {/* Back link skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-4/5 mb-3" /> {/* Title */}
                    <Skeleton className="h-5 w-3/5 mb-1" /> {/* Authors */}
                    <Skeleton className="h-4 w-1/2" />      {/* Venue/Year */}
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" /> {/* Abstract Title */}
                        <Separator className="mb-3" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div>
                        <Skeleton className="h-6 w-1/3 mb-2" /> {/* Extracted Info Title */}
                        <Separator className="mb-3" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-1/4 mb-1" /> <Skeleton className="h-4 w-3/4" /> {/* Section */}
                            <Skeleton className="h-4 w-1/4 mb-1" /> <Skeleton className="h-4 w-full" /> {/* Section */}
                            <Skeleton className="h-4 w-1/4 mb-1" /> <Skeleton className="h-4 w-1/2" /> {/* Section */}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function PaperDetailError({ error }: { error: Error }) {
    console.error("Paper detail loading error:", error);

    const { id } = Route.useParams();
    const navigate = useNavigate({from: Route.fullPath});

    // Check if error indicates "not found" or a general fetch error
    const isNotFound = error?.message?.toLowerCase().includes('not found') || (error as any)?.response?.status === 404;

    if (isNotFound) {
        return <NotFound id={id} />;
    }

    const retry = async () => {
        await navigate({replace: true});
    }

    // General fetch error
    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
                <ArrowLeftIcon className="mr-1 h-4 w-4"/>
                Back to Paper List
            </Link>
            <Alert variant="destructive" className="my-6">
                <ExclamationTriangleIcon className="h-4 w-4"/>
                <AlertTitle>Error Loading Paper Details</AlertTitle>
                <AlertDescription>
                    There was a problem fetching details for paper ID: {id}. Please try again later.
                    {error?.message && <p className='mt-2'>Details: {error.message}</p>}
                </AlertDescription>
            </Alert>
            <div className="text-center">
                <Button onClick={retry}>Retry</Button>
            </div>
        </div>
    );
}

function NotFound({id}: { id: string }) {
    return (
        <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
                <ArrowLeftIcon className="mr-1 h-4 w-4" />
                Back to Paper List
            </Link>
            <Alert variant="destructive" className="my-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Paper Not Found</AlertTitle>
                <AlertDescription>
                    The paper with ID "{id}" could not be found. It might have been removed or the ID is incorrect.
                </AlertDescription>
            </Alert>
        </div>
    )
}
