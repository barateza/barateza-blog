import { type CollectionEntry } from 'astro:content';
import { slugify } from './common-utils';

export function sortItemsByDateDesc(itemA: CollectionEntry<'blog' | 'projects'>, itemB: CollectionEntry<'blog' | 'projects'>) {
    const byDate = new Date(itemB.data.publishDate).getTime() - new Date(itemA.data.publishDate).getTime();
    // Entries sharing a publishDate would otherwise fall back to whatever order the
    // content collection happens to iterate in, which changed between Astro majors
    // and silently reshuffled the archive, tags index and RSS feed. Break the tie on
    // id so the result is a stable total order: date descending, then id descending.
    return byDate !== 0 ? byDate : itemB.id.localeCompare(itemA.id);
}

export function getAllTags(posts: CollectionEntry<'blog'>[]) {
    const tags: string[] = [...new Set(posts.flatMap((post) => post.data.tags || []).filter(Boolean))];
    return tags
        .map((tag) => {
            return {
                name: tag,
                id: slugify(tag)
            };
        })
        .filter((obj, pos, arr) => {
            return arr.map((mapObj) => mapObj.id).indexOf(obj.id) === pos;
        });
}

export function getPostsByTag(posts: CollectionEntry<'blog'>[], tagId: string) {
    const filteredPosts: CollectionEntry<'blog'>[] = posts.filter((post) => (post.data.tags || []).map((tag) => slugify(tag)).includes(tagId));
    return filteredPosts;
}
