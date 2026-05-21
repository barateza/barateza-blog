import avatar from '../assets/images/avatar.jpg';
import type { SiteConfig } from '../types';

const siteConfig: SiteConfig = {
    website: 'https://barateza.org',
    avatar: {
        src: avatar,
        alt: 'Gilson Siqueira'
    },
    title: 'Gilson Siqueira',
    subtitle: 'Lead Technical Support Engineer',
    description: 'Log-first, CLI-native lead engineer. 10+ years in Linux infrastructure, technical support, and AI tooling. Based in Lins, São Paulo, Brazil.',
    image: {
        src: '/og-preview.jpg',
        alt: 'Gilson Siqueira — barateza.org'
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
            text: 'Tags',
            href: '/tags'
        }
    ],
    footerNavLinks: [
        {
            text: 'LinkedIn',
            href: 'https://www.linkedin.com/in/barateza'
        },
        {
            text: 'GitHub',
            href: 'https://github.com/barateza'
        },
        {
            text: 'Email',
            href: 'mailto:gilson@barateza.org'
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
            text: 'Instagram',
            href: 'https://www.instagram.com/_barateza/'
        }
    ],
    hero: {
        title: 'Gilson Siqueira',
        text: "Lead Technical Support Engineer at **WebPros** — Lins, São Paulo, Brazil.\n\n10+ years in technical support and Linux infrastructure. I pull the logs first, form an opinion second. Fix the root cause, not the symptom. I've been doing this long enough to know the difference matters.\n\n3× Top Engineer of the Quarter. Perfect 1.0 CSAT in 2026. 10% AI ticket deflection. KCS-certified knowledge publisher.\n\nFind me on [LinkedIn](https://www.linkedin.com/in/barateza), [GitHub](https://github.com/barateza), or write to [gilson@barateza.org](mailto:gilson@barateza.org).",
        actions: [
            {
                text: 'View Projects',
                href: '/projects'
            },
            {
                text: 'Read the Blog',
                href: '/blog'
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
