declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
			components: import('astro').MDXInstance<{}>['components'];
		}>;
	}
}

declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"editorials": {
"clean-label-myth.mdx": {
	id: "clean-label-myth.mdx";
  slug: "clean-label-myth";
  body: string;
  collection: "editorials";
  data: InferEntrySchema<"editorials">
} & { render(): Render[".mdx"] };
};
"news": {
"8 Foods You Eat Every Day That Could Contain Hidden Maida.mdx": {
	id: "8 Foods You Eat Every Day That Could Contain Hidden Maida.mdx";
  slug: "8-foods-you-eat-every-day-that-could-contain-hidden-maida";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
"This Common Vitamin May Shield Against Air Pollution’s Harmful Effects on Lungs, Research Finds.mdx": {
	id: "This Common Vitamin May Shield Against Air Pollution’s Harmful Effects on Lungs, Research Finds.mdx";
  slug: "this-common-vitamin-may-shield-against-air-pollutions-harmful-effects-on-lungs-research-finds";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
"avocado-sustainability.mdx": {
	id: "avocado-sustainability.mdx";
  slug: "avocado-sustainability";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
"fda-sodium-guidelines.mdx": {
	id: "fda-sodium-guidelines.mdx";
  slug: "fda-sodium-guidelines";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
"gut-microbiome-study.mdx": {
	id: "gut-microbiome-study.mdx";
  slug: "gut-microbiome-study";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
"sugar-tax-debate.mdx": {
	id: "sugar-tax-debate.mdx";
  slug: "sugar-tax-debate";
  body: string;
  collection: "news";
  data: InferEntrySchema<"news">
} & { render(): Render[".mdx"] };
};
"posts": {
"plant-based-proteins.mdx": {
	id: "plant-based-proteins.mdx";
  slug: "plant-based-proteins";
  body: string;
  collection: "posts";
  data: InferEntrySchema<"posts">
} & { render(): Render[".mdx"] };
"reading-food-labels.mdx": {
	id: "reading-food-labels.mdx";
  slug: "reading-food-labels";
  body: string;
  collection: "posts";
  data: InferEntrySchema<"posts">
} & { render(): Render[".mdx"] };
};
"research": {
"upf-cognitive-decline.mdx": {
	id: "upf-cognitive-decline.mdx";
  slug: "upf-cognitive-decline";
  body: string;
  collection: "research";
  data: InferEntrySchema<"research">
} & { render(): Render[".mdx"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = typeof import("../../src/content/config.js");
}
