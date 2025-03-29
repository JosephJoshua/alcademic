import axios from 'axios';
import type {PaperListResponse, PaperDetail} from '@/types';

const API_BASE_URL = 'https://www.google.com';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const generateMockPapers = (page: number, limit: number, query: string): PaperListResponse => ({
    papers: Array.from({length: limit}, (_, i) => ({
        id: `mock-${page}-${i}`,
        title: `Mock Paper Title ${page}-${i} ${query ? ` matching "${query}"` : ''}`,
        authors: [`Author A${i}`, `Author B${i}`],
        year: 2023 - (i % 5),
        publicationVenue: `Mock Conference ${page}`,
        abstractSnippet: `This is a mock abstract snippet for paper ${page}-${i}. It discusses mock methods and mock results.`,
        hasPdf: i % 3 === 0,
        keywords: ['mock', `topic ${i % 4}`]
    })),
    totalItems: 10000,
    totalPages: Math.ceil(10000 / limit),
    currentPage: page,
});

const generateMockPaperDetail = (id: string): PaperDetail => {
    const hasPdf = Math.random() > 0.5;
    return {
        id: id,
        title: `Mock Detailed Title for ${id}`,
        authors: ['Detailed Author A', 'Detailed Author B'],
        year: 2022,
        publicationVenue: 'Mock Journal X',
        abstract: `This is the full mock abstract for paper ${id}. It elaborates significantly on the methodology...`,
        hasPdf: hasPdf,
        extractedInfo: {
            problemStatement: `The key research problem addressed in mock paper ${id} is...`,
            methodology: `A novel mock approach based on X and Y is proposed.`,
            codeLink: hasPdf ? `https://github.com/mock/repo-${id}` : undefined,
            benchmark: hasPdf ? `MockBench Benchmark Suite` : undefined,
            dataset: `MockDataset-${Number.parseInt(id) % 10}`,
            results: `Achieved X% accuracy on MockDataset, outperforming baseline by Y%.`,
            source: hasPdf ? 'pdf' : 'meta',
        },
        keywords: ['mock', 'detail', `topic ${id.length % 4}`]
    };
};


export const fetchPapers = async (
    page: number = 1,
    limit: number = 15,
    searchQuery: string = ''
): Promise<PaperListResponse> => {
    try {
        const response = await apiClient.get<PaperListResponse>('/papers', {
            params: {page, limit, search: searchQuery || undefined},
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching papers:', error);
        return generateMockPapers(page, limit, searchQuery);
    }
};

export const fetchPaperDetail = async (id: string): Promise<PaperDetail | null> => {
    try {
        const response = await apiClient.get<PaperDetail>(`/papers/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching paper detail for ID ${id}:`, error);
        if (id.startsWith('mock-')) {
            return generateMockPaperDetail(id);
        }

        return null;
    }
};
