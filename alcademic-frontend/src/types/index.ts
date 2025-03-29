// Basic info shown in the list view
export interface PaperMeta {
    id: string;
    title: string;
    authors: string[];
    year?: number;
    publicationVenue?: string;
    abstractSnippet?: string;
    hasPdf: boolean;
    keywords?: string[];
}

// Detailed extracted information
export interface ExtractedInfo {
    problemStatement?: string;
    methodology?: string;
    codeLink?: string;
    benchmark?: string;
    dataset?: string;
    results?: string;
    source: 'meta' | 'pdf';
}

// Full details for the detail page
export interface PaperDetail extends PaperMeta {
    abstract: string;
    extractedInfo: ExtractedInfo | null;
}

// API response for the paper list
export interface PaperListResponse {
    papers: PaperMeta[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
}
