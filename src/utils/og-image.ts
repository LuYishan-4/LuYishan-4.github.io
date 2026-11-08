import * as path from "node:path";
import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

// 社交平台分享缩图（og:image / twitter:image）
// 文章用封面图裁成 1200x630 的 JPG（各平台兼容性最好），其余页面用 public/og-default.jpg

export interface OgImage {
	url: string;
	width?: number;
	height?: number;
	alt?: string;
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export const DEFAULT_OG_IMAGE_PATH = "/og-default.jpg";

const localImages = import.meta.glob<ImageMetadata>(
	"../**/*.{png,jpg,jpeg,webp,avif}",
	{ import: "default" },
);

/**
 * 把文章 frontmatter 的 image 转成可分享的绝对网址
 * @param image - frontmatter 中的 image 字段（相对路径 / public 路径 / 远程 URL）
 * @param basePath - 文章所在目录（相对 src/，如 "content/posts"）
 * @param site - 站点根网址
 */
export async function getPostOgImage(
	image: string | undefined,
	basePath: string,
	site: URL,
	alt?: string,
): Promise<OgImage | undefined> {
	// 空值或随机图 API 没有固定图片，交给默认图
	if (!image || image === "api") return undefined;

	if (/^https?:\/\//.test(image)) return { url: image, alt };
	if (image.startsWith("/")) return { url: new URL(image, site).href, alt };

	const key = path
		.normalize(path.join("..", basePath, image))
		.replace(/\\/g, "/");
	const loader = localImages[key];
	if (!loader) return undefined;

	const src = await loader();
	// Astro 不会放大图片：原图不够大时按原图能裁出的最大 1.91:1 尺寸来
	const width = Math.min(
		OG_WIDTH,
		src.width,
		Math.floor((src.height * OG_WIDTH) / OG_HEIGHT),
	);
	const height = Math.round((width * OG_HEIGHT) / OG_WIDTH);
	const optimized = await getImage({
		src,
		width,
		height,
		fit: "cover",
		format: "jpg",
		quality: 82,
	});
	return {
		url: new URL(optimized.src, site).href,
		width,
		height,
		alt,
	};
}

export function getDefaultOgImage(site: URL, alt?: string): OgImage {
	return {
		url: new URL(DEFAULT_OG_IMAGE_PATH, site).href,
		width: OG_WIDTH,
		height: OG_HEIGHT,
		alt,
	};
}
