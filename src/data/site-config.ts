import avatar from '../assets/images/avatar.jpg';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://barateza.org',
    avatar: {
        src: avatar,
        alt: 'Gilson Siqueira'
    },
    title: 'Gilson Siqueira',
    subtitle: 'Senior Platform Engineer. AWS, Linux, production reliability, applied AI.',
    description:
        'Senior Platform Engineer focused on AWS, Linux, production reliability, and automation, with applied AI as a practical differentiator. Based in Brazil.',
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
            text: 'Global Services',
            href: '/global-services'
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
        }
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
        text: 'I am a Senior Platform Engineer at Sinch, working on AWS-hosted platform operations and production reliability for enterprise customers across Latin America. My background combines Linux troubleshooting, incident response, and automation. I turn recurring problems into scripts, runbooks, and reusable technical knowledge.\n\n- Technical support since 2020, Linux and hosting infrastructure since 2021.\n- 3x Top Engineer of the Quarter at WebPros/Plesk.\n- 10% ticket deflection from a customer support AI deployment in 2025.\n\nApplied AI is part of my toolkit: semantic search, MCP tooling, and evaluated workflows that reduce operational load.\n\nBased in Lins, São Paulo, Brazil. Remote since 2020.',
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
