import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx/container-renderer';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
	);

	const renderers = await loadRenderers([getMDXRenderer()]);
	const container = await AstroContainer.create({ renderers });
	const siteUrl = (context.site ?? '').toString().replace(/\/$/, '');

	const items = await Promise.all(
		posts.map(async (post) => {
			const { Content } = await render(post);
			const rawContent = await container.renderToString(Content);

			// 将相对路径图片与链接转换为绝对路径，确保在 RSS 阅读器中正常加载
			const content = siteUrl
				? rawContent.replace(
						/(href|src)=["']\/([^"']*)["']/g,
						`$1="${siteUrl}/$2"`
					)
				: rawContent;

			return {
				...post.data,
				link: `/blog/${post.id}/`,
				content,
			};
		})
	);

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
		customData: `<language>zh-CN</language>`,
	});
}


