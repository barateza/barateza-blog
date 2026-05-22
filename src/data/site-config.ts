import avatar from '../assets/images/avatar.jpg';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://barateza.org',
    avatar: {
        src: avatar,
        alt: 'Gilson Siqueira'
    },
    title: 'Gilson Siqueira',
    subtitle: 'AI Engineer. LLM pipelines, retrieval systems, production reliability.',
    description:
        'AI Engineer building RAG systems, MCP tooling, and internal AI workflows with a production support mindset. Based in São Paulo, Brazil, working remotely.',
    image: {
        src: '/og-preview.jpg',
        alt: 'Gilson Siqueira, barateza.org'
    },
    headerNavLinks: [
        {
            text: 'Home',
            href: '/'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'CV',
            href: '/cv'
        },
        {
            text: 'Contact',
            href: '/contact'
        }
    ],
    footerNavLinks: [
        {
            text: 'About',
            href: '/about'
        },
        {
            text: 'CV',
            href: '/cv'
        },
        {
            text: 'Projects',
            href: '/projects'
        },
        {
            text: 'Blog',
            href: '/blog'
        },
        {
            text: 'Contact',
            href: '/contact'
        },
    ],
    socialLinks: [
        {
            text: 'LinkedIn',
            href: 'https://www.linkedin.com/in/barateza'
        },
        {
            text: 'GitHub',
            href: 'https://github.com/barateza'
        },
        {
            text: 'dev.to',
            href: 'https://dev.to/barateza'
        }
    ],
    hero: {
        text: 'AI Engineer with a production reliability background. I build LLM pipelines, retrieval systems, and internal AI tooling that engineers actually use. I bring production support instincts to AI infrastructure. Measure first, calibrate second, ship what survives real workflows.\n\n- 10 years in Linux infrastructure and technical support.\n- 10% AI ticket deflection in production workflows.\n- 3x Top Engineer of the Quarter, 1.0 CSAT in 2026.\n\nBased in Lins, São Paulo, Brazil. Remote since 2020.',
        actions: [
            {
                text: 'View Projects',
                href: '/projects'
            },
            {
                text: 'Read Writing',
                href: '/blog'
            },
            {
                text: 'View CV',
                href: '/cv'
            }
        ]
    },
    subscribe: {
        enabled: false,
        title: '',
        text: '',
        form: {
            action: '#'
        }
    },
    postsPerPage: 8,
    projectsPerPage: 8
};

export default siteConfig;
