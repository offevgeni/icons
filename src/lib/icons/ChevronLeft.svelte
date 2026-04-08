<script>
	export let size = 24;
	export let title = undefined;
</script>

<svg
	{...$$restProps}
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
>
	{#if title}<title>{title}</title>{/if}
	{@html "<path id=\"ChevronLeft-__arrow-left\" d=\"M16.25,1.93l1.71,1.22c-3.22,4.51-7.4,7.45-9.7,8.85,2.3,1.39,6.48,4.33,9.7,8.85l-1.71,1.22c-4.27-5.97-10.54-9.09-10.6-9.12v-1.89c.06-.03,6.33-3.15,10.6-9.12Z\"/>"}
</svg>
