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
	{@html "<polygon id=\"Check-__check\" points=\"9.74 20.79 4 10.31 5.84 9.3 10.63 18.04 18.15 3.24 20.02 4.19 11.6 20.76 9.74 20.79\"/>"}
</svg>
