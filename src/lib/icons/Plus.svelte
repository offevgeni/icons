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
	{@html "<polygon id=\"Plus-__plus\" points=\"22.13 10.95 13.05 10.95 13.05 1.87 10.95 1.87 10.95 10.95 1.87 10.95 1.87 13.05 10.95 13.05 10.95 22.13 13.05 22.13 13.05 13.05 22.13 13.05 22.13 10.95\"/>"}
</svg>
